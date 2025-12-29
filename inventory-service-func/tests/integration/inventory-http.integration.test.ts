import { HttpRequest, InvocationContext } from "@azure/functions";

jest.mock("../../src/infra/inventory-repo-factory", () => ({
  getInventoryRepo: jest.fn(),
}));

const { listInventorysHttp } = require("../../src/functions/list-inventory-http");
const { getInventoryRepo } = require("../../src/infra/inventory-repo-factory");

describe("inventory HTTP endpoints", () => {
  let context: InvocationContext;

  beforeEach(() => {
    context = {
      log: jest.fn(),
      error: jest.fn(),
    } as unknown as InvocationContext;
    jest.clearAllMocks();
  });

  it("returns inventory list with CORS headers", async () => {
    const mockRepo = {
      list: jest.fn().mockResolvedValue({
        success: true,
        data: [
          { id: "PROD-001", deviceIds: ["DEV-001"], stock: 1 },
          { id: "PROD-002", deviceIds: ["DEV-002"], stock: 0 },
        ],
      }),
    };
    getInventoryRepo.mockReturnValue(mockRepo);

    const request = { method: "GET" } as unknown as HttpRequest;
    const response = await listInventorysHttp(request, context);

    expect(response.status).toBe(200);
    expect(response.headers?.["Access-Control-Allow-Origin"]).toBe("*");
    const body = JSON.parse(response.body as string);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
  });

  it("returns 500 when repository fails", async () => {
    const mockRepo = {
      list: jest.fn().mockResolvedValue({
        success: false,
        error: { code: "PERSISTENCE_ERROR", message: "down" },
      }),
    };
    getInventoryRepo.mockReturnValue(mockRepo);

    const request = { method: "GET" } as unknown as HttpRequest;
    const response = await listInventorysHttp(request, context);

    expect(response.status).toBe(500);
    const body = JSON.parse(response.body as string);
    expect(body.success).toBe(false);
  });
});
