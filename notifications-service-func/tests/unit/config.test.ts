const CosmosClient = jest.fn();
const DefaultAzureCredential = jest.fn();

jest.mock("@azure/cosmos", () => ({
  CosmosClient,
}));

jest.mock("@azure/identity", () => ({
  DefaultAzureCredential,
}));

describe("notifications config", () => {
  const env = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...env };
  });

  afterEach(() => {
    process.env = { ...env };
  });

  it("exports cosmos options with key in local dev", () => {
    process.env.AZURE_FUNCTIONS_ENVIRONMENT = "development";
    process.env.COSMOS_ENDPOINT = "https://example";
    process.env.COSMOS_DATABASE = "db";
    process.env.COSMOS_CONTAINER = "notifications";
    process.env.COSMOS_KEY = "key";

    const { cosmosOptions } = require("../../src/config/cosmosOptions");
    expect(cosmosOptions).toEqual({
      endpoint: "https://example",
      databaseId: "db",
      containerId: "notifications",
      key: "key",
    });
  });

  it("creates Cosmos client with key when local", () => {
    process.env.AZURE_FUNCTIONS_ENVIRONMENT = "development";
    process.env.COSMOS_ENDPOINT = "https://example";
    process.env.COSMOS_KEY = "key";

    const { cosmosClient } = require("../../src/config/cosmosClient");
    expect(cosmosClient).toBeDefined();
    expect(CosmosClient).toHaveBeenCalledWith({
      endpoint: "https://example",
      key: "key",
    });
  });

  it("creates Cosmos client with AAD when not local", () => {
    process.env.AZURE_FUNCTIONS_ENVIRONMENT = "production";
    process.env.COSMOS_ENDPOINT = "https://example";
    delete process.env.COSMOS_KEY;

    const { cosmosClient } = require("../../src/config/cosmosClient");
    expect(cosmosClient).toBeDefined();
    expect(DefaultAzureCredential).toHaveBeenCalledTimes(1);
    expect(CosmosClient).toHaveBeenCalledWith({
      endpoint: "https://example",
      aadCredentials: expect.any(Object),
    });
  });

  it("loads app service config without throwing", () => {
    process.env.COSMOS_ENDPOINT = "https://example";
    process.env.COSMOS_DATABASE = "db";
    process.env.COSMOS_CONTAINER = "notifications";

    expect(() => require("../../src/config/appService")).not.toThrow();
  });
});
