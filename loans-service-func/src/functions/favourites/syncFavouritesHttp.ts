import { app } from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";

const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  key: process.env.COSMOS_KEY!,
});
const container = client
  .database(process.env.COSMOS_DATABASE!)
  .container("Favourites");

app.http("syncFavouritesHttp", {
  methods: ["PUT"],
  route: "loans/user/{userId}/favorites",
  authLevel: "anonymous",
  handler: async (req, ctx) => {
    const { userId } = req.params;

    try {
      const body = (await req.json()) as { favorites: string[] };
      const { favorites } = body;

      // Delete existing favourites for this user
      const { resources } = await container.items
        .query({
          query: "SELECT * FROM c WHERE c.userId = @userId",
          parameters: [{ name: "@userId", value: userId }],
        })
        .fetchAll();
      for (const fav of resources) {
        try {
          await container.item(fav.id, fav.id).delete();
        } catch (deleteError: any) {
          ctx.log(`Failed to delete favourite ${fav.id}:`, deleteError);
        }
      }

      // Add new favourites using composite ID format
      const newItems = favorites.map((deviceId: string) => ({
        id: `${userId}:${deviceId}`,
        userId,
        deviceId,
        addedAt: new Date(),
      }));

      for (const item of newItems) {
        try {
          await container.items.create(item);
        } catch (error: any) {
          // Log but continue if item already exists
          if (error.code !== 409) {
            ctx.log(`Failed to create favourite ${item.id}:`, error);
          }
        }
      }

      return {
        status: 200,
        jsonBody: {
          message: "Favourites synced successfully",
          syncedCount: newItems.length,
          data: newItems,
        },
      };
    } catch (error: any) {
      ctx.log("Error syncing favourites:", error);
      return {
        status: 500,
        jsonBody: { message: "Internal server error while syncing favourites" },
      };
    }
  },
});
