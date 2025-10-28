import { app } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';

const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  key: process.env.COSMOS_KEY!,
});
const container = client
  .database(process.env.COSMOS_DATABASE!)
  .container('Favourites');

app.http('removeFavouriteHttp', {
  methods: ['DELETE'],
  route: 'loans/user/{userId}/favorites/{deviceId}',
  authLevel: 'anonymous',
  handler: async (req, ctx) => {
    const { userId, deviceId } = req.params;
    const query = {
      query:
        'SELECT * FROM c WHERE c.userId = @userId AND c.deviceId = @deviceId',
      parameters: [
        { name: '@userId', value: userId },
        { name: '@deviceId', value: deviceId },
      ],
    };
    const { resources } = await container.items.query(query).fetchAll();
    if (resources.length === 0) {
      return { status: 404, jsonBody: { message: 'Favourite not found' } };
    }
    await container.item(resources[0].id, resources[0].id).delete();
    return { status: 200, jsonBody: { message: 'Favourite removed' } };
  },
});
