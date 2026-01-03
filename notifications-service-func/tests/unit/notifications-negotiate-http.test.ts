import { HttpRequest, InvocationContext } from "@azure/functions";

jest.mock("../../src/utils/auth", () => ({
  validateToken: jest.fn(),
}));

const { notificationsNegotiateHttp } = require("../../src/functions/notificationsNegotiateHttp");
const { validateToken } = require("../../src/utils/auth");

const createContext = () =>
  ({
    extraInputs: {
      get: jest.fn(() => ({ url: "signalr" })),
    },
  } as unknown as InvocationContext);

const createRequest = (
  overrides: Partial<{
    headers: Map<string, string>;
  }> = {}
) =>
  ({
    headers: new Map(),
    ...overrides,
  } as unknown as HttpRequest);

describe("notificationsNegotiateHttp", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when unauthorized", async () => {
    validateToken.mockResolvedValue({ isValid: false });
    const response = await notificationsNegotiateHttp(
      createRequest(),
      createContext()
    );
    expect(response.status).toBe(401);
  });

  it("returns 403 on user mismatch", async () => {
    validateToken.mockResolvedValue({ isValid: true, userId: "user-1" });
    const response = await notificationsNegotiateHttp(
      createRequest({ headers: new Map([["x-user-id", "user-2"]]) }),
      createContext()
    );
    expect(response.status).toBe(403);
  });

  it("returns connection info on success", async () => {
    validateToken.mockResolvedValue({ isValid: true, userId: "user-1" });
    const context = createContext();
    const response = await notificationsNegotiateHttp(
      createRequest({ headers: new Map([["x-user-id", "user-1"]]) }),
      context
    );
    expect(response.status).toBe(200);
  });
});
