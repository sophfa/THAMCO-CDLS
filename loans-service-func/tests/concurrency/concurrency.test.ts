// Concurrency and Idempotency Tests
// Tests that the system handles concurrent operations correctly

import { Loan } from "../../src/domain/loan";
import { InMemoryLoanRepo } from "../fakes/InMemoryLoanRepo";

describe("Concurrency and Idempotency Tests", () => {
  let repo: InMemoryLoanRepo;

  beforeEach(() => {
    repo = new InMemoryLoanRepo();
  });

  afterEach(() => {
    repo.clear();
  });

  describe("Idempotency - Duplicate Prevention", () => {
    it("should prevent duplicate waitlist entries (idempotent)", async () => {
      // Simulate adding user to waitlist multiple times
      const waitlistEntry1 = {
        id: "WAITLIST-1",
        deviceId: "DEVICE-123",
        userId: "auth0|user1",
        loanId: "LOAN-001",
        position: 1,
        createdAt: new Date(),
      };

      const waitlistEntry2 = {
        id: "WAITLIST-1", // idempotent
        deviceId: "DEVICE-123",
        userId: "auth0|user1",
        loanId: "LOAN-001",
        position: 1,
        createdAt: new Date(),
      };

      // user clicks "Join Waitlist" twice
      const loan1 = await repo.create(waitlistEntry1 as any);
      const loan2 = await repo.create(waitlistEntry2 as any);

      // second request should fail (already exists)
      expect(loan1.success).toBe(true);
      expect(loan2.success).toBe(false);
      if (loan2.success === false) {
        expect(loan2.error.code).toBe("ALREADY_EXISTS");
      } else {
        throw new Error("Expected duplicate waitlist to fail");
      }
      expect(repo.count()).toBe(1); // Only one entry
    });

    it("should handle repeated loan creation requests idempotently", async () => {
      const loan: Loan = {
        id: "LOAN-IDEM",
        deviceId: "DEVICE-123",
        userId: "auth0|user1",
        createdAt: new Date(),
        from: new Date(),
        till: new Date(),
        status: "Requested",
      };

      // user clicks submit button multiple times
      const results = await Promise.all([
        repo.create(loan),
        repo.create(loan),
        repo.create(loan),
      ]);

      // only first succeeds, others fail with ALREADY_EXISTS
      const successful = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);

      expect(successful).toHaveLength(1);
      expect(failed).toHaveLength(2);
      expect(repo.count()).toBe(1);
    });
  });

  describe("Concurrency - Race Conditions", () => {
    it("should handle concurrent loan creations for same device safely", async () => {
      repo.simulateDelay = 50;

      const createLoan = (id: string) =>
        repo.create({
          id,
          deviceId: "DEVICE-POPULAR",
          userId: `auth0|user${id}`,
          createdAt: new Date(),
          from: new Date(),
          till: new Date(),
          status: "Requested",
        });

      // simulate 5 users requesting same device simultaneously
      const results = await Promise.all([
        createLoan("1"),
        createLoan("2"),
        createLoan("3"),
        createLoan("4"),
        createLoan("5"),
      ]);

      // all should succeed (different users, different IDs)
      const successful = results.filter((r) => r.success);
      expect(successful).toHaveLength(5);
      expect(repo.count()).toBe(5);
    });

    it("should handle concurrent updates to same loan status", async () => {
      const loan: Loan = {
        id: "LOAN-CONCURRENT",
        deviceId: "DEVICE-123",
        userId: "auth0|user1",
        createdAt: new Date(),
        from: new Date(),
        till: new Date(),
        status: "Requested",
      };

      await repo.create(loan);
      repo.simulateDelay = 30;

      // simulate concurrent status updates (e.g., admin approves, user cancels)
      const updateToApproved = repo.update({ ...loan, status: "Approved" });
      const updateToCancelled = repo.update({ ...loan, status: "Cancelled" });

      const results = await Promise.all([updateToApproved, updateToCancelled]);

      // both updates succeed (last write wins)
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);

      const finalLoan = await repo.get("LOAN-CONCURRENT");
      expect(finalLoan.success).toBe(true);
      if (finalLoan.success) {
        expect(["Approved", "Cancelled"]).toContain(finalLoan.data.status);
      }
    });
  });
});
