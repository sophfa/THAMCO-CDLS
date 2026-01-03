const items = {
  query: jest.fn(),
  create: jest.fn(),
};
const itemRead = jest.fn();
const itemReplace = jest.fn();
const item = jest.fn(() => ({
  read: itemRead,
  replace: itemReplace,
}));
const container = { items, item };
const database = jest.fn(() => ({ container: jest.fn(() => container) }));
const CosmosClient = jest.fn(() => ({ database }));

jest.mock("@azure/cosmos", () => ({
  CosmosClient,
}));

import { CosmosInventoryRepo } from "../../src/infra/cosmos-inventory-repo";

describe("CosmosInventoryRepo", () => {
  beforeEach(() => {
    items.query.mockReset();
    items.create.mockReset();
    itemRead.mockReset();
    itemReplace.mockReset();
    item.mockClear();
    CosmosClient.mockClear();
  });

  it("lists inventory", async () => {
    items.query.mockReturnValue({
      fetchAll: jest.fn().mockResolvedValue({
        resources: [{ id: "PROD-1", deviceIds: ["DEV-1"], stock: 1 }],
      }),
    });
    const repo = new CosmosInventoryRepo({
      endpoint: "https://example",
      databaseId: "db",
      containerId: "inventory",
      key: "key",
    });
    const result = await repo.list();
    expect(result.success).toBe(true);
  });

  it("creates inventory and handles empty resource", async () => {
    items.create.mockResolvedValue({
      resource: { id: "PROD-1", deviceIds: ["DEV-1"], stock: 1 },
    });
    const repo = new CosmosInventoryRepo({
      endpoint: "https://example",
      databaseId: "db",
      containerId: "inventory",
      key: "key",
    });
    const ok = await repo.create({
      id: "PROD-1",
      deviceIds: ["DEV-1"],
      stock: 1,
    });
    expect(ok.success).toBe(true);

    items.create.mockResolvedValue({ resource: undefined });
    const fail = await repo.create({
      id: "PROD-2",
      deviceIds: ["DEV-2"],
      stock: 2,
    });
    expect(fail.success).toBe(false);
  });

  it("gets inventory and maps not found", async () => {
    itemRead.mockResolvedValue({ resource: { id: "PROD-1", deviceIds: [], stock: 0 } });
    const repo = new CosmosInventoryRepo({
      endpoint: "https://example",
      databaseId: "db",
      containerId: "inventory",
      key: "key",
    });
    const found = await repo.get("PROD-1");
    expect(found.success).toBe(true);

    itemRead.mockResolvedValue({ resource: undefined });
    const missing = await repo.get("missing");
    expect(missing.success).toBe(false);
  });

  it("maps Cosmos errors", async () => {
    items.create.mockRejectedValue({ code: 409 });
    const repo = new CosmosInventoryRepo({
      endpoint: "https://example",
      databaseId: "db",
      containerId: "inventory",
      key: "key",
    });
    const result = await repo.create({
      id: "dup",
      deviceIds: ["DEV-1"],
      stock: 1,
    });
    expect(result.success).toBe(false);
  });

  it("updates stock via setStock", async () => {
    itemRead.mockResolvedValue({ resource: { id: "PROD-1", deviceIds: [], stock: 0 } });
    itemReplace.mockResolvedValue({
      resource: { id: "PROD-1", deviceIds: [], stock: 1 },
    });
    const repo = new CosmosInventoryRepo({
      endpoint: "https://example",
      databaseId: "db",
      containerId: "inventory",
      key: "key",
    });
    const result = await repo.setStock("PROD-1", true);
    expect(result.success).toBe(true);
  });
});
