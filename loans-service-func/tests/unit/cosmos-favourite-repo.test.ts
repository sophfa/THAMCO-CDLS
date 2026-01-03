const items = {
  query: jest.fn(),
  create: jest.fn(),
};
const itemRead = jest.fn();
const itemDelete = jest.fn();
const item = jest.fn(() => ({ read: itemRead, delete: itemDelete }));
const container = { items, item };
const database = jest.fn(() => ({ container: jest.fn(() => container) }));
const CosmosClient = jest.fn(() => ({ database }));

jest.mock("@azure/cosmos", () => ({
  CosmosClient,
}));

import { CosmosFavouriteRepo } from "../../src/infra/cosmos-favourite-repo";

const sampleFavourite = {
  id: "FAV-1",
  userId: "auth0|user-1",
  deviceId: "DEV-1",
  addedAt: new Date("2026-01-01T00:00:00Z"),
};

describe("CosmosFavouriteRepo", () => {
  beforeEach(() => {
    items.query.mockReset();
    items.create.mockReset();
    itemRead.mockReset();
    itemDelete.mockReset();
    item.mockClear();
    CosmosClient.mockClear();
  });

  it("lists favourites", async () => {
    items.query.mockReturnValue({
      fetchAll: jest.fn().mockResolvedValue({
        resources: [
          {
            id: sampleFavourite.id,
            userId: sampleFavourite.userId,
            deviceId: sampleFavourite.deviceId,
            addedAt: sampleFavourite.addedAt.toISOString(),
          },
        ],
      }),
    });

    const repo = new CosmosFavouriteRepo({
      endpoint: "https://example",
      databaseId: "db",
      containerId: "favourites",
      key: "key",
    });

    const result = await repo.list();
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
  });

  it("creates and gets favourites", async () => {
    items.create.mockResolvedValue({
      resource: {
        id: sampleFavourite.id,
        userId: sampleFavourite.userId,
        deviceId: sampleFavourite.deviceId,
        addedAt: sampleFavourite.addedAt.toISOString(),
      },
    });
    itemRead.mockResolvedValue({
      resource: {
        id: sampleFavourite.id,
        userId: sampleFavourite.userId,
        deviceId: sampleFavourite.deviceId,
        addedAt: sampleFavourite.addedAt.toISOString(),
      },
    });

    const repo = new CosmosFavouriteRepo({
      endpoint: "https://example",
      databaseId: "db",
      containerId: "favourites",
      key: "key",
    });

    const created = await repo.create(sampleFavourite);
    expect(created.success).toBe(true);

    const found = await repo.get(sampleFavourite.id);
    expect(found.success).toBe(true);
  });

  it("deletes favourites and maps errors", async () => {
    itemDelete.mockResolvedValue({});

    const repo = new CosmosFavouriteRepo({
      endpoint: "https://example",
      databaseId: "db",
      containerId: "favourites",
      key: "key",
    });

    const removed = await repo.delete(sampleFavourite.id);
    expect(removed.success).toBe(true);

    items.create.mockRejectedValue({ code: 409 });
    const dup = await repo.create(sampleFavourite);
    expect(dup.success).toBe(false);

    itemRead.mockRejectedValue({ code: 404 });
    const missing = await repo.get("missing");
    expect(missing.success).toBe(false);
  });
});
