import { CosmosClient } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";
import { getCosmosConfig } from "./cosmosConfig";

let client: CosmosClient | undefined;

export function getCosmosClient(): CosmosClient {
  if (!client) {
    const { endpoint, key } = getCosmosConfig();
    client = key
      ? new CosmosClient({ endpoint, key })
      : new CosmosClient({ endpoint, aadCredentials: new DefaultAzureCredential() });
  }
  return client;
}
