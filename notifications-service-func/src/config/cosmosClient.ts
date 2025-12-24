import { CosmosClient } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";

const endpoint = process.env.COSMOS_ENDPOINT!;

const isLocal =
  (process.env.AZURE_FUNCTIONS_ENVIRONMENT || "").toLowerCase() ===
    "development" || (process.env.NODE_ENV || "").toLowerCase() === "development";

export const cosmosClient = isLocal && process.env.COSMOS_KEY
  ? new CosmosClient({ endpoint, key: process.env.COSMOS_KEY })
  : new CosmosClient({ endpoint, aadCredentials: new DefaultAzureCredential() });
