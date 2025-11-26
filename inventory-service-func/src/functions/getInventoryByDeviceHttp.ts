import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";
import "dotenv/config";

const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  key: process.env.COSMOS_KEY!,
});
const container = client
  .database(process.env.COSMOS_DATABASE!)
  .container(process.env.COSMOS_CONTAINER!);

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

  const query = `SELECT * FROM c WHERE ARRAY_CONTAINS(c.deviceIds, @deviceId) OR c.deviceId = @deviceId`;

  const { resources } = await container.items
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
