import { HttpRequest, InvocationContext } from "@azure/functions";
import { Product } from "../../src/domain/product";

describe("catalogue HTTP endpoints", () => {
  let listProductsHttp: (
    request: HttpRequest,
    context: InvocationContext
  ) => Promise<any>;
  let getProductByIdHttp: (
    request: HttpRequest,
    context: InvocationContext
  ) => Promise<any>;
  let mockRepo: { list: jest.Mock; get: jest.Mock };
  let context: InvocationContext;

  beforeEach(() => {
    jest.resetModules();

    mockRepo = {
      list: jest.fn(),
      get: jest.fn(),
    };

    jest.doMock("../../src/infra/cosmos-product-repo", () => ({
      CosmosProductRepo: jest.fn(() => mockRepo),
    }));

    listProductsHttp = require("../../src/functions/list-products-http").listProductsHttp;
    getProductByIdHttp =
      require("../../src/functions/get-product-http").getProductByIdHttp;

    context = {
      log: jest.fn(),
      error: jest.fn(),
    } as unknown as InvocationContext;
  });

  it("returns a list of products with metadata", async () => {
    const product: Product = {
      id: "DEV-001",
      name: "ThinkPad X1",
      brand: "Lenovo",
      category: "Laptop",
      model: "X1 Carbon",
      processor: "Intel i7",
      ram: "16GB",
      storage: "512GB",
      gpu: "Integrated",
      display: "14-inch",
      os: "Windows",
      batteryLife: "10 hours",
      weight: "1.1kg",
      ports: ["USB-C", "HDMI"],
      connectivity: ["WiFi", "Bluetooth"],
      price: 1200,
      inStock: true,
      createdAt: new Date("2025-01-01T00:00:00Z"),
    };

    mockRepo.list.mockResolvedValue({ success: true, data: [product] });

    const request = { method: "GET" } as unknown as HttpRequest;
    const response = await listProductsHttp(request, context);

    expect(response.status).toBe(200);
    const body = JSON.parse(response.body as string);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.metadata.count).toBe(1);
  });

  it("returns 500 when repository returns an error", async () => {
    mockRepo.list.mockResolvedValue({
      success: false,
      error: { code: "PERSISTENCE_ERROR", message: "boom" },
    });

    const request = { method: "GET" } as unknown as HttpRequest;
    const response = await listProductsHttp(request, context);

    expect(response.status).toBe(500);
    const body = JSON.parse(response.body as string);
    expect(body.success).toBe(false);
  });

  it("falls back to alternate product IDs when needed", async () => {
    mockRepo.get
      .mockResolvedValueOnce({
        success: false,
        error: { code: "NOT_FOUND", message: "missing" },
      })
      .mockResolvedValueOnce({
        success: true,
        data: { id: "PROD-001" },
      });

    const request = {
      params: { id: "DEV-001" },
    } as unknown as HttpRequest;
    const response = await getProductByIdHttp(request, context);

    expect(response.status).toBe(200);
    expect(response.headers?.["X-Resolved-Product-Id"]).toBe("PROD-001");
  });

  it("returns 400 when product id is missing", async () => {
    const request = {
      params: { id: "" },
    } as unknown as HttpRequest;
    const response = await getProductByIdHttp(request, context);

    expect(response.status).toBe(400);
    const body = JSON.parse(response.body as string);
    expect(body.success).toBe(false);
  });
});
