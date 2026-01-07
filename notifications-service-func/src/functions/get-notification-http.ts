// Azure Function - Get Notification by ID HTTP Trigger

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
import { validateToken, isAdminOrOwner } from '../utils/auth';

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
  const auth = await validateToken(request, context);
  if (!auth.isValid || !auth.userId) {
    return {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Unauthorized' },
      }),
    };
  }
  const notificationId = request.params.id;
  const correlationId =
    request.headers.get("x-correlation-id")?.trim() ||
    context.invocationId ||
    "unknown";
  const baseLog = { correlationId, service: "notifications-service-func" };

  context.log({
    ...baseLog,
    message: "HTTP trigger function processed a request to get notification",
    notificationId,
  });

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
    const repo = getNotificationRepo();
    const result = await repo.get(notificationId.trim());

    if (result.success) {
      if (!result.data || !isAdminOrOwner(auth, result.data.userId ?? "")) {
        return {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Forbidden' },
          }),
        };
      }
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
    if (error instanceof MissingCosmosConfigurationError) {
      context.log({
        ...baseLog,
        message: "Missing Cosmos configuration settings",
        missingSettings: error.missingSettings,
      });

      const errorResponse: GetNotificationResponse = {
        success: false,
        error: {
          code: 'CONFIGURATION_ERROR',
          message:
            'Cosmos DB configuration is incomplete. Please configure COSMOS_ENDPOINT, COSMOS_DATABASE, and COSMOS_CONTAINER.',
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

    context.log({
      ...baseLog,
      message: "Error getting notification",
      error: error?.message ?? String(error),
    });

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
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'notifications/{id}',
  handler: getNotificationByIdHttp,
});
