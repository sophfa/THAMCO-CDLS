// Azure Function - Create Notification HTTP Trigger
//
// Required Environment Variables:
// - COSMOS_ENDPOINT: Azure Cosmos DB endpoint URL
// - COSMOS_DATABASE: Cosmos DB database name
// - COSMOS_CONTAINER: Cosmos DB container name  
// - COSMOS_KEY: Cosmos DB access key
// - RESEND_API_KEY: Resend API key for sending emails (optional, defaults to provided key)
// - FROM_EMAIL: Email address to send from (optional, defaults to onboarding@resend.dev)

import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { Resend } from 'resend';
import {
  Notification,
  createWaitlistNotification,
  createReservationNotification,
  createAcceptedNotification,
  createRejectedNotification,
  createCancelledNotification,
  createCollectedNotification,
  createReturnedNotification,
  createNotification,
  CreateNotificationParams,
} from '../domain/notification';
import {
  getNotificationRepo,
  MissingCosmosConfigurationError,
} from '../infra/notificationRepoFactory';

// Initialize Resend with API key from environment variables
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

/**
 * Request format for creating notifications
 */
interface CreateNotificationRequest {
  readonly userId: string;
  readonly type: 'Waitlist' | 'Reservation' | 'Accepted' | 'Rejected' | 'Cancelled' | 'Collected' | 'Returned' | 'Custom';
  readonly deviceName?: string;
  readonly collectionDate?: string;
  readonly returnDate?: string;
  readonly reason?: string;
  readonly content?: any;
  readonly numInQueue?: number; //optional for waitlist notifs
  readonly userEmail?: string; // Optional email address for notifications
}

const DEFAULT_FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getStringField = (
  source: unknown,
  key: string
): string | undefined => {
  if (!isRecord(source)) {
    return undefined;
  }

  const value = source[key];
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined;
};

const getNumberField = (
  source: unknown,
  key: string
): number | undefined => {
  if (!isRecord(source)) {
    return undefined;
  }

  const value = source[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
};

const getMetadataField = (
  source: unknown,
  key: string
): Record<string, unknown> | undefined => {
  if (!isRecord(source)) {
    return undefined;
  }

  const value = source[key];
  return isRecord(value) ? value : undefined;
};

const ensureDateProvided = (value: string | undefined): string | null => {
  if (!value || value.trim().length === 0) {
    return null;
  }

  return value.trim();
};

/**
 * Response format for create notification API
 */
interface CreateNotificationResponse {
  readonly success: boolean;
  readonly data?: Notification;
  readonly error?: {
    readonly code: string;
    readonly message: string;
    readonly details?: any;
  };
}

/**
 * Helper function to send email notification using Resend
 */
async function sendEmailNotification(
  notification: Notification,
  userEmail: string,
  context: InvocationContext
): Promise<boolean> {
  if (!resend) {
    context.log(
      'RESEND_API_KEY is not configured. Skipping email send for notification:',
      notification.id
    );
    return false;
  }

  try {
    // Generate email content based on notification type and content
    const emailContent = generateEmailContent(notification);
    
    const emailData = {
      from: DEFAULT_FROM_EMAIL,
      to: userEmail,
      subject: emailContent.subject,
      html: emailContent.html
    };

    context.log(`Sending email notification to ${userEmail}`, emailData);

    const result = await resend.emails.send(emailData);
    
    if (result.error) {
      context.log('Failed to send email:', result.error);
      return false;
    }

    context.log('Email sent successfully:', result.data);
    return true;
  } catch (error) {
    context.log('Error sending email:', error);
    return false;
  }
}

/**
 * Generate email content based on notification type and content
 */
function generateEmailContent(notification: Notification): { subject: string; html: string } {
  const notificationType = notification.type;
  let subject = `ThAmCo Device Loan - ${notificationType} Notification`;
  let html = '';

  const detailHtml = formatPayloadForEmail(notification);

  switch (notificationType) {
    case 'Waitlist':
      subject = 'ThAmCo Device Loan - Added to Waitlist';
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6366f1;">You're on the Waitlist! 📋</h2>
          <p>You have been added to the waitlist for the requested device.</p>
          <div style="background-color: #f0f9ff; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #6366f1;">
            <p><strong>Details:</strong></p>
            ${detailHtml}
          </div>
          <p>We'll notify you as soon as the device becomes available.</p>
          <p>Best regards,<br>ThAmCo Device Loan Team</p>
        </div>
      `;
      break;

    case 'Reservation':
      subject = 'ThAmCo Device Loan - Reservation Created';
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Device Reservation Confirmation</h2>
          <p>Your device reservation has been successfully created!</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Details:</strong></p>
            ${detailHtml}
          </div>
          <p>You will receive another notification when your reservation is reviewed by our team.</p>
          <p>Best regards,<br>ThAmCo Device Loan Team</p>
        </div>
      `;
      break;

    case 'Accepted':
      subject = 'ThAmCo Device Loan - Reservation Accepted';
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">Reservation Accepted! 🎉</h2>
          <p>Great news! Your device reservation has been accepted.</p>
          <div style="background-color: #ecfdf5; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #059669;">
            <p><strong>Details:</strong></p>
            ${detailHtml}
          </div>
          <p>Please remember to collect your device on the specified date.</p>
          <p>Best regards,<br>ThAmCo Device Loan Team</p>
        </div>
      `;
      break;

    case 'Rejected':
      subject = 'ThAmCo Device Loan - Reservation Rejected';
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Reservation Status Update</h2>
          <p>We regret to inform you that your device reservation could not be approved.</p>
          <div style="background-color: #fef2f2; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #dc2626;">
            <p><strong>Details:</strong></p>
            ${detailHtml}
          </div>
          <p>You're welcome to submit a new reservation request with different dates or devices.</p>
          <p>Best regards,<br>ThAmCo Device Loan Team</p>
        </div>
      `;
      break;

    case 'Cancelled':
      subject = 'ThAmCo Device Loan - Reservation Cancelled';
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #d97706;">Reservation Cancelled</h2>
          <p>Your device reservation has been cancelled.</p>
          <div style="background-color: #fffbeb; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #d97706;">
            <p><strong>Details:</strong></p>
            ${detailHtml}
          </div>
          <p>If you need to make a new reservation, please feel free to submit a new request.</p>
          <p>Best regards,<br>ThAmCo Device Loan Team</p>
        </div>
      `;
      break;

    case 'Collected':
      subject = 'ThAmCo Device Loan - Device Collected';
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Device Collection Confirmed</h2>
          <p>Thank you for collecting your device!</p>
          <div style="background-color: #eff6ff; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #2563eb;">
            <p><strong>Details:</strong></p>
            ${detailHtml}
          </div>
          <p><strong>Important:</strong> Please remember to return the device by the specified date to avoid any late fees.</p>
          <p>Best regards,<br>ThAmCo Device Loan Team</p>
        </div>
      `;
      break;

    case 'Returned':
      subject = 'ThAmCo Device Loan - Device Returned';
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">Device Return Confirmed ✅</h2>
          <p>Thank you for returning your device on time!</p>
          <div style="background-color: #ecfdf5; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #059669;">
            <p><strong>Details:</strong></p>
            ${detailHtml}
          </div>
          <p>Your loan has been completed successfully. We hope the device served you well!</p>
          <p>Best regards,<br>ThAmCo Device Loan Team</p>
        </div>
      `;
      break;

    default:
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #374151;">ThAmCo Device Loan Notification</h2>
          <p>You have received a new notification:</p>
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 15px 0;">
            ${detailHtml}
          </div>
          <p>Best regards,<br>ThAmCo Device Loan Team</p>
        </div>
      `;
  }

  return { subject, html };
}

const formatPayloadForEmail = (notification: Notification): string => {
  const items: string[] = [];

  if (isRecord(notification.payload)) {
    Object.entries(notification.payload).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }

      const label = toTitleCase(key);
      items.push(`<li><strong>${label}:</strong> ${formatPayloadValue(key, value)}</li>`);
    });
  }

  if (items.length === 0) {
    return `<p>${notification.message}</p>`;
  }

  return `<p>${notification.message}</p><ul style="padding-left:18px;margin:8px 0;">${items.join(
    ''
  )}</ul>`;
};

const formatPayloadValue = (key: string, value: unknown): string => {
  if (typeof value === 'string') {
    if (isIsoString(value) && key.toLowerCase().includes('date')) {
      return new Date(value).toLocaleString();
    }
    return value;
  }

  if (typeof value === 'number') {
    return value.toString();
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (Array.isArray(value)) {
    return value.map((item) => formatPayloadValue(key, item)).join(', ');
  }

  if (isRecord(value)) {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
};

const isIsoString = (value: string): boolean => {
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
};

const toTitleCase = (input: string): string =>
  input
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (char) => char.toUpperCase());

/**
 * Azure Function to create a new notification
 *
 * POST /api/notifications
 *
 * Creates a new notification based on the provided data
 */
export async function createNotificationHttp(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('HTTP trigger function processed a request to create a notification');

  try {
    // Parse request body
    const requestBody = await request.text();
    if (!requestBody) {
      const errorResponse: CreateNotificationResponse = {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Request body is required',
        },
      };

      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorResponse, null, 2),
      };
    }

    let notificationRequest: CreateNotificationRequest;
    try {
      notificationRequest = JSON.parse(requestBody);
    } catch (parseError) {
      const errorResponse: CreateNotificationResponse = {
        success: false,
        error: {
          code: 'INVALID_JSON',
          message: 'Invalid JSON in request body',
          details: parseError,
        },
      };

      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorResponse, null, 2),
      };
    }

    // Validate required fields
    if (!notificationRequest.userId || !notificationRequest.type) {
      const errorResponse: CreateNotificationResponse = {
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'userId and type are required fields',
        },
      };

      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorResponse, null, 2),
      };
    }

    // Create notification using appropriate factory function
    let notificationResult;
    
    switch (notificationRequest.type) {
      case 'Waitlist':
        if (!notificationRequest.deviceName) {
          const errorResponse: CreateNotificationResponse = {
            success: false,
            error: {
              code: 'MISSING_FIELDS',
              message: 'deviceName is required for Waitlist notifications',
            },
          };
          return {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(errorResponse, null, 2),
          };
        }
        const waitlistPayload = {
          deviceName: notificationRequest.deviceName,
          requestedFrom: notificationRequest.collectionDate || '',
          requestedTill: notificationRequest.returnDate || '',
          position:
            notificationRequest.numInQueue ??
            getNumberField(notificationRequest.content, 'position') ??
            1,
        };
        notificationResult = createWaitlistNotification({
          userId: notificationRequest.userId,
          payload: waitlistPayload,
        });
        break;

      case 'Reservation':
        if (
          !notificationRequest.deviceName ||
          !notificationRequest.collectionDate ||
          !notificationRequest.returnDate
        ) {
          const errorResponse: CreateNotificationResponse = {
            success: false,
            error: {
              code: 'MISSING_FIELDS',
              message:
                'deviceName, collectionDate, and returnDate are required for Reservation notifications',
            },
          };
          return {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(errorResponse, null, 2),
          };
        }
        notificationResult = createReservationNotification({
          userId: notificationRequest.userId,
          payload: {
            deviceName: notificationRequest.deviceName,
            from: notificationRequest.collectionDate,
            till: notificationRequest.returnDate,
            location: getStringField(notificationRequest.content, 'location'),
            notes: getStringField(notificationRequest.content, 'notes'),
          }
        });
        break;

      case 'Accepted':
        if (
          !notificationRequest.deviceName ||
          !notificationRequest.collectionDate ||
          !notificationRequest.returnDate
        ) {
          const errorResponse: CreateNotificationResponse = {
            success: false,
            error: {
              code: 'MISSING_FIELDS',
              message:
                'deviceName, collectionDate, and returnDate are required for Accepted notifications',
            },
          };
          return {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(errorResponse, null, 2),
          };
        }
        notificationResult = createAcceptedNotification({
          userId: notificationRequest.userId,
          payload: {
            deviceName: notificationRequest.deviceName,
            from: notificationRequest.collectionDate,
            till: notificationRequest.returnDate,
            approvedBy: getStringField(notificationRequest.content, 'approvedBy'),
            approvedAt: getStringField(notificationRequest.content, 'approvedAt'),
            location: getStringField(notificationRequest.content, 'location'),
            notes: getStringField(notificationRequest.content, 'notes'),
          }
        });
        break;

      case 'Rejected':
        if (
          !notificationRequest.deviceName ||
          !notificationRequest.reason ||
          !notificationRequest.collectionDate ||
          !notificationRequest.returnDate
        ) {
          const errorResponse: CreateNotificationResponse = {
            success: false,
            error: {
              code: 'MISSING_FIELDS',
              message:
                'deviceName, collectionDate, returnDate, and reason are required for Rejected notifications',
            },
          };
          return {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(errorResponse, null, 2),
          };
        }
        notificationResult = createRejectedNotification({
          userId: notificationRequest.userId,
          payload: {
            deviceName: notificationRequest.deviceName,
            from: notificationRequest.collectionDate,
            till: notificationRequest.returnDate,
            reason: notificationRequest.reason,
            location: getStringField(notificationRequest.content, 'location'),
            notes: getStringField(notificationRequest.content, 'notes'),
          }
        });
        break;

      case 'Cancelled':
        if (!notificationRequest.deviceName || !notificationRequest.collectionDate) {
          const errorResponse: CreateNotificationResponse = {
            success: false,
            error: {
              code: 'MISSING_FIELDS',
              message:
                'deviceName and collectionDate are required for Cancelled notifications',
            },
          };
          return {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(errorResponse, null, 2),
          };
        }
        notificationResult = createCancelledNotification({
          userId: notificationRequest.userId,
          payload: {
            deviceName: notificationRequest.deviceName,
            from: notificationRequest.collectionDate,
            till:
              ensureDateProvided(notificationRequest.returnDate) ??
              notificationRequest.collectionDate,
            reason:
              notificationRequest.reason ??
              getStringField(notificationRequest.content, 'reason'),
            cancelledBy: getStringField(notificationRequest.content, 'cancelledBy'),
            location: getStringField(notificationRequest.content, 'location'),
            notes: getStringField(notificationRequest.content, 'notes'),
          }
        });
        break;

      case 'Collected':
        if (
          !notificationRequest.deviceName ||
          !notificationRequest.collectionDate ||
          !notificationRequest.returnDate
        ) {
          const errorResponse: CreateNotificationResponse = {
            success: false,
            error: {
              code: 'MISSING_FIELDS',
              message:
                'deviceName, collectionDate, and returnDate are required for Collected notifications',
            },
          };
          return {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(errorResponse, null, 2),
          };
        }
        notificationResult = createCollectedNotification({
          userId: notificationRequest.userId,
          payload: {
            deviceName: notificationRequest.deviceName,
            from: notificationRequest.collectionDate,
            till: notificationRequest.returnDate,
            collectedAt: getStringField(notificationRequest.content, 'collectedAt'),
            location: getStringField(notificationRequest.content, 'location'),
            notes: getStringField(notificationRequest.content, 'notes'),
          }
        });
        break;

      case 'Returned':
        if (
          !notificationRequest.deviceName ||
          !notificationRequest.collectionDate ||
          !notificationRequest.returnDate
        ) {
          const errorResponse: CreateNotificationResponse = {
            success: false,
            error: {
              code: 'MISSING_FIELDS',
              message:
                'deviceName, collectionDate, and returnDate are required for Returned notifications',
            },
          };
          return {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(errorResponse, null, 2),
          };
        }
        notificationResult = createReturnedNotification({
          userId: notificationRequest.userId,
          payload: {
            deviceName: notificationRequest.deviceName,
            from: notificationRequest.collectionDate,
            till: notificationRequest.returnDate,
            returnedAt:
              getStringField(notificationRequest.content, 'returnedAt') ||
              notificationRequest.returnDate,
            condition: getStringField(notificationRequest.content, 'condition'),
            location: getStringField(notificationRequest.content, 'location'),
            notes: getStringField(notificationRequest.content, 'notes'),
          }
        });
        break;

      case 'Custom':
        if (!notificationRequest.content) {
          const errorResponse: CreateNotificationResponse = {
            success: false,
            error: {
              code: 'MISSING_FIELDS',
              message: 'content is required for Custom notifications',
            },
          };
          return {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(errorResponse, null, 2),
          };
        }
        
        // For custom notifications, create directly with provided content
        const customMessage =
          typeof notificationRequest.content === 'string'
            ? notificationRequest.content
            : getStringField(notificationRequest.content, 'message') ??
              JSON.stringify(notificationRequest.content);

        const customParams: CreateNotificationParams<'Custom'> = {
          userId: notificationRequest.userId,
          type: 'Custom',
          payload: {
            subject: getStringField(notificationRequest.content, 'subject'),
            message: customMessage,
            metadata: getMetadataField(notificationRequest.content, 'metadata'),
          },
        };
        notificationResult = createNotification(customParams);
        break;

      default:
        const errorResponse: CreateNotificationResponse = {
          success: false,
          error: {
            code: 'INVALID_TYPE',
            message: `Invalid notification type: ${notificationRequest.type}. Valid types are: Reservation, Accepted, Rejected, Cancelled, Collected, Returned, Custom`,
          },
        };
        return {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(errorResponse, null, 2),
        };
    }

    // Check if notification creation was successful
    if (!notificationResult.success) {
      const errorResponse: CreateNotificationResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Failed to create notification',
          details: notificationResult.errors,
        },
      };

      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorResponse, null, 2),
      };
    }

    // Save notification to repository
    const repository = getNotificationRepo();
    const saveResult = await repository.create(
      notificationResult.notification
    );

    if (!saveResult.success) {
      // TypeScript knows this is the error case, so we can access saveResult.error
      const errorResult = saveResult as { success: false; error: any };
      const errorResponse: CreateNotificationResponse = {
        success: false,
        error: {
          code: errorResult.error.code,
          message: errorResult.error.message,
        },
      };

      const statusCode = errorResult.error.code === 'ALREADY_EXISTS' ? 409 : 500;

      return {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorResponse, null, 2),
      };
    }

    // Return success response
    const successResponse: CreateNotificationResponse = {
      success: true,
      data: saveResult.data,
    };

    // Send email notification if email address is provided
    if (notificationRequest.userEmail) {
      context.log(`Attempting to send email notification to ${notificationRequest.userEmail}`);
      const emailSent = await sendEmailNotification(
        saveResult.data,
        notificationRequest.userEmail,
        context
      );
      
      if (!emailSent) {
        context.log('Warning: Failed to send email notification, but notification was created successfully');
      } else {
        context.log('Email notification sent successfully');
      }
    } else {
      context.log('No email address provided, skipping email notification');
    }

    return {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Location': `/api/notifications/${saveResult.data.id}`,
      },
      body: JSON.stringify(successResponse, null, 2),
    };

  } catch (error: any) {
    if (error instanceof MissingCosmosConfigurationError) {
      context.log(
        'Missing Cosmos configuration settings:',
        error.missingSettings.join(', ')
      );

      const errorResponse: CreateNotificationResponse = {
        success: false,
        error: {
          code: 'CONFIGURATION_ERROR',
          message:
            'Cosmos DB configuration is incomplete. Please configure COSMOS_ENDPOINT, COSMOS_DATABASE, COSMOS_CONTAINER, and COSMOS_KEY.',
          details: error.missingSettings,
        },
      };

      return {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorResponse, null, 2),
      };
    }

    context.log('Error creating notification:', error);

    const errorResponse: CreateNotificationResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while creating the notification',
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
app.http('createNotification', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'notifications',
  handler: createNotificationHttp,
});
