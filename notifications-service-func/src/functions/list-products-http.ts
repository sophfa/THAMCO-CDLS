// Azure Function - List Notifications HTTP Trigger

import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { Notification } from '../domain/notification';
import { NotificationRepo } from '../domain/notification-repo';
import { CosmosNotificationRepo } from '../infra/cosmos-notification-repo';

// Configuration from environment variables
const cosmosOptions = {
  endpoint: process.env.COSMOS_ENDPOINT || 'https://localhost:8081',
  databaseId: process.env.COSMOS_DATABASE || 'notifications-db',
  containerId: process.env.COSMOS_CONTAINER || 'Notifications',

  key: process.env.COSMOS_KEY,
};

// Initialize repository - in notificationion, this could be dependency injected
const notificationRepo: NotificationRepo = new CosmosNotificationRepo(
  cosmosOptions
);

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
    const result = await notificationRepo.list();

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
