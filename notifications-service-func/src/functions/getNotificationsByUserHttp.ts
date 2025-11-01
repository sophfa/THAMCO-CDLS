import { app, HttpRequest, HttpResponseInit } from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";
import "dotenv/config";

// Configure Cosmos with safe defaults
const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT || "https://localhost:8081",
  key: process.env.COSMOS_KEY,
});
const databaseId = process.env.COSMOS_DATABASE || "notifications-db";
const containerId = process.env.COSMOS_CONTAINER || "Notifications";
const container = client.database(databaseId).container(containerId);

export async function getNotificationsByUserHttp(
  req: HttpRequest
): Promise<HttpResponseInit> {
  try {
    const rawUserId = req.params.userId ?? "";
    const userId = decodeURIComponent(rawUserId).trim();

    const query = `SELECT * FROM c WHERE c.userId = @userId`;
    const { resources } = await container.items
      .query({ query, parameters: [{ name: "@userId", value: userId }] })
      .fetchAll();

    return { status: 200, jsonBody: resources };
  } catch (error: any) {
    console.error("Failed to fetch notifications:", error);
    return {
      status: 500,
      jsonBody: { message: "Failed to fetch notifications" },
    };
  }
}

app.http("getNotificationsByUserHttp", {
  route: "notifications/{userId}",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: getNotificationsByUserHttp,
});
