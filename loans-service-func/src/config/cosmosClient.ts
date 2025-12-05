// Shared Cosmos DB client configuration
import { CosmosClient, Container } from "@azure/cosmos";

const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  key: process.env.COSMOS_KEY!,
});

export const loansContainer: Container = client
  .database(process.env.COSMOS_DATABASE!)
  .container(process.env.COSMOS_CONTAINER!);

export const favouritesContainer: Container = client
  .database(process.env.COSMOS_DATABASE!)
  .container(process.env.COSMOS_CONTAINER_FAVOURITES);

export { client };
