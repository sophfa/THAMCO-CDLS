// Azure Function - List Inventorys HTTP Trigger

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
  if (request.method === "OPTIONS") {
    return withCors({ status: 204 }, "GET,OPTIONS");
  }

  const correlationId =
    request.headers.get("x-correlation-id")?.trim() ||
    context.invocationId ||
    "unknown";

  context.log({
    correlationId,
    service: "inventory-service-func",
    message: "HTTP trigger function processed a request to list inventorys",
  });

  try {
    const repo = getInventoryRepo();
    const result = await repo.list();

    if (!result.success) {
      throw new Error(
        (result as any).error?.message || "Failed to fetch inventorys"
      );
    }

    if (!result.data) {
      throw new Error("No data returned from repository");
    }

    const response: ListInventorysResponse = {
      success: true,
      data: result.data,
      metadata: {
        count: result.data.length,
        timestamp: new Date().toISOString(),
      },
    };

    return withCors({
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify(response, null, 2),
    });
  } catch (error: any) {
    context.log({
      correlationId,
      service: "inventory-service-func",
      message: "Error listing inventorys",
      error: error?.message ?? String(error),
    });
    const isConfigError =
      error instanceof Error &&
      error.message.includes("Missing required environment variable");
    const errorResponse: ListInventorysResponse = {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: isConfigError
          ? "Inventory service is not configured with Cosmos DB connection settings"
          : "An unexpected error occurred while listing inventorys",
      },
    };
    return withCors({
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(errorResponse, null, 2),
    });
  }
}

// Register the function with Azure Functions runtime
app.http("listInventorys", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "inventorys",
  handler: listInventorysHttp,
});
