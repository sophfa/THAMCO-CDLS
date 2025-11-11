// Shared Cosmos DB client configuration
import { CosmosClient, Container } from '@azure/cosmos';

// Initialize Cosmos client once
const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  key: process.env.COSMOS_KEY!,
});

// Export the container for the Loans collection
export const loansContainer: Container = client
  .database(process.env.COSMOS_DATABASE!)
  .container(process.env.COSMOS_CONTAINER!);

// Export the container for the Favourites collection
export const favouritesContainer: Container = client
  .database(process.env.COSMOS_DATABASE!)
  .container(process.env.COSMOS_CONTAINER_FAVOURITES);

// Export the client if needed for other operations
export { client };
