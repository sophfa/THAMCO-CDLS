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

const loadHandler = () =>
  require("../../src/functions/adjust-inventory-stock-http")
    .adjustInventoryStockHttp;

describe("adjustInventoryStockHttp extra branches", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.COSMOS_DATABASE = "test-db";
    process.env.COSMOS_CONTAINER = "inventory";
  });

  it("returns 204 for OPTIONS", async () => {
    const adjustInventoryStockHttp = loadHandler();
    const response = await adjustInventoryStockHttp(
      createRequest({ method: "OPTIONS" }),
      createContext()
    );

    expect(response.status).toBe(204);
  });

  it("returns 400 when inventoryId is missing", async () => {
    const adjustInventoryStockHttp = loadHandler();
    getAuthMocks().validateToken.mockResolvedValue({
      isValid: true,
      token: { roles: ["Admin"] },
    });
    getAuthMocks().isAdmin.mockReturnValue(true);

    const response = await adjustInventoryStockHttp(
      createRequest({ params: { id: "" } }),
      createContext()
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 on invalid JSON", async () => {
    const adjustInventoryStockHttp = loadHandler();
    getAuthMocks().validateToken.mockResolvedValue({
      isValid: true,
      token: { roles: ["Admin"] },
    });
    getAuthMocks().isAdmin.mockReturnValue(true);

    const response = await adjustInventoryStockHttp(
      createRequest({
        json: async () => {
          throw new Error("bad json");
        },
      }),
      createContext()
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 when delta is not an integer", async () => {
    const adjustInventoryStockHttp = loadHandler();
    getAuthMocks().validateToken.mockResolvedValue({
      isValid: true,
      token: { roles: ["Admin"] },
    });
    getAuthMocks().isAdmin.mockReturnValue(true);

    const response = await adjustInventoryStockHttp(
      createRequest({ json: async () => ({ delta: 1.5 }) }),
      createContext()
    );

    expect(response.status).toBe(400);
  });

  it("returns 500 when Cosmos config is missing", async () => {
    const adjustInventoryStockHttp = loadHandler();
    getAuthMocks().validateToken.mockResolvedValue({
      isValid: true,
      token: { roles: ["Admin"] },
    });
    getAuthMocks().isAdmin.mockReturnValue(true);
    delete process.env.COSMOS_DATABASE;
    delete process.env.COSMOS_CONTAINER;

    const response = await adjustInventoryStockHttp(
      createRequest(),
      createContext()
    );

    expect(response.status).toBe(500);
  });

  it("returns 404 when inventory is not found", async () => {
    const adjustInventoryStockHttp = loadHandler();
    getAuthMocks().validateToken.mockResolvedValue({
      isValid: true,
      token: { roles: ["Admin"] },
    });
    getAuthMocks().isAdmin.mockReturnValue(true);
    getCosmosMocks().read.mockResolvedValue({ resource: undefined });

    const response = await adjustInventoryStockHttp(
      createRequest({ json: async () => ({ delta: 1 }) }),
      createContext()
    );

    expect(response.status).toBe(404);
  });

  it("returns 500 when current stock is invalid", async () => {
    const adjustInventoryStockHttp = loadHandler();
    getAuthMocks().validateToken.mockResolvedValue({
      isValid: true,
      token: { roles: ["Admin"] },
    });
    getAuthMocks().isAdmin.mockReturnValue(true);
    getCosmosMocks().read.mockResolvedValue({ resource: { stock: "bad" } });

    const response = await adjustInventoryStockHttp(
      createRequest({ json: async () => ({ delta: 1 }) }),
      createContext()
    );

    expect(response.status).toBe(500);
  });

  it("returns 400 when adjustment would go negative", async () => {
    const adjustInventoryStockHttp = loadHandler();
    getAuthMocks().validateToken.mockResolvedValue({
      isValid: true,
      token: { roles: ["Admin"] },
    });
    getAuthMocks().isAdmin.mockReturnValue(true);
    getCosmosMocks().read.mockResolvedValue({ resource: { stock: 0 } });

    const response = await adjustInventoryStockHttp(
      createRequest({ json: async () => ({ delta: -1 }) }),
      createContext()
    );

    expect(response.status).toBe(400);
  });

  it("returns 500 when Cosmos read throws", async () => {
    const adjustInventoryStockHttp = loadHandler();
    getAuthMocks().validateToken.mockResolvedValue({
      isValid: true,
      token: { roles: ["Admin"] },
    });
    getAuthMocks().isAdmin.mockReturnValue(true);
    getCosmosMocks().read.mockRejectedValue(new Error("boom"));

    const response = await adjustInventoryStockHttp(
      createRequest({ json: async () => ({ delta: 1 }) }),
      createContext()
    );

    expect(response.status).toBe(500);
  });
});
