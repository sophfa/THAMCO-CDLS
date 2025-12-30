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
import { validateToken } from "../utils/auth";

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
  const correlationHeader =
    typeof request.headers?.get === "function"
      ? request.headers.get("x-correlation-id")
      : Object.entries(request.headers ?? {}).find(
          ([key]) => key.toLowerCase() === "x-correlation-id"
        )?.[1];
  const correlationId =
    correlationHeader?.trim() ||
    context.invocationId ||
    "unknown";
  const baseLog = { correlationId, service: "notifications-service-func" };

  const auth = await validateToken(request, context);
  if (!auth.isValid || !auth.userId) {
    return {
      status: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: "Unauthorized" }),
    };
  }

  const userId = request.params.userId;

  context.log({
    ...baseLog,
    message:
      "HTTP trigger function processed a request to get notifications for user",
    userId,
  });

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
          'Cache-Control': 'no-store',
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
      context.log({
        ...baseLog,
        message: "Missing Cosmos configuration settings",
        missingSettings: error.missingSettings,
      });

      const errorResponse: GetNotificationsByUserResponse = {
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
      message: "Error getting notifications for user",
      error: error?.message ?? String(error),
    });

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
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'notifications/user/{userId}',
  handler: getNotificationsByUserHttp,
});
