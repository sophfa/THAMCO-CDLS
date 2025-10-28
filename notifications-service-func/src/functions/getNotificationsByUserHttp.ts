import { app, HttpRequest, HttpResponseInit } from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";
import "dotenv/config";

const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  key: process.env.COSMOS_KEY!,
});
const container = client
  .database(process.env.COSMOS_DATABASE!)
  .container(process.env.COSMOS_CONTAINER!);

export async function getNotificationsByUserHttp(
  req: HttpRequest
): Promise<HttpResponseInit> {
  const userId = req.params.userId;
  const query = `SELECT * FROM c WHERE c.userId = @userId`;
  const { resources } = await container.items
    .query({ query, parameters: [{ name: "@userId", value: userId }] })
    .fetchAll();
  return { status: 200, jsonBody: resources };
}

app.http("getNotificationsByUserHttp", {
  route: "notifications/{userId}",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: getNotificationsByUserHttp,
});
