import { HttpRequest, InvocationContext } from "@azure/functions";

jest.mock("../../src/infra/inventory-repo-factory", () => ({
  getInventoryRepo: jest.fn(),
}));

const { getInventoryByIdHttp } = require("../../src/functions/get-inventory-http");
const { getInventoryRepo } = require("../../src/infra/inventory-repo-factory");

const createContext = () =>
  ({
    log: jest.fn(),
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
    params: { id: "PROD-001" },
    headers: new Map(),
    ...overrides,
  } as unknown as HttpRequest);

describe("getInventoryByIdHttp", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 204 for OPTIONS", async () => {
    const response = await getInventoryByIdHttp(
      createRequest({ method: "OPTIONS" }),
      createContext()
    );
    expect(response.status).toBe(204);
  });

  it("returns 400 when product id is missing", async () => {
    const response = await getInventoryByIdHttp(
      createRequest({ params: { id: "" } }),
      createContext()
    );
    expect(response.status).toBe(400);
  });

  it("returns 200 with inventory data", async () => {
    getInventoryRepo.mockReturnValue({
      get: jest.fn().mockResolvedValue({
        success: true,
        data: { id: "PROD-001", deviceIds: ["DEV-1"], stock: 1 },
      }),
    });

    const response = await getInventoryByIdHttp(
      createRequest(),
      createContext()
    );

    expect(response.status).toBe(200);
    const body = JSON.parse(response.body as string);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe("PROD-001");
  });

  it("returns 404 when inventory is not found", async () => {
    getInventoryRepo.mockReturnValue({
      get: jest.fn().mockResolvedValue({
        success: false,
        error: { code: "NOT_FOUND", message: "missing" },
      }),
    });

    const response = await getInventoryByIdHttp(
      createRequest(),
      createContext()
    );

    expect(response.status).toBe(404);
  });

  it("returns 500 when repository throws", async () => {
    getInventoryRepo.mockImplementation(() => {
      throw new Error("Missing required environment variable: COSMOS_ENDPOINT");
    });

    const response = await getInventoryByIdHttp(
      createRequest(),
      createContext()
    );

    expect(response.status).toBe(500);
  });
});
