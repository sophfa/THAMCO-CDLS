import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";

const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT,
  key: process.env.COSMOS_KEY,
});
const databaseId = process.env.COSMOS_DATABASE;
const containerId = process.env.COSMOS_CONTAINER;
const container = client.database(databaseId).container(containerId);

export async function markNotificationReadHttp(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const id = request.params.id;

  if (!id) {
    return { status: 400, jsonBody: { error: "Notification id is required" } };
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { read?: boolean };
    const read = body.read !== undefined ? Boolean(body.read) : true;

    const { resource: doc } = await container.item(id, id).read<any>();
    if (!doc) {
      return {
        status: 404,
        jsonBody: { error: `Notification ${id} not found` },
      };
    }

    doc.read = read;
    if (read) {
      doc.readAt = new Date().toISOString();
    } else {
      delete doc.readAt;
    }

    const { resource: updated } = await container.items.upsert(doc);
    return { status: 200, jsonBody: updated };
  } catch (error: any) {
    context.log("Failed to update read status", error);
    return {
      status: 500,
      jsonBody: { error: error?.message || "Internal error" },
    };
  }
}

app.http("markNotificationRead", {
  methods: ["PATCH"],
  authLevel: "anonymous",
  route: "notifications/{id}/read",
  handler: markNotificationReadHttp,
});
