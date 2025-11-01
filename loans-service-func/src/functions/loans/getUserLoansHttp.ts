import { app } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';

const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT || 'https://localhost:8081',
  key: process.env.COSMOS_KEY,
});
const databaseId = process.env.COSMOS_DATABASE || 'loans-db';
const containerId = process.env.COSMOS_CONTAINER || 'Loans';
const container = client.database(databaseId).container(containerId);

app.http('getUserLoansHttp', {
  methods: ['GET'],
  route: 'loans/user/{userId}',
  authLevel: 'anonymous',
  handler: async (req, ctx) => {
    try {
      const raw = req.params.userId ?? '';
      const userId = decodeURIComponent(raw).trim();

      const { resources } = await container.items
        .query({
          query: 'SELECT * FROM c WHERE c.userId = @userId',
          parameters: [{ name: '@userId', value: userId }],
        })
        .fetchAll();

      return { status: 200, jsonBody: resources };
    } catch (error: any) {
      ctx.log('Failed to get loans for user:', error);
      return { status: 500, jsonBody: { message: 'Failed to fetch user loans' } };
    }
  },
});
