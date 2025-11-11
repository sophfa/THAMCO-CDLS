import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';

const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  key: process.env.COSMOS_KEY!,
});
const container = client
  .database(process.env.COSMOS_DATABASE!)
  .container(process.env.COSMOS_CONTAINER!);

export async function getWaitlistForProductHttp(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const deviceId = req.params.deviceId;

    if (!deviceId || deviceId.trim().length === 0) {
      return {
        status: 400,
        jsonBody: {
          error: 'BAD_REQUEST',
          message: 'deviceId is required and cannot be empty',
        },
      };
    }

    // Query for loan record with this deviceId
    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.deviceId = @deviceId',
        parameters: [{ name: '@deviceId', value: deviceId.trim() }],
      })
      .fetchAll();

    if (!resources || resources.length === 0) {
      return {
        status: 404,
        jsonBody: {
          error: 'NOT_FOUND',
          message: `No loan found for device '${deviceId}'`,
        },
      };
    }

    const loan = resources[0];
    const waitlist = loan.waitlist || [];

    return {
      status: 200,
      jsonBody: {
        deviceId: loan.deviceId,
        loanId: loan.id,
        waitlist: waitlist,
        waitlistCount: waitlist.length,
      },
    };
  } catch (error: any) {
    context.log('Error getting waitlist for product:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while fetching waitlist',
      },
    };
  }
}

app.http('getWaitlistForProduct', {
  methods: ['GET'],
  route: 'loans/device/{deviceId}/waitlist',
  authLevel: 'anonymous',
  handler: getWaitlistForProductHttp,
});
