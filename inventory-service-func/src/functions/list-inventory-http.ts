// Azure Function - List Inventorys HTTP Trigger

import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { Inventory } from '../domain/inventory';
import { InventoryRepo } from '../domain/inventory-repo';
import { CosmosInventoryRepo } from '../infra/cosmos-inventory-repo';

// Configuration from environment variables
const cosmosOptions = {
  endpoint: process.env.COSMOS_ENDPOINT || 'https://localhost:8081',
  databaseId: process.env.COSMOS_DATABASE || 'InventorysDB',
  containerId: process.env.COSMOS_CONTAINER || 'Inventorys',
  key: process.env.COSMOS_KEY,
};

// Initialize repository - in inventoryion, this could be dependency injected
const inventoryRepo: InventoryRepo = new CosmosInventoryRepo(cosmosOptions);

/**
 * Response format for inventory list API
 */
interface ListInventorysResponse {
  readonly success: boolean;
  readonly data?: Inventory[];
  readonly error?: {
    readonly code: string;
    readonly message: string;
  };
  readonly metadata?: {
    readonly count: number;
    readonly timestamp: string;
  };
}

/**
 * Azure Function to list all inventorys
 *
 * GET /api/inventorys
 *
 * Returns a list of all inventorys in the system
 */
export async function listInventorysHttp(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('HTTP trigger function processed a request to list inventorys');

  try {
    const result = await inventoryRepo.list();

    if (!result.success) {
      throw new Error(
        (result as any).error?.message || 'Failed to fetch inventorys'
      );
    }

    if (!result.data) {
      throw new Error('No data returned from repository');
    }

    const response: ListInventorysResponse = {
      success: true,
      data: result.data,
      metadata: {
        count: result.data.length,
        timestamp: new Date().toISOString(),
      },
    };

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify(response, null, 2),
    };
  } catch (error: any) {
    context.log('Error listing inventorys:', error);
    const errorResponse: ListInventorysResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while listing inventorys',
      },
    };
    return {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorResponse, null, 2),
    };
  }
}

// Register the function with Azure Functions runtime
app.http('listInventorys', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'inventorys',
  handler: listInventorysHttp,
});
