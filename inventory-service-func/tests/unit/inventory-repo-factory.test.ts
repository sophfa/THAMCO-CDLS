jest.mock("../../src/config/cosmosConfig", () => ({
  getCosmosConfig: jest.fn(),
}));

jest.mock("../../src/infra/cosmos-inventory-repo", () => ({
  CosmosInventoryRepo: jest.fn(),
}));

const { getInventoryRepo } = require("../../src/infra/inventory-repo-factory");
const { getCosmosConfig } = require("../../src/config/cosmosConfig");
const { CosmosInventoryRepo } = require("../../src/infra/cosmos-inventory-repo");

describe("inventory repo factory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCosmosConfig.mockReturnValue({
      endpoint: "https://example",
      databaseId: "db",
      containerId: "inventory",
      key: "key",
    });
  });

  it("creates and caches the repository", () => {
    const first = getInventoryRepo();
    const second = getInventoryRepo();

    expect(CosmosInventoryRepo).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
  });
});
