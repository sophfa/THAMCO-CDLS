// Azure Function - Get Inventory by ID HTTP Trigger

import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { Inventory } from "../domain/inventory";
import { InventoryRepo } from "../domain/inventory-repo";
import { CosmosInventoryRepo } from "../infra/cosmos-inventory-repo";

// Configuration from environment variables
const cosmosOptions = {
  endpoint: process.env.COSMOS_ENDPOINT,
  databaseId: process.env.COSMOS_DATABASE,
  containerId: process.env.COSMOS_CONTAINER,
  key: process.env.COSMOS_KEY,
};

// Initialize repository
const inventoryRepo: InventoryRepo = new CosmosInventoryRepo(cosmosOptions);

/**
 * Response format for single inventory API
 */
interface GetInventoryResponse {
  readonly success: boolean;
  readonly data?: Inventory;
  readonly error?: {
    readonly code: string;
    readonly message: string;
  };
}

/**
 * Azure Function to get a inventory by ID
 *
 * GET /api/inventorys/{id}
 *
 * Returns a single inventory by its ID
 */
export async function getInventoryByIdHttp(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const inventoryId = request.params.id;

  context.log(
    `HTTP trigger function processed a request to get inventory: ${inventoryId}`
  );

  // Validate inventory ID parameter
  if (!inventoryId || inventoryId.trim().length === 0) {
    const errorResponse: GetInventoryResponse = {
      success: false,
      error: {
        code: "INVALID_INPUT",
        message: "Inventory ID is required",
      },
    };

    return {
      status: 400,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(errorResponse, null, 2),
    };
  }

  try {
    // Get inventory from repository
    const result = await inventoryRepo.get(inventoryId.trim());

    if (result.success) {
      const response: GetInventoryResponse = {
        success: true,
        data: result.data,
      };

      return {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300", // Cache for 5 minutes
        },
        body: JSON.stringify(response, null, 2),
      };
    }

    // Handle repository errors - result.success is false, so error exists
    const error = (result as { success: false; error: any }).error;
    const statusCode = error.code === "NOT_FOUND" ? 404 : 500;

    const errorResponse: GetInventoryResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    };

    return {
      status: statusCode,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(errorResponse, null, 2),
    };
  } catch (error: any) {
    context.log("Error getting inventory:", error);

    const errorResponse: GetInventoryResponse = {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while retrieving the inventory",
      },
    };

    return {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(errorResponse, null, 2),
    };
  }
}

// Register the function with Azure Functions runtime
app.http("getInventoryById", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "inventorys/{id}",
  handler: getInventoryByIdHttp,
});
