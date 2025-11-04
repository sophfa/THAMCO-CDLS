// Azure Function - Get Notifications by User ID HTTP Trigger

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
 * Response format for get notifications by user API
 */
interface GetNotificationsByUserResponse {
  readonly success: boolean;
  readonly data?: Notification[];
  readonly error?: {
    readonly code: string;
    readonly message: string;
  };
}

/**
 * Azure Function to get all notifications for a specific user
 *
 * GET /api/notifications/{userId}
 *
 * Returns all notifications for the specified user ID
 */
export async function getNotificationsByUserHttp(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const userId = request.params.userId;

  context.log(
    `HTTP trigger function processed a request to get notifications for user: ${userId}`
  );

  // Validate user ID parameter
  if (!userId || userId.trim().length === 0) {
    const errorResponse: GetNotificationsByUserResponse = {
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'User ID is required',
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
    // Get notifications from repository
    const repo = getNotificationRepo();
    const result = await repo.getByUserId(userId.trim());

    if (result.success) {
      const response: GetNotificationsByUserResponse = {
        success: true,
        data: result.data,
      };

      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60', // Cache for 1 minute
        },
        body: JSON.stringify(response, null, 2),
      };
    }

    // Handle repository errors
    const error = (result as { success: false; error: any }).error;
    const statusCode = error.code === 'NOT_FOUND' ? 404 : 500;

    const errorResponse: GetNotificationsByUserResponse = {
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
    if (error instanceof MissingCosmosConfigurationError) {
      context.log(
        'Missing Cosmos configuration settings:',
        error.missingSettings.join(', ')
      );

      const errorResponse: GetNotificationsByUserResponse = {
        success: false,
        error: {
          code: 'CONFIGURATION_ERROR',
          message:
            'Cosmos DB configuration is incomplete. Please configure COSMOS_ENDPOINT, COSMOS_DATABASE, COSMOS_CONTAINER, and COSMOS_KEY.',
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

    context.log('Error getting notifications for user:', error);

    const errorResponse: GetNotificationsByUserResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message:
          'An unexpected error occurred while retrieving notifications',
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
app.http('getNotificationsByUserHttp', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'notifications/user/{userId}',
  handler: getNotificationsByUserHttp,
});
