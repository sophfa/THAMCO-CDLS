import { app } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
const { v4: uuidv4 } = require('uuid');

const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  key: process.env.COSMOS_KEY!,
});
const container = client
  .database(process.env.COSMOS_DATABASE!)
  .container('Favourites');

app.http('syncFavouritesHttp', {
  methods: ['PUT'],
  route: 'loans/user/{userId}/favorites',
  authLevel: 'anonymous',
  handler: async (req, ctx) => {
    const { userId } = req.params;
    const body = (await req.json()) as { favorites: string[] };
    const { favorites } = body;

    // Delete existing
    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.userId = @userId',
        parameters: [{ name: '@userId', value: userId }],
      })
      .fetchAll();
    for (const fav of resources) {
      await container.item(fav.id, fav.id).delete();
    }

    // Add new
    const newItems = favorites.map((deviceId: string) => ({
      id: `FAV-${uuidv4()}`,
      userId,
      deviceId,
      createdAt: new Date().toISOString(),
    }));
    for (const item of newItems) {
      await container.items.create(item);
    }

    return { status: 200, jsonBody: newItems };
  },
});
