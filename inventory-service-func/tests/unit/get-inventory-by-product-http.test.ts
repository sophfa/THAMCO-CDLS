import { HttpRequest, InvocationContext } from "@azure/functions";

const createContext = () =>
  ({
    log: jest.fn(),
    error: jest.fn(),
  } as unknown as InvocationContext);

const createRequest = (
  overrides: Partial<{
    method: string;
    params: Record<string, string>;
    headers: Map<string, string>;
  }> = {}
) =>
  ({
    method: "GET",
    params: { productId: "PROD-001" },
    headers: new Map(),
    ...overrides,
  } as unknown as HttpRequest);

const setupModule = (resources: any[] = []) => {
  jest.resetModules();
  const fetchAll = jest.fn().mockResolvedValue({ resources });
  const query = jest.fn(() => ({ fetchAll }));
  const container = { items: { query } };
  const database = jest.fn(() => ({ container: jest.fn(() => container) }));
  const getCosmosClient = jest.fn(() => ({ database }));

  jest.doMock("../../src/config/cosmosClient", () => ({
    getCosmosClient,
  }));

  process.env.COSMOS_DATABASE = "db";
  process.env.COSMOS_CONTAINER = "inventory";

  const module = require("../../src/functions/getInventoryByProductHttp");
  return { getInventoryByProductHttp: module.getInventoryByProductHttp, query };
};

describe("getInventoryByProductHttp", () => {
  beforeEach(() => {
    delete process.env.COSMOS_DATABASE;
    delete process.env.COSMOS_CONTAINER;
    jest.clearAllMocks();
  });

  it("returns 204 for OPTIONS", async () => {
    const { getInventoryByProductHttp } = setupModule();
    const response = await getInventoryByProductHttp(
      createRequest({ method: "OPTIONS" }),
      createContext()
    );
    expect(response.status).toBe(204);
  });

  it("returns 400 when productId is missing", async () => {
    const { getInventoryByProductHttp } = setupModule();
    const response = await getInventoryByProductHttp(
      createRequest({ params: { productId: "" } }),
      createContext()
    );
    expect(response.status).toBe(400);
  });

  it("returns 500 when Cosmos config is missing", async () => {
    jest.resetModules();
    jest.doMock("../../src/config/cosmosClient", () => ({
      getCosmosClient: jest.fn(),
    }));
    const { getInventoryByProductHttp } = require(
      "../../src/functions/getInventoryByProductHttp"
    );
    const response = await getInventoryByProductHttp(
      createRequest(),
      createContext()
    );
    expect(response.status).toBe(500);
  });

  it("returns 404 when no inventory exists", async () => {
    const { getInventoryByProductHttp } = setupModule([]);
    const response = await getInventoryByProductHttp(
      createRequest(),
      createContext()
    );
    expect(response.status).toBe(404);
  });

  it("returns 200 when inventory exists", async () => {
    const { getInventoryByProductHttp } = setupModule([
      { id: "PROD-001", deviceIds: ["DEV-1"], stock: 2 },
    ]);
    const response = await getInventoryByProductHttp(
      createRequest(),
      createContext()
    );
    expect(response.status).toBe(200);
    expect(response.jsonBody.success).toBe(true);
  });
});
