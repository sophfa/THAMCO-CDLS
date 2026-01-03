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

import { CosmosNotificationRepo } from "../../src/infra/cosmos-notification-repo";
import { Notification } from "../../src/domain/notification";

const sampleNotification: Notification<"Custom"> = {
  id: "N-1",
  userId: "auth0|user-1",
  type: "Custom",
  message: "Hello",
  payload: { message: "Hello" },
  createdAt: new Date().toISOString(),
};

describe("CosmosNotificationRepo", () => {
  beforeEach(() => {
    items.query.mockReset();
    items.create.mockReset();
    itemRead.mockReset();
    item.mockClear();
    CosmosClient.mockClear();
    DefaultAzureCredential.mockClear();
  });

  it("lists notifications", async () => {
    items.query.mockReturnValue({
      fetchAll: jest.fn().mockResolvedValue({
        resources: [sampleNotification],
      }),
    });
    const repo = new CosmosNotificationRepo({
      endpoint: "https://example",
      databaseId: "db",
      containerId: "notifications",
      key: "key",
    });
    const result = await repo.list();
    expect(result.success).toBe(true);
  });

  it("creates and gets notifications", async () => {
    items.create.mockResolvedValue({ resource: sampleNotification });
    itemRead.mockResolvedValue({ resource: sampleNotification });
    const repo = new CosmosNotificationRepo({
      endpoint: "https://example",
      databaseId: "db",
      containerId: "notifications",
      key: "key",
    });
    const created = await repo.create(sampleNotification);
    expect(created.success).toBe(true);
    const found = await repo.get("N-1");
    expect(found.success).toBe(true);
  });

  it("handles not found and maps errors", async () => {
    itemRead.mockResolvedValue({ resource: undefined });
    const repo = new CosmosNotificationRepo({
      endpoint: "https://example",
      databaseId: "db",
      containerId: "notifications",
      key: "key",
    });
    const missing = await repo.get("missing");
    expect(missing.success).toBe(false);

    items.create.mockRejectedValue({ code: 409 });
    const dup = await repo.create(sampleNotification);
    expect(dup.success).toBe(false);
  });

  it("gets notifications by user", async () => {
    items.query.mockReturnValue({
      fetchAll: jest.fn().mockResolvedValue({
        resources: [sampleNotification],
      }),
    });
    const repo = new CosmosNotificationRepo({
      endpoint: "https://example",
      databaseId: "db",
      containerId: "notifications",
      key: "key",
    });
    const result = await repo.getByUserId("auth0|user-1");
    expect(result.success).toBe(true);
  });
});
