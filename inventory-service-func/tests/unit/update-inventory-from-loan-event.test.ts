import { EventGridEvent, InvocationContext } from "@azure/functions";

jest.mock("../../src/infra/inventory-repo-factory", () => ({
  getInventoryRepo: jest.fn(),
}));

const { updateInventoryFromLoanEvent } = require("../../src/functions/updateInventoryFromLoanEvent");
const { getInventoryRepo } = require("../../src/infra/inventory-repo-factory");

const createContext = () =>
  ({
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as InvocationContext);

const baseEvent = (overrides: Partial<any> = {}): EventGridEvent =>
  ({
    id: "evt-1",
    topic: "/loans",
    subject: "/loans/loan-1",
    eventType: "LoanStatusChanged",
    dataVersion: "1.0",
    metadataVersion: "1",
    eventTime: "2025-01-01T00:00:00Z",
    data: {
      loanId: "loan-1",
      deviceId: "PROD-001",
      userId: "auth0|user-1",
      newStatus: "Returned",
      ...overrides,
    },
  } as EventGridEvent);

describe("updateInventoryFromLoanEvent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("skips when deviceId is missing", async () => {
    const repo = { setStock: jest.fn() };
    getInventoryRepo.mockReturnValue(repo);
    const context = createContext();

    await updateInventoryFromLoanEvent(
      baseEvent({ deviceId: undefined }),
      context
    );

    expect(repo.setStock).not.toHaveBeenCalled();
  });

  it("updates stock as available for Returned status", async () => {
    const repo = {
      setStock: jest.fn().mockResolvedValue({
        success: true,
        data: { stock: 1 },
      }),
    };
    getInventoryRepo.mockReturnValue(repo);
    const context = createContext();

    await updateInventoryFromLoanEvent(baseEvent(), context);

    expect(repo.setStock).toHaveBeenCalledWith("PROD-001", true);
  });

  it("updates stock as unavailable for Approved status", async () => {
    const repo = {
      setStock: jest.fn().mockResolvedValue({
        success: true,
        data: { stock: 0 },
      }),
    };
    getInventoryRepo.mockReturnValue(repo);
    const context = createContext();

    await updateInventoryFromLoanEvent(
      baseEvent({ newStatus: "Approved" }),
      context
    );

    expect(repo.setStock).toHaveBeenCalledWith("PROD-001", false);
  });

  it("logs when repository returns error", async () => {
    const repo = {
      setStock: jest.fn().mockResolvedValue({
        success: false,
        error: { code: "PERSISTENCE_ERROR", message: "down" },
      }),
    };
    getInventoryRepo.mockReturnValue(repo);
    const context = createContext();

    await updateInventoryFromLoanEvent(baseEvent(), context);

    expect(context.error).toHaveBeenCalled();
  });
});
