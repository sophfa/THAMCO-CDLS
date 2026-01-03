const items = {
  query: jest.fn(),
  create: jest.fn(),
};
const itemRead = jest.fn();
const item = jest.fn(() => ({ read: itemRead }));
const container = { items, item };
const database = jest.fn(() => ({ container: jest.fn(() => container) }));
const CosmosClient = jest.fn(() => ({ database }));
const DefaultAzureCredential = jest.fn();

jest.mock("@azure/cosmos", () => ({
  CosmosClient,
}));

jest.mock("@azure/identity", () => ({
  DefaultAzureCredential,
}));

import { CosmosProductRepo } from "../../src/infra/cosmos-product-repo";

const sampleProduct = {
  id: "DEV-1",
  name: "Surface",
  brand: "Microsoft",
  category: "Laptop",
  model: "X",
  processor: "i7",
  ram: "16GB",
  storage: "512GB",
  gpu: "Integrated",
  display: "14",
  os: "Windows",
  batteryLife: "10h",
  weight: "1kg",
  ports: ["USB-C"],
  connectivity: ["WiFi"],
  price: 1200,
  inStock: true,
  createdAt: new Date("2025-01-01T00:00:00Z"),
};

describe("CosmosProductRepo", () => {
  beforeEach(() => {
    items.query.mockReset();
    items.create.mockReset();
    itemRead.mockReset();
    item.mockClear();
    CosmosClient.mockClear();
    DefaultAzureCredential.mockClear();
  });

  it("lists products", async () => {
    items.query.mockReturnValue({
      fetchAll: jest.fn().mockResolvedValue({
        resources: [{ ...sampleProduct, createdAt: sampleProduct.createdAt.toISOString() }],
      }),
    });
    const repo = new CosmosProductRepo({
      endpoint: "https://example",
      databaseId: "db",
      containerId: "products",
      key: "key",
    });
    const result = await repo.list();
    expect(result.success).toBe(true);
  });

  it("creates product and maps errors", async () => {
    items.create.mockResolvedValue({
      resource: { ...sampleProduct, createdAt: sampleProduct.createdAt.toISOString() },
    });
    const repo = new CosmosProductRepo({
      endpoint: "https://example",
      databaseId: "db",
      containerId: "products",
      key: "key",
    });
    const ok = await repo.create(sampleProduct);
    expect(ok.success).toBe(true);

    items.create.mockRejectedValue({ code: 409 });
    const dup = await repo.create(sampleProduct);
    expect(dup.success).toBe(false);
  });

  it("gets product and handles not found", async () => {
    itemRead.mockResolvedValue({
      resource: { ...sampleProduct, createdAt: sampleProduct.createdAt.toISOString() },
    });
    const repo = new CosmosProductRepo({
      endpoint: "https://example",
      databaseId: "db",
      containerId: "products",
      key: "key",
    });
    const found = await repo.get("DEV-1");
    expect(found.success).toBe(true);

    itemRead.mockResolvedValue({ resource: undefined });
    const missing = await repo.get("missing");
    expect(missing.success).toBe(false);
  });
});
