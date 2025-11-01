import { app } from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";

const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  key: process.env.COSMOS_KEY!,
});
const container = client
  .database(process.env.COSMOS_DATABASE!)
  .container("Favourites");

app.http("clearFavouritesHttp", {
  methods: ["DELETE"],
  route: "loans/user/{userId}/favorites",
  authLevel: "anonymous",
  handler: async (req, ctx) => {
    const { userId } = req.params;
    try {
      const normalizedUserId = decodeURIComponent(userId ?? "").trim();
      const { resources } = await container.items
        .query({
          query: "SELECT * FROM c WHERE c.userId = @userId",
          parameters: [{ name: "@userId", value: normalizedUserId }],
        })
        .fetchAll();

      // Delete all found favourites with partition key fallback
      for (const fav of resources) {
        try {
          try {
            await container.item(fav.id, fav.userId).delete();
          } catch (inner: any) {
            if (inner?.code === 404 || inner?.code === 400) {
              await container.item(fav.id, fav.id).delete();
            } else {
              throw inner;
            }
          }
        } catch (deleteError: any) {
          // Log individual delete errors but continue
          ctx.log(`Failed to delete favourite ${fav.id}:`, deleteError);
        }
      }

      return {
        status: 200,
        jsonBody: {
          message: "All favourites cleared",
          deletedCount: resources.length,
        },
      };
    } catch (error: any) {
      ctx.log("Error clearing favourites:", error);
      return {
        status: 500,
        jsonBody: {
          message: "Internal server error while clearing favourites",
        },
      };
    }
  },
});
