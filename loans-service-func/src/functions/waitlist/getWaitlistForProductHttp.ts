import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';

const isLocal =
  (process.env.AZURE_FUNCTIONS_ENVIRONMENT || '').toLowerCase() ===
    'development' || (process.env.NODE_ENV || '').toLowerCase() === 'development';

const client = isLocal && process.env.COSMOS_KEY
  ? new CosmosClient({
      endpoint: process.env.COSMOS_ENDPOINT!,
      key: process.env.COSMOS_KEY!,
    })
  : new CosmosClient({
      endpoint: process.env.COSMOS_ENDPOINT!,
      aadCredentials: new DefaultAzureCredential(),
    });
const container = client
  .database(process.env.COSMOS_DATABASE!)
  .container(process.env.COSMOS_CONTAINER!);

export async function getWaitlistForProductHttp(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const correlationId =
    req.headers.get("x-correlation-id")?.trim() ||
    context.invocationId ||
    "unknown";
  const baseLog = { correlationId, service: "loans-service-func" };

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
    context.log({
      ...baseLog,
      message: "Error getting waitlist for product",
      error: error?.message ?? String(error),
    });
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
