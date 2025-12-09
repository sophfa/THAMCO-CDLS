import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { favouritesContainer } from "../../config/cosmosClient";
import { buildFavouriteIdentity } from "./favouriteIdentity";

export async function removeFavouriteHttp(
  req: HttpRequest,
  ctx: InvocationContext
): Promise<HttpResponseInit> {
  const { userId, deviceId } = req.params;
  const normalizedUserId = decodeURIComponent(userId ?? "").trim();
  const normalizedDeviceId = decodeURIComponent(deviceId ?? "").trim();

  try {
    // Find the document first to handle legacy IDs and unknown partition keys
    const { resources } = await favouritesContainer.items
      .query({
        query:
          "SELECT c.id, c.userId FROM c WHERE c.userId = @userId AND c.deviceId = @deviceId",
        parameters: [
          { name: "@userId", value: normalizedUserId },
          { name: "@deviceId", value: normalizedDeviceId },
        ],
      })
      .fetchAll();

    if (!resources || resources.length === 0) {
      return { status: 404, jsonBody: { message: "Favourite not found" } };
    }

    const doc = resources[0];

    // Try delete with /userId as the partition key first
    try {
      await favouritesContainer.item(doc.id, doc.userId).delete();
    } catch (inner: any) {
      // Fallback: try with /id partition key (legacy containers)
      if (inner?.code === 404 || inner?.code === 400) {
        await favouritesContainer.item(doc.id, doc.id).delete();
      } else {
        throw inner;
      }
    }

    return { status: 200, jsonBody: { message: "Favourite removed" } };
  } catch (error: any) {
    if (error?.code === 404) {
      return { status: 404, jsonBody: { message: "Favourite not found" } };
    }

    ctx.log("Failed to remove favourite:", error);
    return {
      status: 500,
      jsonBody: { message: "Failed to remove favourite" },
    };
  }
}

app.http("removeFavouriteHttp", {
  methods: ["DELETE"],
  route: "loans/user/{userId}/favorites/{deviceId}",
  authLevel: "anonymous",
  handler: removeFavouriteHttp,
});
