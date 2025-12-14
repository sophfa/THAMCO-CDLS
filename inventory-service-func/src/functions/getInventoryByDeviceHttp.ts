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

export async function getInventoryByDeviceHttp(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  if (req.method === "OPTIONS") {
    return { status: 204 };
  }

  const deviceId = req.params.deviceId;
  context.log?.("[inventory] getInventoryByDeviceHttp", {
    deviceId,
    method: req.method,
    url: req.url,
  });

  if (!deviceId || deviceId.trim().length === 0) {
    context.log?.("[inventory] missing deviceId");
    return {
      status: 400,
      jsonBody: { success: false, message: "A device ID is required" },
    };
  }

  let inventoryContainer: Container;
  try {
    inventoryContainer = getInventoryContainer();
  } catch (error) {
    context.error("[inventory] cosmos container init failed", error);
    return {
      status: 500,
      jsonBody: {
        success: false,
        message: "Inventory service is not configured with Cosmos DB settings",
      },
    };
  }

  const query = `SELECT * FROM c WHERE ARRAY_CONTAINS(c.deviceIds, @deviceId) OR c.deviceId = @deviceId`;

  const { resources } = await inventoryContainer.items
    .query({ query, parameters: [{ name: "@deviceId", value: deviceId }] })
    .fetchAll();

  context.log?.("[inventory] query result", {
    found: resources?.length ?? 0,
    id: resources?.[0]?.id,
    stock: resources?.[0]?.stock,
  });

  if (!resources || resources.length === 0) {
    context.log?.("[inventory] no inventory for device", { deviceId });
    return {
      status: 404,
      jsonBody: {
        success: false,
        message: `No inventory found for device ${deviceId}`,
      },
    };
  }

  return { status: 200, jsonBody: { success: true, data: resources[0] } };
}

app.http("getInventoryByDeviceHttp", {
  route: "inventory/{deviceId}",
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  handler: getInventoryByDeviceHttp,
});
