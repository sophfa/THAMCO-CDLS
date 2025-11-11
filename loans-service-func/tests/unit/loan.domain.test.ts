// Unit Tests for Loan Domain Logic
// Tests core business logic without external dependencies

import { Loan } from "../../src/domain/loan";
import { InMemoryLoanRepo } from "../fakes/InMemoryLoanRepo";

describe("Loan Domain - Unit Tests", () => {
  let repo: InMemoryLoanRepo;

  beforeEach(() => {
    repo = new InMemoryLoanRepo();
  });

  afterEach(() => {
    repo.clear();
  });

  describe("Loan Creation", () => {
    it("should create a valid loan with all required fields", async () => {
      // Arrange
      const loan: Loan = {
        id: "LOAN-001",
        deviceId: "DEVICE-123",
        userId: "auth0|user1",
        createdAt: new Date("2025-01-01"),
        from: new Date("2025-01-05"),
        till: new Date("2025-01-12"),
        status: "Requested",
      };

      // Act
      const result = await repo.create(loan);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe("LOAN-001");
        expect(result.data.deviceId).toBe("DEVICE-123");
        expect(result.data.userId).toBe("auth0|user1");
        expect(result.data.status).toBe("Requested");
      }
    });

    it("should reject loan creation without deviceId", async () => {
      // Arrange
      const invalidLoan: Loan = {
        id: "LOAN-002",
        deviceId: "",
        userId: "auth0|user1",
        createdAt: new Date(),
        from: new Date(),
        till: new Date(),
        status: "Requested",
      };

      // Act
      const result = await repo.create(invalidLoan);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
        expect(result.error.field).toBe("deviceId");
      }
    });

    it("should reject loan creation without userId", async () => {
      // Arrange
      const invalidLoan: Loan = {
        id: "LOAN-003",
        deviceId: "DEVICE-123",
        userId: "",
        createdAt: new Date(),
        from: new Date(),
        till: new Date(),
        status: "Requested",
      };

      // Act
      const result = await repo.create(invalidLoan);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
        expect(result.error.field).toBe("userId");
      }
    });

    it("should reject duplicate loan IDs", async () => {
      // Arrange
      const loan1: Loan = {
        id: "LOAN-DUP",
        deviceId: "DEVICE-123",
        userId: "auth0|user1",
        createdAt: new Date(),
        from: new Date(),
        till: new Date(),
        status: "Requested",
      };

      const loan2: Loan = { ...loan1 };

      // Act
      await repo.create(loan1);
      const result = await repo.create(loan2);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("ALREADY_EXISTS");
      }
    });
  });

  describe("Loan Retrieval", () => {
    it("should retrieve an existing loan by ID", async () => {
      // Arrange
      const loan: Loan = {
        id: "LOAN-FIND",
        deviceId: "DEVICE-123",
        userId: "auth0|user1",
        createdAt: new Date(),
        from: new Date(),
        till: new Date(),
        status: "Approved",
      };
      await repo.create(loan);

      // Act
      const result = await repo.get("LOAN-FIND");

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe("LOAN-FIND");
        expect(result.data.status).toBe("Approved");
      }
    });

    it("should return NOT_FOUND for non-existent loan", async () => {
      // Act
      const result = await repo.get("NONEXISTENT");

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("NOT_FOUND");
      }
    });
  });

  describe("Loan Listing", () => {
    it("should list all loans", async () => {
      // Arrange
      const loans: Loan[] = [
        {
          id: "LOAN-1",
          deviceId: "DEVICE-1",
          userId: "auth0|user1",
          createdAt: new Date(),
          from: new Date(),
          till: new Date(),
          status: "Requested",
        },
        {
          id: "LOAN-2",
          deviceId: "DEVICE-2",
          userId: "auth0|user2",
          createdAt: new Date(),
          from: new Date(),
          till: new Date(),
          status: "Approved",
        },
      ];

      for (const loan of loans) {
        await repo.create(loan);
      }

      // Act
      const result = await repo.list();

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data.map((l) => l.id)).toContain("LOAN-1");
        expect(result.data.map((l) => l.id)).toContain("LOAN-2");
      }
    });

    it("should return empty array when no loans exist", async () => {
      // Act
      const result = await repo.list();

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
      }
    });
  });

  describe("Loan Status Transitions", () => {
    it("should allow status transition from Requested to Approved", async () => {
      // Arrange
      const loan: Loan = {
        id: "LOAN-STATUS",
        deviceId: "DEVICE-123",
        userId: "auth0|user1",
        createdAt: new Date(),
        from: new Date(),
        till: new Date(),
        status: "Requested",
      };
      await repo.create(loan);

      // Act
      const updatedLoan: Loan = { ...loan, status: "Approved" };
      const result = await repo.update(updatedLoan);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("Approved");
      }
    });

    it("should allow status transition from Approved to Collected", async () => {
      // Arrange
      const loan: Loan = {
        id: "LOAN-COLLECT",
        deviceId: "DEVICE-123",
        userId: "auth0|user1",
        createdAt: new Date(),
        from: new Date(),
        till: new Date(),
        status: "Approved",
      };
      await repo.create(loan);

      // Act
      const updatedLoan: Loan = { ...loan, status: "Collected" };
      const result = await repo.update(updatedLoan);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("Collected");
      }
    });

    it("should allow status transition from Collected to Returned", async () => {
      // Arrange
      const loan: Loan = {
        id: "LOAN-RETURN",
        deviceId: "DEVICE-123",
        userId: "auth0|user1",
        createdAt: new Date(),
        from: new Date(),
        till: new Date(),
        status: "Collected",
      };
      await repo.create(loan);

      // Act
      const updatedLoan: Loan = { ...loan, status: "Returned" };
      const result = await repo.update(updatedLoan);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("Returned");
      }
    });
  });
});
