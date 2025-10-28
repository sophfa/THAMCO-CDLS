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

app.http('addFavouriteHttp', {
  methods: ['POST', 'OPTIONS'],
  route: 'loans/user/{userId}/favorites/{deviceId}',
  authLevel: 'anonymous',
  handler: async (req, ctx) => {
    // ✅ Handle CORS preflight (OPTIONS) requests
    if (req.method === 'OPTIONS') {
      return {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': 'http://localhost:5173',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      };
    }

    try {
      const { userId, deviceId } = req.params;

      if (!userId || !deviceId) {
        return {
          status: 400,
          headers: { 'Access-Control-Allow-Origin': 'http://localhost:5173' },
          jsonBody: { error: 'Missing userId or deviceId in route.' },
        };
      }

      const item = {
        id: `FAV-${uuidv4()}`,
        userId,
        deviceId,
        createdAt: new Date().toISOString(),
      };

      await container.items.create(item);

      return {
        status: 201,
        headers: {
          'Access-Control-Allow-Origin': 'http://localhost:5173',
        },
        jsonBody: item,
      };
    } catch (error: any) {
      ctx.error(`Failed to add favourite: ${error.message}`);

      return {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': 'http://localhost:5173' },
        jsonBody: { error: 'Failed to add favourite.' },
      };
    }
  },
});
