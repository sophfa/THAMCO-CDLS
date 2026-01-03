const CosmosClient = jest.fn();
const DefaultAzureCredential = jest.fn();

jest.mock("@azure/cosmos", () => ({
  CosmosClient,
}));

jest.mock("@azure/identity", () => ({
  DefaultAzureCredential,
}));

describe("inventory config", () => {
  const env = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...env };
  });

  afterEach(() => {
    process.env = { ...env };
  });

  it("throws when required Cosmos env is missing", () => {
    delete process.env.COSMOS_ENDPOINT;
    delete process.env.COSMOS_DATABASE;
    delete process.env.COSMOS_CONTAINER;

    const { getCosmosConfig } = require("../../src/config/cosmosConfig");
    expect(() => getCosmosConfig()).toThrow(
      /Missing required environment variable/
    );
  });

  it("returns Cosmos config with key in local dev", () => {
    process.env.AZURE_FUNCTIONS_ENVIRONMENT = "development";
    process.env.COSMOS_ENDPOINT = "https://example";
    process.env.COSMOS_DATABASE = "db";
    process.env.COSMOS_CONTAINER = "inventory";
    process.env.COSMOS_KEY = "key";

    const { getCosmosConfig } = require("../../src/config/cosmosConfig");
    const config = getCosmosConfig();

    expect(config).toEqual({
      endpoint: "https://example",
      databaseId: "db",
      containerId: "inventory",
      key: "key",
    });
  });

  it("creates Cosmos client using key when provided", () => {
    process.env.AZURE_FUNCTIONS_ENVIRONMENT = "development";
    process.env.COSMOS_ENDPOINT = "https://example";
    process.env.COSMOS_DATABASE = "db";
    process.env.COSMOS_CONTAINER = "inventory";
    process.env.COSMOS_KEY = "key";

    const { getCosmosClient } = require("../../src/config/cosmosClient");
    getCosmosClient();

    expect(CosmosClient).toHaveBeenCalledWith({
      endpoint: "https://example",
      key: "key",
    });
  });

  it("creates Cosmos client using AAD when no key is set", () => {
    process.env.AZURE_FUNCTIONS_ENVIRONMENT = "production";
    process.env.COSMOS_ENDPOINT = "https://example";
    process.env.COSMOS_DATABASE = "db";
    process.env.COSMOS_CONTAINER = "inventory";
    delete process.env.COSMOS_KEY;

    const { getCosmosClient } = require("../../src/config/cosmosClient");
    getCosmosClient();

    expect(DefaultAzureCredential).toHaveBeenCalledTimes(1);
    expect(CosmosClient).toHaveBeenCalledWith({
      endpoint: "https://example",
      aadCredentials: expect.any(Object),
    });
  });

  it("loads app service config without throwing", () => {
    process.env.COSMOS_ENDPOINT = "https://example";
    process.env.COSMOS_DATABASE = "db";
    process.env.COSMOS_CONTAINER = "inventory";

    expect(() => require("../../src/config/appService")).not.toThrow();
  });
});
