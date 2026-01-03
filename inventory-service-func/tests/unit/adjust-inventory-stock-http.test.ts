import { HttpRequest, InvocationContext } from "@azure/functions";

const authState: { validateToken?: jest.Mock; isAdmin?: jest.Mock } = {};

jest.mock("../../src/utils/auth", () => {
  const validateToken = jest.fn();
  const isAdmin = jest.fn();
  authState.validateToken = validateToken;
  authState.isAdmin = isAdmin;
  return { validateToken, isAdmin };
});

const cosmosState: {
  item?: jest.Mock;
  read?: jest.Mock;
  replace?: jest.Mock;
  container?: { item: jest.Mock };
} = {};

jest.mock("../../src/config/cosmosClient", () => {
  const read = jest.fn();
  const replace = jest.fn();
  const item = jest.fn(() => ({ read, replace }));
  const container = { item };
  const database = jest.fn(() => ({ container: jest.fn(() => container) }));
  const getCosmosClient = jest.fn(() => ({ database }));

  cosmosState.read = read;
  cosmosState.replace = replace;
  cosmosState.item = item;
  cosmosState.container = container;

  return { getCosmosClient };
});

import { adjustInventoryStockHttp } from "../../src/functions/adjust-inventory-stock-http";

const getAuthMocks = () => authState as Required<typeof authState>;
const getCosmosMocks = () => cosmosState as Required<typeof cosmosState>;

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
    method: "POST",
    params: { id: "PROD-001" },
    headers: new Map(),
    json: async () => ({ delta: 1 }),
    ...overrides,
  } as unknown as HttpRequest);

describe("adjustInventoryStockHttp", () => {
  beforeEach(() => {
    process.env.COSMOS_DATABASE = "test-db";
    process.env.COSMOS_CONTAINER = "inventory";
    jest.clearAllMocks();
  });

  it("returns 401 when authentication fails", async () => {
    getAuthMocks().validateToken.mockResolvedValue({ isValid: false });

    const response = await adjustInventoryStockHttp(
      createRequest(),
      createContext()
    );

    expect(response.status).toBe(401);
  });

  it("returns 403 when caller is not admin", async () => {
    getAuthMocks().validateToken.mockResolvedValue({
      isValid: true,
      token: { roles: ["User"] },
    });
    getAuthMocks().isAdmin.mockReturnValue(false);

    const response = await adjustInventoryStockHttp(
      createRequest(),
      createContext()
    );

    expect(response.status).toBe(403);
  });

  it("returns 400 when delta is missing", async () => {
    getAuthMocks().validateToken.mockResolvedValue({
      isValid: true,
      token: { roles: ["Admin"] },
    });
    getAuthMocks().isAdmin.mockReturnValue(true);

    const response = await adjustInventoryStockHttp(
      createRequest({ json: async () => ({}) }),
      createContext()
    );

    expect(response.status).toBe(400);
  });

  it("adjusts stock when admin provides valid delta", async () => {
    getAuthMocks().validateToken.mockResolvedValue({
      isValid: true,
      token: { roles: ["Admin"] },
    });
    getAuthMocks().isAdmin.mockReturnValue(true);
    getCosmosMocks().read.mockResolvedValue({
      resource: { id: "PROD-001", stock: 2 },
    });
    getCosmosMocks().replace.mockResolvedValue({
      resource: { id: "PROD-001", stock: 3 },
    });

    const response = await adjustInventoryStockHttp(
      createRequest({ json: async () => ({ delta: 1 }) }),
      createContext()
    );

    expect(response.status).toBe(200);
    expect(getCosmosMocks().replace).toHaveBeenCalled();
  });
});
