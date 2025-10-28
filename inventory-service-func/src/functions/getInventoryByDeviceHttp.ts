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
  const deviceId = req.params.deviceId;
  const query = `SELECT * FROM c WHERE c.deviceId = @deviceId`;
  const { resources } = await container.items
    .query({ query, parameters: [{ name: "@deviceId", value: deviceId }] })
    .fetchAll();
  return { status: 200, jsonBody: resources[0] || {} };
}

app.http("getInventoryByDeviceHttp", {
  route: "inventory/{deviceId}",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: getInventoryByDeviceHttp,
});
