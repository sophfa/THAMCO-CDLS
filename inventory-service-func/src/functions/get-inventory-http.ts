// Azure Function - Get Inventory by ID HTTP Trigger

import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { Inventory } from "../domain/inventory";
import { InventoryRepo } from "../domain/inventory-repo";
import { getInventoryRepo } from "../infra/inventory-repo-factory";

function withCors(
  res: HttpResponseInit,
  allowMethods = "GET,OPTIONS"
): HttpResponseInit {
  return {
    ...res,
    headers: {
      ...(res.headers ?? {}),
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": allowMethods,
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  };
}

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
  if (request.method === "OPTIONS") {
    return withCors({ status: 204 }, "GET,OPTIONS");
  }

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

    return withCors({
      status: 400,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(errorResponse, null, 2),
    });
  }

  try {
    // Get inventory from repository
    const repo = getInventoryRepo();
    const result = await repo.get(inventoryId.trim());

    if (result.success) {
      const response: GetInventoryResponse = {
        success: true,
        data: result.data,
      };

      return withCors({
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300", // Cache for 5 minutes
        },
        body: JSON.stringify(response, null, 2),
      });
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

    return withCors({
      status: statusCode,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(errorResponse, null, 2),
    });
  } catch (error: any) {
    context.log("Error getting inventory:", error);
    const isConfigError =
      error instanceof Error &&
      error.message.includes("Missing required environment variable");

    const errorResponse: GetInventoryResponse = {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: isConfigError
          ? "Inventory service is not configured with Cosmos DB connection settings"
          : "An unexpected error occurred while retrieving the inventory",
      },
    };

    return withCors({
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(errorResponse, null, 2),
    });
  }
}

// Register the function with Azure Functions runtime
app.http("getInventoryById", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "inventorys/{id}",
  handler: getInventoryByIdHttp,
});
