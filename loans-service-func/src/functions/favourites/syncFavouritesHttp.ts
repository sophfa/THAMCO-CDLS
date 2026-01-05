import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { favouritesContainer } from "../../config/cosmosClient";
import { buildFavouriteIdentity } from "./favouriteIdentity";

export async function syncFavouritesHttp(
  req: HttpRequest,
  ctx: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const { userId } = req.params;
    const normalisedUserId = decodeURIComponent(userId ?? "").trim();
    const body = (await req.json()) as { favorites?: unknown };
    const favouritesArray = Array.isArray(body?.favorites)
      ? (body.favorites as unknown[])
      : [];

    const deviceIds = Array.from(
      new Set(
        favouritesArray
          .map((value) => (typeof value === "string" ? value.trim() : ""))
          .filter((value): value is string => value.length > 0)
      )
    );

    // Delete existing
    const { resources } = await favouritesContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.userId = @userId",
        parameters: [{ name: "@userId", value: normalisedUserId }],
      })
      .fetchAll();
    for (const fav of resources) {
      await favouritesContainer.item(fav.id, fav.userId).delete();
    }

    // Add new
    const newItems = deviceIds.map((deviceId) => {
      const identity = buildFavouriteIdentity(normalisedUserId, deviceId);
      return {
        id: identity.id,
        userId: identity.userId,
        deviceId: identity.deviceId,
        addedAt: new Date().toISOString(),
      };
    });

    for (const item of newItems) {
      await favouritesContainer.items.create(item, {
        disableAutomaticIdGeneration: true,
      });
    }

    return { status: 200, jsonBody: newItems };
  } catch (error: any) {
    ctx.log("Failed to sync favourites:", error);
    return {
      status: 500,
      jsonBody: { message: "Failed to sync favourites" },
    };
  }
}

app.http("syncFavouritesHttp", {
  methods: ["PUT"],
  route: "loans/user/{userId}/favorites",
  authLevel: "anonymous",
  handler: syncFavouritesHttp,
});
