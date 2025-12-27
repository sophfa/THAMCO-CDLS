import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { cosmosClient } from "../config/cosmosClient";
import { validateToken, isAdminOrOwner } from "../utils/auth";

const databaseId = process.env.COSMOS_DATABASE;
const containerId = process.env.COSMOS_CONTAINER;
const container = cosmosClient.database(databaseId).container(containerId);

export async function markNotificationReadHttp(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  if (request.method === "OPTIONS") return { status: 204 };

  const auth = await validateToken(request, context);
  if (!auth.isValid || !auth.userId) {
    return { status: 401, jsonBody: { error: "Unauthorized" } };
  }

  const id = request.params.id;

  if (!id) {
    return { status: 400, jsonBody: { error: "Notification id is required" } };
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      read?: boolean;
    };
    const read = body.read !== undefined ? Boolean(body.read) : true;

    const { resources } = await container.items
      .query({
        query: "SELECT * FROM c WHERE c.id = @id",
        parameters: [{ name: "@id", value: id }],
      })
      .fetchAll();

    const doc = resources?.[0];
    if (!doc) {
      return {
        status: 404,
        jsonBody: { error: `Notification ${id} not found` },
      };
    }

    if (!isAdminOrOwner(auth, doc.userId)) {
      return { status: 403, jsonBody: { error: "Forbidden" } };
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
  methods: ["PATCH", "OPTIONS"],
  authLevel: "anonymous",
  route: "notifications/{id}/read",
  handler: markNotificationReadHttp,
});
