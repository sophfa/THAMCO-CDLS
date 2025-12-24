// Shared Cosmos DB client configuration
import { CosmosClient, Container } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";

const isLocal =
  (process.env.AZURE_FUNCTIONS_ENVIRONMENT || "").toLowerCase() ===
    "development" || (process.env.NODE_ENV || "").toLowerCase() === "development";

const client = isLocal && process.env.COSMOS_KEY
  ? new CosmosClient({
      endpoint: process.env.COSMOS_ENDPOINT!,
      key: process.env.COSMOS_KEY!,
    })
  : new CosmosClient({
      endpoint: process.env.COSMOS_ENDPOINT!,
      aadCredentials: new DefaultAzureCredential(),
    });

export const loansContainer: Container = client
  .database(process.env.COSMOS_DATABASE!)
  .container(process.env.COSMOS_CONTAINER!);

export const favouritesContainer: Container = client
  .database(process.env.COSMOS_DATABASE!)
  .container(process.env.COSMOS_CONTAINER_FAVOURITES);

export { client };
