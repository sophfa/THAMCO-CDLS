import { HttpRequest, InvocationContext } from "@azure/functions";

jest.mock("../../src/utils/auth", () => ({
  validateToken: jest.fn(),
  isAdminOrOwner: jest.fn(),
}));

const query = jest.fn();
const upsert = jest.fn();
const container = {
  items: {
    query,
    upsert,
  },
};

jest.mock("../../src/config/cosmosClient", () => ({
  cosmosClient: {
    database: jest.fn(() => ({
      container: jest.fn(() => container),
    })),
  },
}));

const { markNotificationReadHttp } = require("../../src/functions/markNotificationReadHttp");
const { validateToken, isAdminOrOwner } = require("../../src/utils/auth");

const createContext = () =>
  ({
    log: jest.fn(),
  } as unknown as InvocationContext);

const createRequest = (
  overrides: Partial<{
    method: string;
    params: Record<string, string>;
    headers: Map<string, string>;
    json: () => Promise<unknown>;
  }> = {}
) =>
  ({
    method: "PATCH",
    params: { id: "N-1" },
    headers: new Map(),
    json: async () => ({ read: true }),
    ...overrides,
  } as unknown as HttpRequest);

describe("markNotificationReadHttp", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when unauthorized", async () => {
    validateToken.mockResolvedValue({ isValid: false });
    const response = await markNotificationReadHttp(
      createRequest(),
      createContext()
    );
    expect(response.status).toBe(401);
  });

  it("returns 400 when id is missing", async () => {
    validateToken.mockResolvedValue({ isValid: true, userId: "user-1" });
    const response = await markNotificationReadHttp(
      createRequest({ params: {} }),
      createContext()
    );
    expect(response.status).toBe(400);
  });

  it("returns 404 when notification is not found", async () => {
    validateToken.mockResolvedValue({ isValid: true, userId: "user-1" });
    query.mockReturnValue({
      fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
    });
    const response = await markNotificationReadHttp(
      createRequest(),
      createContext()
    );
    expect(response.status).toBe(404);
  });

  it("returns 403 when user is not owner", async () => {
    validateToken.mockResolvedValue({ isValid: true, userId: "user-1" });
    isAdminOrOwner.mockReturnValue(false);
    query.mockReturnValue({
      fetchAll: jest.fn().mockResolvedValue({ resources: [{ id: "N-1", userId: "user-2" }] }),
    });
    const response = await markNotificationReadHttp(
      createRequest(),
      createContext()
    );
    expect(response.status).toBe(403);
  });

  it("updates read status when authorized", async () => {
    validateToken.mockResolvedValue({ isValid: true, userId: "user-1" });
    isAdminOrOwner.mockReturnValue(true);
    query.mockReturnValue({
      fetchAll: jest.fn().mockResolvedValue({ resources: [{ id: "N-1", userId: "user-1" }] }),
    });
    upsert.mockResolvedValue({ resource: { id: "N-1", read: true } });
    const response = await markNotificationReadHttp(
      createRequest(),
      createContext()
    );
    expect(response.status).toBe(200);
  });
});
