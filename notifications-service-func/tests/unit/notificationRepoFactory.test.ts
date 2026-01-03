jest.mock("../../src/infra/cosmos-notification-repo", () => ({
  CosmosNotificationRepo: jest.fn(),
}));

const { getNotificationRepo, MissingCosmosConfigurationError } = require(
  "../../src/infra/notificationRepoFactory"
);
const { CosmosNotificationRepo } = require("../../src/infra/cosmos-notification-repo");

describe("notificationRepoFactory", () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
    jest.clearAllMocks();
  });

  it("throws when required config is missing", () => {
    delete process.env.COSMOS_ENDPOINT;
    delete process.env.COSMOS_DATABASE;
    delete process.env.COSMOS_CONTAINER;
    expect(() => getNotificationRepo()).toThrow(MissingCosmosConfigurationError);
  });

  it("creates and caches repo", () => {
    process.env.COSMOS_ENDPOINT = "https://example";
    process.env.COSMOS_DATABASE = "db";
    process.env.COSMOS_CONTAINER = "notifications";
    const first = getNotificationRepo();
    const second = getNotificationRepo();
    expect(CosmosNotificationRepo).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
  });
});
