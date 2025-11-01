import { app } from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";

const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  key: process.env.COSMOS_KEY!,
});
const container = client
  .database(process.env.COSMOS_DATABASE!)
  .container("Favourites");

app.http("removeFavouriteHttp", {
  methods: ["DELETE"],
  route: "loans/user/{userId}/favorites/{deviceId}",
  authLevel: "anonymous",
  handler: async (req, ctx) => {
    const { userId, deviceId } = req.params;

    // Construct the composite ID using the same format as creation
    const favouriteId = `${userId}:${deviceId}`;

    try {
      // Directly delete using the composite ID
      await container.item(favouriteId, favouriteId).delete();
      return { status: 200, jsonBody: { message: "Favourite removed" } };
    } catch (error: any) {
      if (error.code === 404) {
        return { status: 404, jsonBody: { message: "Favourite not found" } };
      }
      // Handle other errors
      ctx.log("Error removing favourite:", error);
      return {
        status: 500,
        jsonBody: { message: "Internal server error while removing favourite" },
      };
    }
  },
});
