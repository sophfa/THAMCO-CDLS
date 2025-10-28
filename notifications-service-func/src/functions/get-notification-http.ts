// Azure Function - Get Notification by ID HTTP Trigger

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
  databaseId: process.env.COSMOS_DATABASE || 'NotificationsDB',
  containerId: process.env.COSMOS_CONTAINER || 'Notifications',
  key: process.env.COSMOS_KEY,
};

// Initialize repository
const notificationRepo: NotificationRepo = new CosmosNotificationRepo(
  cosmosOptions
);

/**
 * Response format for single notification API
 */
interface GetNotificationResponse {
  readonly success: boolean;
  readonly data?: Notification;
  readonly error?: {
    readonly code: string;
    readonly message: string;
  };
}

/**
 * Azure Function to get a notification by ID
 *
 * GET /api/notifications/{id}
 *
 * Returns a single notification by its ID
 */
export async function getNotificationByIdHttp(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const notificationId = request.params.id;

  context.log(
    `HTTP trigger function processed a request to get notification: ${notificationId}`
  );

  // Validate notification ID parameter
  if (!notificationId || notificationId.trim().length === 0) {
    const errorResponse: GetNotificationResponse = {
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Notification ID is required',
      },
    };

    return {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(errorResponse, null, 2),
    };
  }

  try {
    // Get notification from repository
    const result = await notificationRepo.get(notificationId.trim());

    if (result.success) {
      const response: GetNotificationResponse = {
        success: true,
        data: result.data,
      };

      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        },
        body: JSON.stringify(response, null, 2),
      };
    }

    // Handle repository errors - result.success is false, so error exists
    const error = (result as { success: false; error: any }).error;
    const statusCode = error.code === 'NOT_FOUND' ? 404 : 500;

    const errorResponse: GetNotificationResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    };

    return {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(errorResponse, null, 2),
    };
  } catch (error: any) {
    context.log('Error getting notification:', error);

    const errorResponse: GetNotificationResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message:
          'An unexpected error occurred while retrieving the notification',
      },
    };

    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(errorResponse, null, 2),
    };
  }
}

// Register the function with Azure Functions runtime
app.http('getNotificationById', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'notifications/{id}',
  handler: getNotificationByIdHttp,
});
