import { app } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';

const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  key: process.env.COSMOS_KEY!,
});
const container = client
  .database(process.env.COSMOS_DATABASE!)
  .container('Favourites');

app.http('clearFavouritesHttp', {
  methods: ['DELETE'],
  route: 'loans/user/{userId}/favorites',
  authLevel: 'anonymous',
  handler: async (req, ctx) => {
    const { userId } = req.params;
    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.userId = @userId',
        parameters: [{ name: '@userId', value: userId }],
      })
      .fetchAll();
    for (const fav of resources) {
      await container.item(fav.id, fav.id).delete();
    }
    return { status: 200, jsonBody: { message: 'All favourites cleared' } };
  },
});
