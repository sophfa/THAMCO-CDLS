import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { Container } from "@azure/cosmos";
import { getCosmosClient } from "../config/cosmosClient";
import "dotenv/config";

let container: Container | undefined;
function getInventoryContainer(): Container {
  if (!container) {
    const databaseId = process.env.COSMOS_DATABASE;
    const containerId = process.env.COSMOS_CONTAINER;
    if (!databaseId || !containerId) {
      throw new Error(
        "Missing required environment variable: COSMOS_DATABASE or COSMOS_CONTAINER"
      );
    }
    container = getCosmosClient()
      .database(databaseId)
      .container(containerId);
  }
  return container;
}

export async function getInventoryByProductHttp(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  if (req.method === "OPTIONS") {
    return { status: 204 };
  }

  const productId = req.params.productId;
  const correlationId =
    req.headers.get("x-correlation-id")?.trim() ||
    context.invocationId ||
    "unknown";
  const baseLog = {
    correlationId,
    service: "inventory-service-func",
  };

  context.log?.({
    ...baseLog,
    message: "getInventoryByProductHttp",
    productId,
    method: req.method,
    url: req.url,
  });

  if (!productId || productId.trim().length === 0) {
    context.log?.({
      ...baseLog,
      message: "missing productId",
    });
    return {
      status: 400,
      jsonBody: { success: false, message: "A product ID is required" },
    };
  }

  let inventoryContainer: Container;
  try {
    inventoryContainer = getInventoryContainer();
  } catch (error) {
    context.error({
      ...baseLog,
      message: "cosmos container init failed",
      error: error?.message ?? String(error),
    });
    return {
      status: 500,
      jsonBody: {
        success: false,
        message: "Inventory service is not configured with Cosmos DB settings",
      },
    };
  }

  const query = `SELECT * FROM c WHERE c.id = @productId OR ARRAY_CONTAINS(c.deviceIds, @productId) OR c.deviceId = @productId`;

  const { resources } = await inventoryContainer.items
    .query({ query, parameters: [{ name: "@productId", value: productId }] })
    .fetchAll();

  context.log?.({
    ...baseLog,
    message: "query result",
    found: resources?.length ?? 0,
    id: resources?.[0]?.id,
    stock: resources?.[0]?.stock,
  });

  if (!resources || resources.length === 0) {
    context.log?.({
      ...baseLog,
      message: "no inventory for product",
      productId,
    });
    return {
      status: 404,
      jsonBody: {
        success: false,
        message: `No inventory found for product ${productId}`,
      },
    };
  }

  return { status: 200, jsonBody: { success: true, data: resources[0] } };
}

app.http("getInventoryByProductHttp", {
  route: "inventory/{productId}",
  methods: ["GET", "OPTIONS"],
  authLevel: "function",
  handler: getInventoryByProductHttp,
});
