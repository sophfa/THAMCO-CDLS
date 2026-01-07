import { HttpRequest, InvocationContext } from "@azure/functions";

const validateToken = jest.fn();
const isAdminOrOwner = jest.fn();

jest.mock("../../src/utils/auth", () => ({
  validateToken,
  isAdminOrOwner,
}));

jest.mock("../../src/infra/notificationRepoFactory", () => ({
  getNotificationRepo: jest.fn(),
  MissingCosmosConfigurationError: class MissingCosmosConfigurationError extends Error {
    constructor(public readonly missingSettings: string[]) {
      super("missing");
    }
  },
}));

const { getNotificationByIdHttp } = require("../../src/functions/get-notification-http");
const { getNotificationRepo, MissingCosmosConfigurationError } = require(
  "../../src/infra/notificationRepoFactory"
);

const createContext = () =>
  ({
    log: jest.fn(),
  } as unknown as InvocationContext);

const createRequest = (
  overrides: Partial<{
    params: Record<string, string>;
    headers: Map<string, string>;
  }> = {}
) =>
  ({
    params: { id: "N-1" },
    headers: new Map(),
    ...overrides,
  } as unknown as HttpRequest);

describe("getNotificationByIdHttp", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    validateToken.mockResolvedValue({
      isValid: true,
      userId: "auth0|user-1",
      token: { sub: "auth0|user-1" },
    });
    isAdminOrOwner.mockReturnValue(true);
  });

  it("returns 400 when id is missing", async () => {
    const response = await getNotificationByIdHttp(
      createRequest({ params: { id: "" } }),
      createContext()
    );
    expect(response.status).toBe(400);
  });

  it("returns 200 when notification exists", async () => {
    getNotificationRepo.mockReturnValue({
      get: jest.fn().mockResolvedValue({
        success: true,
        data: { id: "N-1" },
      }),
    });
    const response = await getNotificationByIdHttp(
      createRequest(),
      createContext()
    );
    expect(response.status).toBe(200);
  });

  it("returns 404 when notification is missing", async () => {
    getNotificationRepo.mockReturnValue({
      get: jest.fn().mockResolvedValue({
        success: false,
        error: { code: "NOT_FOUND", message: "missing" },
      }),
    });
    const response = await getNotificationByIdHttp(
      createRequest(),
      createContext()
    );
    expect(response.status).toBe(404);
  });

  it("returns 500 on configuration error", async () => {
    getNotificationRepo.mockImplementation(() => {
      throw new MissingCosmosConfigurationError(["COSMOS_ENDPOINT"]);
    });
    const response = await getNotificationByIdHttp(
      createRequest(),
      createContext()
    );
    expect(response.status).toBe(500);
  });
});
