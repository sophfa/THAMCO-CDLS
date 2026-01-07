import { HttpRequest, InvocationContext } from "@azure/functions";

const validateToken = jest.fn();
const isAdmin = jest.fn();

jest.mock("../../src/utils/auth", () => ({
  validateToken,
  isAdmin,
}));

jest.mock("../../src/infra/notificationRepoFactory", () => ({
  getNotificationRepo: jest.fn(),
  MissingCosmosConfigurationError: class MissingCosmosConfigurationError extends Error {
    constructor(public readonly missingSettings: string[]) {
      super("missing");
    }
  },
}));

const { listNotificationsHttp } = require("../../src/functions/list-notification-http");
const { getNotificationRepo, MissingCosmosConfigurationError } = require(
  "../../src/infra/notificationRepoFactory"
);

const createContext = () =>
  ({
    log: jest.fn(),
  } as unknown as InvocationContext);

const createRequest = () =>
  ({
    headers: new Map(),
  } as unknown as HttpRequest);

describe("listNotificationsHttp", () => {
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

  it("returns 200 with notifications", async () => {
    getNotificationRepo.mockReturnValue({
      list: jest.fn().mockResolvedValue({
        success: true,
        data: [{ id: "N-1" }],
      }),
    });
    const response = await listNotificationsHttp(
      createRequest(),
      createContext()
    );
    expect(response.status).toBe(200);
  });

  it("returns 500 on configuration error", async () => {
    getNotificationRepo.mockImplementation(() => {
      throw new MissingCosmosConfigurationError(["COSMOS_ENDPOINT"]);
    });
    const response = await listNotificationsHttp(
      createRequest(),
      createContext()
    );
    expect(response.status).toBe(500);
  });
});
