import { HttpRequest, InvocationContext } from "@azure/functions";

const validateToken = jest.fn();
const isAdmin = jest.fn();

jest.mock("../../src/utils/auth", () => ({
  validateToken,
  isAdmin,
}));

jest.mock("../../src/infra/notificationRepoFactory", () => {
  const actual = jest.requireActual("../../src/infra/notificationRepoFactory");
  return {
    ...actual,
    getNotificationRepo: jest.fn(),
  };
});

jest.mock("../../src/auth0/userDirectory", () => ({
  getUserEmailById: jest.fn(),
}));

const {
  createNotificationHttp,
  signalROutput,
} = require("../../src/functions/createNotificationHttp");
const { getNotificationRepo } = require("../../src/infra/notificationRepoFactory");
const { emailQueueOutput } = require("../../src/queues/emailQueue");
const { getUserEmailById } = require("../../src/auth0/userDirectory");
const {
  MissingCosmosConfigurationError,
} = require("../../src/infra/notificationRepoFactory");

const createContext = () =>
  ({
    log: jest.fn(),
    error: jest.fn(),
    invocationId: "inv-1",
    extraOutputs: { set: jest.fn() },
  } as unknown as InvocationContext);

const createRequest = (
  body: string,
  overrides: Partial<{
    headers: Map<string, string>;
  }> = {}
) =>
  ({
    headers: new Map(),
    text: async () => body,
    ...overrides,
  } as unknown as HttpRequest);

describe("createNotificationHttp", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    validateToken.mockResolvedValue({
      isValid: true,
      userId: "auth0|user-admin",
      token: {
        sub: "auth0|user-admin",
        "https://thamco.com/roles": ["admin"],
      },
    });
    isAdmin.mockReturnValue(true);
  });

  afterEach(() => {
    delete process.env.AZURE_SIGNALR_CONNECTION_STRING;
  });

  it("returns 400 when body is missing", async () => {
    const response = await createNotificationHttp(
      createRequest(""),
      createContext()
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 on invalid JSON", async () => {
    const response = await createNotificationHttp(
      createRequest("{bad"),
      createContext()
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 when required fields are missing", async () => {
    const response = await createNotificationHttp(
      createRequest(JSON.stringify({ userId: "" })),
      createContext()
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 for waitlist without deviceName", async () => {
    const payload = { userId: "auth0|user-1", type: "Waitlist" };
    const response = await createNotificationHttp(
      createRequest(JSON.stringify(payload)),
      createContext()
    );
    expect(response.status).toBe(400);
  });

  it("creates a custom notification and queues email", async () => {
    getNotificationRepo.mockReturnValue({
      create: jest.fn().mockResolvedValue({
        success: true,
        data: {
          id: "N-1",
          userId: "auth0|user-1",
          type: "Custom",
          message: "Hello",
          payload: { message: "Hello" },
          createdAt: new Date().toISOString(),
        },
      }),
    });
    const payload = {
      userId: "auth0|user-1",
      type: "Custom",
      content: "Hello",
      userEmail: "user@example.com",
    };
    const context = createContext();
    const response = await createNotificationHttp(
      createRequest(JSON.stringify(payload)),
      context
    );
    expect(response.status).toBe(201);
    expect(context.extraOutputs.set).toHaveBeenCalled();
  });

  it("creates a reservation notification and emits SignalR + email outputs", async () => {
    process.env.AZURE_SIGNALR_CONNECTION_STRING = "Endpoint=signalr";
    getUserEmailById.mockResolvedValue("resolved@example.com");
    getNotificationRepo.mockReturnValue({
      create: jest.fn().mockResolvedValue({
        success: true,
        data: {
          id: "N-2",
          userId: "auth0|user-2",
          type: "Reservation",
          message: "Reservation created",
          payload: {
            deviceName: "Surface",
            from: "2026-01-01T09:00:00Z",
            till: "2026-01-03T17:00:00Z",
          },
          createdAt: new Date().toISOString(),
        },
      }),
    });
    const payload = {
      userId: "auth0|user-2",
      type: "Reservation",
      deviceName: "Surface",
      collectionDate: "2026-01-01T09:00:00Z",
      returnDate: "2026-01-03T17:00:00Z",
    };
    const context = createContext();
    const response = await createNotificationHttp(
      createRequest(JSON.stringify(payload)),
      context
    );

    expect(response.status).toBe(201);
    expect(context.extraOutputs.set).toHaveBeenCalledWith(
      signalROutput,
      expect.any(Array)
    );
    expect(context.extraOutputs.set).toHaveBeenCalledWith(
      emailQueueOutput,
      expect.any(Array)
    );
  });

  it("returns 400 for invalid notification type", async () => {
    const payload = { userId: "auth0|user-1", type: "Unknown" };
    const response = await createNotificationHttp(
      createRequest(JSON.stringify(payload)),
      createContext()
    );
    expect(response.status).toBe(400);
    const body = JSON.parse(response.body as string);
    expect(body.error.code).toBe("INVALID_TYPE");
  });

  it("returns 400 when domain validation fails", async () => {
    const payload = {
      userId: "bad user",
      type: "Reservation",
      deviceName: "Surface",
      collectionDate: "2026-01-01T09:00:00Z",
      returnDate: "2026-01-03T17:00:00Z",
    };
    const response = await createNotificationHttp(
      createRequest(JSON.stringify(payload)),
      createContext()
    );
    expect(response.status).toBe(400);
    const body = JSON.parse(response.body as string);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 409 when notification already exists", async () => {
    getNotificationRepo.mockReturnValue({
      create: jest.fn().mockResolvedValue({
        success: false,
        error: { code: "ALREADY_EXISTS", message: "exists" },
      }),
    });
    const payload = {
      userId: "auth0|user-1",
      type: "Custom",
      content: "Hello",
    };
    const response = await createNotificationHttp(
      createRequest(JSON.stringify(payload)),
      createContext()
    );
    expect(response.status).toBe(409);
  });

  it("returns 500 when Cosmos config is missing", async () => {
    getNotificationRepo.mockImplementation(() => {
      throw new MissingCosmosConfigurationError([
        "COSMOS_ENDPOINT",
        "COSMOS_DATABASE",
      ]);
    });
    const payload = {
      userId: "auth0|user-1",
      type: "Custom",
      content: "Hello",
    };
    const response = await createNotificationHttp(
      createRequest(JSON.stringify(payload)),
      createContext()
    );
    expect(response.status).toBe(500);
  });
});
