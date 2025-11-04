// Azure Function - List Notifications HTTP Trigger

import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { Notification } from '../domain/notification';
import {
  getNotificationRepo,
  MissingCosmosConfigurationError,
} from '../infra/notificationRepoFactory';

/**
 * Response format for notification list API
 */
interface ListNotificationsResponse {
  readonly success: boolean;
  readonly data?: Notification[];
  readonly error?: {
    readonly code: string;
    readonly message: string;
  };
  readonly metadata?: {
    readonly count: number;
    readonly timestamp: string;
  };
}

/**
 * Azure Function to list all notifications
 *
 * GET /api/notifications
 *
 * Returns a list of all notifications in the system
 */
export async function listNotificationsHttp(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(
    'HTTP trigger function processed a request to list notifications'
  );

  try {
    const repo = getNotificationRepo();
    const result = await repo.list();

    if (!result.success) {
      throw new Error(
        (result as any).error?.message || 'Failed to fetch notifications'
      );
    }

    if (!result.data) {
      throw new Error('No data returned from repository');
    }

    const response: ListNotificationsResponse = {
      success: true,
      data: result.data,
      metadata: {
        count: result.data.length,
        timestamp: new Date().toISOString(),
      },
    };

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify(response, null, 2),
    };
  } catch (error: any) {
    if (error instanceof MissingCosmosConfigurationError) {
      context.log(
        'Missing Cosmos configuration settings:',
        error.missingSettings.join(', ')
      );
      const errorResponse: ListNotificationsResponse = {
        success: false,
        error: {
          code: 'CONFIGURATION_ERROR',
          message:
            'Cosmos DB configuration is incomplete. Please configure COSMOS_ENDPOINT, COSMOS_DATABASE, COSMOS_CONTAINER, and COSMOS_KEY.',
        },
      };
      return {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorResponse, null, 2),
      };
    }

    context.log('Error listing notifications:', error);
    const errorResponse: ListNotificationsResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while listing notifications',
      },
    };
    return {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorResponse, null, 2),
    };
  }
}

// Register the function with Azure Functions runtime
app.http('listNotifications', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'notifications',
  handler: listNotificationsHttp,
});
