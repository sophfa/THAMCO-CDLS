import { InvocationContext } from "@azure/functions";
import { Notification } from "../../src/domain/notification";

const baseLog = { correlationId: "corr-1", service: "notifications-service-func" };

const createContext = () => ({
  log: jest.fn(),
} as unknown as InvocationContext);

const buildNotification = (
  overrides: Partial<Notification> & { type: Notification["type"] }
): Notification => ({
  id: "N-1",
  userId: "auth0|user-1",
  message: "Update",
  payload: { message: "Update" },
  createdAt: new Date("2026-01-01T00:00:00Z").toISOString(),
  ...overrides,
});

describe("sendEmailNotification", () => {
  const env = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...env };
  });

  afterEach(() => {
    process.env = { ...env };
  });

  it("returns false when RESEND_API_KEY is missing", async () => {
    delete process.env.RESEND_API_KEY;

    const { sendEmailNotification } = require(
      "../../src/functions/createNotificationHttp"
    );

    const result = await sendEmailNotification(
      buildNotification({
        type: "Custom",
        payload: { message: "Hello" },
      }),
      "user@example.com",
      createContext(),
      baseLog
    );

    expect(result).toBe(false);
  });

  it("sends emails for multiple notification types", async () => {
    process.env.RESEND_API_KEY = "key";
    process.env.FROM_EMAIL = "from@example.com";

    const send = jest.fn().mockResolvedValue({ data: { id: "email-1" } });
    jest.doMock("resend", () => ({
      Resend: jest.fn(() => ({ emails: { send } })),
    }));

    const { sendEmailNotification } = require(
      "../../src/functions/createNotificationHttp"
    );

    const context = createContext();

    const notifications: Notification[] = [
      buildNotification({
        type: "Reservation",
        message: "Reservation created",
        payload: {
          deviceName: "Surface",
          from: "2026-01-01T09:00:00Z",
          till: "2026-01-03T17:00:00Z",
        },
      }),
      buildNotification({
        type: "Rejected",
        message: "Rejected",
        payload: {
          deviceName: "Surface",
          from: "2026-01-01T09:00:00Z",
          till: "2026-01-03T17:00:00Z",
          reason: "No stock",
        },
      }),
      buildNotification({
        type: "Returned",
        message: "Returned",
        payload: {
          deviceName: "Surface",
          from: "2026-01-01T09:00:00Z",
          till: "2026-01-03T17:00:00Z",
          returnedAt: "2026-01-03T12:00:00Z",
        },
      }),
      buildNotification({
        type: "Waitlist",
        message: "Device available now",
        payload: {
          deviceName: "Surface",
          requestedFrom: "2026-01-01T09:00:00Z",
          requestedTill: "2026-01-03T17:00:00Z",
          position: 1,
        },
      }),
    ];

    for (const notification of notifications) {
      const result = await sendEmailNotification(
        notification,
        "user@example.com",
        context,
        baseLog
      );
      expect(result).toBe(true);
    }

    expect(send).toHaveBeenCalledTimes(notifications.length);
  });

  it("returns false when resend reports an error", async () => {
    process.env.RESEND_API_KEY = "key";
    process.env.FROM_EMAIL = "from@example.com";

    const send = jest.fn().mockResolvedValue({ error: { message: "boom" } });
    jest.doMock("resend", () => ({
      Resend: jest.fn(() => ({ emails: { send } })),
    }));

    const { sendEmailNotification } = require(
      "../../src/functions/createNotificationHttp"
    );

    const result = await sendEmailNotification(
      buildNotification({
        type: "Custom",
        payload: { message: "Hello" },
      }),
      "user@example.com",
      createContext(),
      baseLog
    );

    expect(result).toBe(false);
  });
});
