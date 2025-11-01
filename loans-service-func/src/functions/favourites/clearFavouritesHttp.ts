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
      const { resources } = await container.items
        .query({
          query: "SELECT * FROM c WHERE c.userId = @userId",
          parameters: [{ name: "@userId", value: userId }],
        })
        .fetchAll();

      // Delete all found favourites
      for (const fav of resources) {
        try {
          await container.item(fav.id, fav.id).delete();
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
