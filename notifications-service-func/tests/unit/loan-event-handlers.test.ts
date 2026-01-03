import { EventGridEvent, InvocationContext } from "@azure/functions";

jest.mock("../../src/infra/notificationRepoFactory", () => ({
  getNotificationRepo: jest.fn(),
}));

import { handleLoanStatusEvent } from "../../src/functions/handle-loan-status-event";
import { sendNotificationFromLoanEvent } from "../../src/functions/sendNotificationFromLoanEvent";
import { getNotificationRepo } from "../../src/infra/notificationRepoFactory";
import { signalROutput } from "../../src/functions/createNotificationHttp";
import { emailQueueOutput } from "../../src/queues/emailQueue";

const createContext = () => {
  const extraOutputs = new Map();
  const context = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    extraOutputs: {
      set: jest.fn((key, value) => extraOutputs.set(key, value)),
    },
  } as unknown as InvocationContext & { _extraOutputs: Map<unknown, unknown> };
  (context as any)._extraOutputs = extraOutputs;
  return context;
};

const createRepo = () => ({
  create: jest.fn(async (notification) => ({
    success: true,
    data: notification,
  })),
});

const baseEvent = (overrides: Partial<any> = {}): EventGridEvent => ({
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
    deviceName: "Surface Pro",
    userId: "auth0|user-1",
    from: "2025-01-01T00:00:00Z",
    till: "2025-01-03T00:00:00Z",
    previousStatus: "Created",
    newStatus: "Requested",
    statusChangedAt: "2025-01-01T00:00:00Z",
    waitlist: [],
    ...overrides,
  },
} as EventGridEvent);

describe("loan event handlers", () => {
  const originalSignalR = process.env.AZURE_SIGNALR_CONNECTION_STRING;

  afterEach(() => {
    process.env.AZURE_SIGNALR_CONNECTION_STRING = originalSignalR;
    jest.clearAllMocks();
  });

  it("uses deviceName and queues outputs for loan status events", async () => {
    process.env.AZURE_SIGNALR_CONNECTION_STRING = "Endpoint=signalr";
    const repo = createRepo();
    (getNotificationRepo as jest.Mock).mockReturnValue(repo);
    const context = createContext();

    await handleLoanStatusEvent(baseEvent(), context);

    expect(repo.create).toHaveBeenCalledTimes(1);
    const created = repo.create.mock.calls[0][0];
    expect(created.payload.deviceName).toBe("Surface Pro");
    expect(context.extraOutputs.set).toHaveBeenCalledWith(
      signalROutput,
      expect.any(Array)
    );
    expect(context.extraOutputs.set).toHaveBeenCalledWith(
      emailQueueOutput,
      expect.any(Array)
    );
  });

  it("fans out waitlist notifications and skips the loan owner", async () => {
    process.env.AZURE_SIGNALR_CONNECTION_STRING = "";
    const repo = createRepo();
    (getNotificationRepo as jest.Mock).mockReturnValue(repo);
    const context = createContext();

    await handleLoanStatusEvent(
      baseEvent({
        newStatus: "Returned",
        waitlist: ["auth0|user-1", "auth0|user-2", "auth0|user-2", " "],
      }),
      context
    );

    expect(repo.create).toHaveBeenCalledTimes(2);
    const waitlistNotification = repo.create.mock.calls[1][0];
    expect(waitlistNotification.userId).toBe("auth0|user-2");
    expect(waitlistNotification.payload.deviceName).toBe("Surface Pro");
  });

  it("creates a notification from loan events in the basic handler", async () => {
    const repo = createRepo();
    (getNotificationRepo as jest.Mock).mockReturnValue(repo);
    const context = createContext();

    await sendNotificationFromLoanEvent(baseEvent(), context);

    expect(repo.create).toHaveBeenCalledTimes(1);
    const created = repo.create.mock.calls[0][0];
    expect(created.payload.deviceName).toBe("Surface Pro");
  });

  it("skips when userId is missing in loan event", async () => {
    const repo = createRepo();
    (getNotificationRepo as jest.Mock).mockReturnValue(repo);
    const context = createContext();

    await sendNotificationFromLoanEvent(
      baseEvent({ userId: undefined }),
      context
    );

    expect(context.warn).toHaveBeenCalled();
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("logs when notification creation fails", async () => {
    const repo = createRepo();
    (getNotificationRepo as jest.Mock).mockReturnValue(repo);
    const context = createContext();

    await sendNotificationFromLoanEvent(
      baseEvent({ userId: "bad user" }),
      context
    );

    expect(context.error).toHaveBeenCalled();
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("logs when repository create fails and still handles waitlist", async () => {
    const repo = {
      create: jest
        .fn()
        .mockResolvedValueOnce({ success: false, error: new Error("fail") })
        .mockResolvedValueOnce({ success: true, data: { id: "N-2" } }),
    };
    (getNotificationRepo as jest.Mock).mockReturnValue(repo);
    const context = createContext();

    await sendNotificationFromLoanEvent(
      baseEvent({
        newStatus: "Returned",
        waitlist: ["auth0|user-2"],
      }),
      context
    );

    expect(context.error).toHaveBeenCalled();
    expect(repo.create).toHaveBeenCalledTimes(2);
  });
});
