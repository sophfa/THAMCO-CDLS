import { InvocationContext } from "@azure/functions";

jest.mock("../../src/auth0/userDirectory", () => ({
  getUserEmailById: jest.fn(),
}));

jest.mock("../../src/infra/notificationRepoFactory", () => ({
  getNotificationRepo: jest.fn(),
}));

jest.mock("../../src/functions/createNotificationHttp", () => ({
  sendEmailNotification: jest.fn(),
}));

const { processNotificationEmailQueue } = require(
  "../../src/functions/processNotificationEmailQueue"
);
const { getUserEmailById } = require("../../src/auth0/userDirectory");
const { getNotificationRepo } = require("../../src/infra/notificationRepoFactory");
const { sendEmailNotification } = require("../../src/functions/createNotificationHttp");

const createContext = () =>
  ({
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as InvocationContext);

describe("processNotificationEmailQueue", () => {
  const env = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...env };
  });

  it("skips when message is missing fields", async () => {
    const context = createContext();
    await processNotificationEmailQueue({}, context);
    expect(context.warn).toHaveBeenCalled();
  });

  it("skips when email configuration is missing", async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.FROM_EMAIL;
    const context = createContext();
    await processNotificationEmailQueue(
      { notificationId: "N-1", userId: "user-1" },
      context
    );
    expect(context.log).toHaveBeenCalled();
  });

  it("logs when notification is not found", async () => {
    process.env.RESEND_API_KEY = "key";
    process.env.FROM_EMAIL = "from@example.com";
    getNotificationRepo.mockReturnValue({
      get: jest.fn().mockResolvedValue({
        success: false,
        error: { message: "missing" },
      }),
    });
    const context = createContext();
    await processNotificationEmailQueue(
      { notificationId: "N-1", userId: "user-1" },
      context
    );
    expect(context.warn).toHaveBeenCalled();
  });

  it("sends email when resolved", async () => {
    process.env.RESEND_API_KEY = "key";
    process.env.FROM_EMAIL = "from@example.com";
    getNotificationRepo.mockReturnValue({
      get: jest.fn().mockResolvedValue({
        success: true,
        data: { id: "N-1", type: "Custom", message: "Hi", payload: { message: "Hi" } },
      }),
    });
    getUserEmailById.mockResolvedValue("user@example.com");
    sendEmailNotification.mockResolvedValue(true);

    const context = createContext();
    await processNotificationEmailQueue(
      { notificationId: "N-1", userId: "user-1" },
      context
    );

    expect(sendEmailNotification).toHaveBeenCalled();
  });
});
