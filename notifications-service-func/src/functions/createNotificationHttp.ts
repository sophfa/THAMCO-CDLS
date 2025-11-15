// Azure Function - Create Notification HTTP Trigger

import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { Resend } from "resend";
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
} from "../domain/notification";
import {
  getNotificationRepo,
  MissingCosmosConfigurationError,
} from "../infra/notificationRepoFactory";
import { getUserEmailById } from "../auth0/userDirectory";

// Initialize Resend with API key from environment variables
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

/**
 * Request format for creating notifications
 */
interface CreateNotificationRequest {
  readonly userId: string;
  readonly type:
    | "Waitlist"
    | "Reservation"
    | "Accepted"
    | "Rejected"
    | "Cancelled"
    | "Collected"
    | "Returned"
    | "Custom";
  readonly deviceName?: string;
  readonly collectionDate?: string;
  readonly returnDate?: string;
  readonly reason?: string;
  readonly content?: any;
  readonly numInQueue?: number; //optional for waitlist notifs
  readonly userEmail?: string; // Optional email address for notifications
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getStringField = (source: unknown, key: string): string | undefined => {
  if (!isRecord(source)) {
    return undefined;
  }

  const value = source[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
};

const getNumberField = (source: unknown, key: string): number | undefined => {
  if (!isRecord(source)) {
    return undefined;
  }

  const value = source[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
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
      "RESEND_API_KEY is not configured. Skipping email send for notification:",
      notification.id
    );
    return false;
  }

  try {
    // Generate email content based on notification type and content
    const emailContent = generateEmailContent(notification);

    const emailData = {
      from: process.env.FROM_EMAIL,
      to: userEmail,
      subject: emailContent.subject,
      html: emailContent.html,
    };

    context.log(`Sending email notification to ${userEmail}`, emailData);

    const result = await resend.emails.send(emailData);

    if (result.error) {
      context.log("Failed to send email:", result.error);
      return false;
    }

    context.log("Email sent successfully:", result.data);
    return true;
  } catch (error) {
    context.log("Error sending email:", error);
    return false;
  }
}

/**
 * Generate email content based on notification type and content
 */
function generateEmailContent(notification: Notification): {
  subject: string;
  html: string;
} {
  const notificationType = notification.type;
  const detailHtml = formatPayloadForEmail(notification);

  const baseSubject = `ThAmCo Device Loan - ${notificationType} Notification`;
  let template: EmailTemplate = {
    subject: baseSubject,
    title: "ThAmCo Device Loan Update",
    intro: notification.message,
    detailHeading: "Notification details",
    accent: "#2563eb",
  };

  switch (notificationType) {
    case "Waitlist": {
      const waitlistNotification = notification as Notification<"Waitlist">;
      const position = waitlistNotification.payload.position;
      template = {
        subject: "ThAmCo Device Loan - Waitlist Update",
        title: "You're on the waitlist",
        intro:
          "We're keeping an eye on the device you requested and will keep you up to date.",
        detailHeading: "Request overview",
        accent: "#7c3aed",
        highlight: Number.isFinite(position)
          ? `You're currently <strong>#${position}</strong> in the queue. We'll notify you as soon as the device is available.`
          : "We'll notify you the moment the device becomes available.",
      };
      break;
    }
    case "Reservation": {
      const reservation = notification as Notification<"Reservation">;
      const range = formatDateRange(
        reservation.payload.from,
        reservation.payload.till
      );
      template = {
        subject: "ThAmCo Device Loan - Reservation Created",
        title: "Reservation confirmed",
        intro:
          "Your reservation is in the system and we'll let you know once our team reviews it.",
        detailHeading: "Reservation summary",
        accent: "#2563eb",
        highlight: range
          ? `You're booked for <strong>${range}</strong>.`
          : undefined,
      };
      break;
    }
    case "Accepted": {
      const accepted = notification as Notification<"Accepted">;
      const start = formatFriendlyDateTime(accepted.payload.from);
      template = {
        subject: "ThAmCo Device Loan - Reservation Accepted",
        title: "Reservation accepted",
        intro:
          "Great news! Your reservation has been approved and your device will be ready for pickup.",
        detailHeading: "Approved reservation",
        accent: "#059669",
        highlight: start
          ? `Please be ready to collect your device on <strong>${start}</strong>.`
          : undefined,
      };
      break;
    }
    case "Rejected":
      template = {
        subject: "ThAmCo Device Loan - Reservation Rejected",
        title: "Reservation not approved",
        intro:
          "We're sorry, but this reservation could not be approved. Review the details below and feel free to submit another request.",
        detailHeading: "Request outcome",
        accent: "#dc2626",
        highlight:
          "Need something different? Explore the catalogue to request another device or adjust your dates.",
      };
      break;
    case "Cancelled":
      template = {
        subject: "ThAmCo Device Loan - Reservation Cancelled",
        title: "Reservation cancelled",
        intro:
          "Your reservation has been cancelled. If this was unexpected, please reach out so we can help.",
        detailHeading: "Cancellation details",
        accent: "#d97706",
      };
      break;
    case "Collected": {
      const collected = notification as Notification<"Collected">;
      const returnBy = formatFriendlyDateTime(collected.payload.till);
      template = {
        subject: "ThAmCo Device Loan - Device Collected",
        title: "Device collection confirmed",
        intro: "Thanks for collecting your device. Enjoy your loan period!",
        detailHeading: "Collection details",
        accent: "#1d4ed8",
        highlight: returnBy
          ? `Remember to return the device by <strong>${returnBy}</strong>.`
          : undefined,
      };
      break;
    }
    case "Returned":
      template = {
        subject: "ThAmCo Device Loan - Device Returned",
        title: "Device returned",
        intro: "Thanks for returning your device. We hope it served you well.",
        detailHeading: "Return receipt",
        accent: "#0f9d58",
        highlight:
          "Your loan is now closed. You can make another reservation whenever you need a device.",
      };
      break;
    case "Custom": {
      const custom = notification as Notification<"Custom">;
      const customSubject =
        custom.payload.subject ?? "ThAmCo Device Loan - Notification";
      template = {
        subject: customSubject,
        title: custom.payload.subject ?? "Custom notification",
        intro: custom.payload.message,
        detailHeading: "Message details",
        accent: "#0ea5e9",
      };
      break;
    }
    default:
      template = {
        subject: baseSubject,
        title: "ThAmCo Device Loan update",
        intro: notification.message,
        detailHeading: "Notification details",
        accent: "#2563eb",
      };
  }

  return {
    subject: template.subject,
    html: renderEmailLayout({
      ...template,
      detailHtml,
    }),
  };
}

interface EmailTemplate {
  readonly subject: string;
  readonly title: string;
  readonly intro: string;
  readonly detailHeading: string;
  readonly accent: string;
  readonly highlight?: string;
  readonly footer?: string;
}

interface EmailLayoutConfig extends EmailTemplate {
  readonly detailHtml: string;
}

const renderEmailLayout = ({
  title,
  intro,
  detailHeading,
  detailHtml,
  accent,
  highlight,
  footer,
}: EmailLayoutConfig): string => {
  const brandFont = "'Inter', 'Segoe UI', Arial, sans-serif";
  const highlightBlock = highlight
    ? `<div style="background-color: rgba(15, 23, 42, 0.04); border-left: 4px solid ${accent}; padding: 14px 18px; border-radius: 10px; margin-bottom: 18px; font-size: 15px; line-height: 1.6;">${highlight}</div>`
    : "";

  const footerCopy =
    footer ??
    `Need help? Reply to this email or contact <a style="color: ${accent}; text-decoration: none;" href="mailto:support@campusdeviceloans.co.uk">support@campusdeviceloans.co.uk</a>.`;

  return `
    <div style="background-color:#eef2ff;padding:32px 18px;">
      <div style="max-width:640px;margin:0 auto;background-color:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 22px 45px rgba(15,23,42,0.08);font-family:${brandFont};color:#0f172a;">
        <div style="background:${accent};color:#ffffff;padding:28px 32px;">
          <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.85;">ThAmCo Device Loans</div>
          <h2 style="margin:14px 0 8px;font-size:24px;line-height:1.3;">${title}</h2>
          <p style="margin:0;font-size:15px;line-height:1.6;">${intro}</p>
        </div>
        <div style="padding:32px;">
          ${highlightBlock}
          <p style="margin:0 0 6px;font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;">${detailHeading}</p>
          ${detailHtml}
        </div>
        <div style="border-top:1px solid #e2e8f0;padding:20px 32px;background-color:#f8fafc;color:#475569;font-size:13px;line-height:1.6;">
          ${footerCopy}
          <p style="margin:12px 0 0;font-size:12px;color:#94a3b8;">This message was generated by the ThAmCo Device Loans service.</p>
        </div>
      </div>
    </div>
  `;
};

const formatPayloadForEmail = (notification: Notification): string => {
  const items: string[] = [];

  if (isRecord(notification.payload)) {
    Object.entries(notification.payload).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        return;
      }

      const label = toTitleCase(key);
      items.push(
        `<li><strong>${label}:</strong> ${formatPayloadValue(key, value)}</li>`
      );
    });
  }

  if (items.length === 0) {
    return `<p>${notification.message}</p>`;
  }

  return `<p>${
    notification.message
  }</p><ul style="padding-left:18px;margin:8px 0;">${items.join("")}</ul>`;
};

const formatPayloadValue = (key: string, value: unknown): string => {
  if (typeof value === "string") {
    if (isIsoString(value) && key.toLowerCase().includes("date")) {
      return new Date(value).toLocaleString();
    }
    return value;
  }

  if (typeof value === "number") {
    return value.toString();
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    return value.map((item) => formatPayloadValue(key, item)).join(", ");
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
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());

const formatFriendlyDateTime = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateRange = (
  from?: string | null,
  till?: string | null
): string | null => {
  const start = formatFriendlyDateTime(from);
  const end = formatFriendlyDateTime(till);

  if (start && end) {
    return `${start} &ndash; ${end}`;
  }

  return start ?? end;
};

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
  context.log(
    "HTTP trigger function processed a request to create a notification"
  );

  try {
    // Parse request body
    const requestBody = await request.text();
    if (!requestBody) {
      const errorResponse: CreateNotificationResponse = {
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Request body is required",
        },
      };

      return {
        status: 400,
        headers: { "Content-Type": "application/json" },
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
          code: "INVALID_JSON",
          message: "Invalid JSON in request body",
          details: parseError,
        },
      };

      return {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(errorResponse, null, 2),
      };
    }

    // Validate required fields
    if (!notificationRequest.userId || !notificationRequest.type) {
      const errorResponse: CreateNotificationResponse = {
        success: false,
        error: {
          code: "MISSING_REQUIRED_FIELDS",
          message: "userId and type are required fields",
        },
      };

      return {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(errorResponse, null, 2),
      };
    }

    // Create notification using appropriate factory function
    let notificationResult;

    switch (notificationRequest.type) {
      case "Waitlist":
        if (!notificationRequest.deviceName) {
          const errorResponse: CreateNotificationResponse = {
            success: false,
            error: {
              code: "MISSING_FIELDS",
              message: "deviceName is required for Waitlist notifications",
            },
          };
          return {
            status: 400,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(errorResponse, null, 2),
          };
        }
        const waitlistPayload = {
          deviceName: notificationRequest.deviceName,
          requestedFrom: notificationRequest.collectionDate || "",
          requestedTill: notificationRequest.returnDate || "",
          position:
            notificationRequest.numInQueue ??
            getNumberField(notificationRequest.content, "position") ??
            1,
        };
        notificationResult = createWaitlistNotification({
          userId: notificationRequest.userId,
          payload: waitlistPayload,
        });
        break;

      case "Reservation":
        if (
          !notificationRequest.deviceName ||
          !notificationRequest.collectionDate ||
          !notificationRequest.returnDate
        ) {
          const errorResponse: CreateNotificationResponse = {
            success: false,
            error: {
              code: "MISSING_FIELDS",
              message:
                "deviceName, collectionDate, and returnDate are required for Reservation notifications",
            },
          };
          return {
            status: 400,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(errorResponse, null, 2),
          };
        }
        notificationResult = createReservationNotification({
          userId: notificationRequest.userId,
          payload: {
            deviceName: notificationRequest.deviceName,
            from: notificationRequest.collectionDate,
            till: notificationRequest.returnDate,
            location: getStringField(notificationRequest.content, "location"),
            notes: getStringField(notificationRequest.content, "notes"),
          },
        });
        break;

      case "Accepted":
        if (
          !notificationRequest.deviceName ||
          !notificationRequest.collectionDate ||
          !notificationRequest.returnDate
        ) {
          const errorResponse: CreateNotificationResponse = {
            success: false,
            error: {
              code: "MISSING_FIELDS",
              message:
                "deviceName, collectionDate, and returnDate are required for Accepted notifications",
            },
          };
          return {
            status: 400,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(errorResponse, null, 2),
          };
        }
        notificationResult = createAcceptedNotification({
          userId: notificationRequest.userId,
          payload: {
            deviceName: notificationRequest.deviceName,
            from: notificationRequest.collectionDate,
            till: notificationRequest.returnDate,
            approvedBy: getStringField(
              notificationRequest.content,
              "approvedBy"
            ),
            approvedAt: getStringField(
              notificationRequest.content,
              "approvedAt"
            ),
            location: getStringField(notificationRequest.content, "location"),
            notes: getStringField(notificationRequest.content, "notes"),
          },
        });
        break;

      case "Rejected":
        if (
          !notificationRequest.deviceName ||
          !notificationRequest.reason ||
          !notificationRequest.collectionDate ||
          !notificationRequest.returnDate
        ) {
          const errorResponse: CreateNotificationResponse = {
            success: false,
            error: {
              code: "MISSING_FIELDS",
              message:
                "deviceName, collectionDate, returnDate, and reason are required for Rejected notifications",
            },
          };
          return {
            status: 400,
            headers: { "Content-Type": "application/json" },
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
            location: getStringField(notificationRequest.content, "location"),
            notes: getStringField(notificationRequest.content, "notes"),
          },
        });
        break;

      case "Cancelled":
        if (
          !notificationRequest.deviceName ||
          !notificationRequest.collectionDate
        ) {
          const errorResponse: CreateNotificationResponse = {
            success: false,
            error: {
              code: "MISSING_FIELDS",
              message:
                "deviceName and collectionDate are required for Cancelled notifications",
            },
          };
          return {
            status: 400,
            headers: { "Content-Type": "application/json" },
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
              getStringField(notificationRequest.content, "reason"),
            cancelledBy: getStringField(
              notificationRequest.content,
              "cancelledBy"
            ),
            location: getStringField(notificationRequest.content, "location"),
            notes: getStringField(notificationRequest.content, "notes"),
          },
        });
        break;

      case "Collected":
        if (
          !notificationRequest.deviceName ||
          !notificationRequest.collectionDate ||
          !notificationRequest.returnDate
        ) {
          const errorResponse: CreateNotificationResponse = {
            success: false,
            error: {
              code: "MISSING_FIELDS",
              message:
                "deviceName, collectionDate, and returnDate are required for Collected notifications",
            },
          };
          return {
            status: 400,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(errorResponse, null, 2),
          };
        }
        notificationResult = createCollectedNotification({
          userId: notificationRequest.userId,
          payload: {
            deviceName: notificationRequest.deviceName,
            from: notificationRequest.collectionDate,
            till: notificationRequest.returnDate,
            collectedAt: getStringField(
              notificationRequest.content,
              "collectedAt"
            ),
            location: getStringField(notificationRequest.content, "location"),
            notes: getStringField(notificationRequest.content, "notes"),
          },
        });
        break;

      case "Returned":
        if (
          !notificationRequest.deviceName ||
          !notificationRequest.collectionDate ||
          !notificationRequest.returnDate
        ) {
          const errorResponse: CreateNotificationResponse = {
            success: false,
            error: {
              code: "MISSING_FIELDS",
              message:
                "deviceName, collectionDate, and returnDate are required for Returned notifications",
            },
          };
          return {
            status: 400,
            headers: { "Content-Type": "application/json" },
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
              getStringField(notificationRequest.content, "returnedAt") ||
              notificationRequest.returnDate,
            condition: getStringField(notificationRequest.content, "condition"),
            location: getStringField(notificationRequest.content, "location"),
            notes: getStringField(notificationRequest.content, "notes"),
          },
        });
        break;

      case "Custom":
        if (!notificationRequest.content) {
          const errorResponse: CreateNotificationResponse = {
            success: false,
            error: {
              code: "MISSING_FIELDS",
              message: "content is required for Custom notifications",
            },
          };
          return {
            status: 400,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(errorResponse, null, 2),
          };
        }

        // For custom notifications, create directly with provided content
        const customMessage =
          typeof notificationRequest.content === "string"
            ? notificationRequest.content
            : getStringField(notificationRequest.content, "message") ??
              JSON.stringify(notificationRequest.content);

        const customParams: CreateNotificationParams<"Custom"> = {
          userId: notificationRequest.userId,
          type: "Custom",
          payload: {
            subject: getStringField(notificationRequest.content, "subject"),
            message: customMessage,
            metadata: getMetadataField(notificationRequest.content, "metadata"),
          },
        };
        notificationResult = createNotification(customParams);
        break;

      default:
        const errorResponse: CreateNotificationResponse = {
          success: false,
          error: {
            code: "INVALID_TYPE",
            message: `Invalid notification type: ${notificationRequest.type}. Valid types are: Reservation, Accepted, Rejected, Cancelled, Collected, Returned, Custom`,
          },
        };
        return {
          status: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(errorResponse, null, 2),
        };
    }

    // Check if notification creation was successful
    if (!notificationResult.success) {
      const errorResponse: CreateNotificationResponse = {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Failed to create notification",
          details: notificationResult.errors,
        },
      };

      return {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(errorResponse, null, 2),
      };
    }

    // Save notification to repository
    const repository = getNotificationRepo();
    const saveResult = await repository.create(notificationResult.notification);

    if (!saveResult.success) {
      // TypeScript knows this is the error case, so we can access saveResult.error
      const errorResult = saveResult as { success: false; error: any };
      context.error("Notification creation failed", {
        userId: notificationRequest.userId,
        type: notificationRequest.type,
        error: errorResult.error,
      });
      const errorResponse: CreateNotificationResponse = {
        success: false,
        error: {
          code: errorResult.error.code,
          message: errorResult.error.message,
        },
      };

      const statusCode =
        errorResult.error.code === "ALREADY_EXISTS" ? 409 : 500;

      return {
        status: statusCode,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(errorResponse, null, 2),
      };
    }

    context.log("Notification created successfully", {
      notificationId: saveResult.data.id,
      userId: notificationRequest.userId,
      type: notificationRequest.type,
    });

    // Return success response
    const successResponse: CreateNotificationResponse = {
      success: true,
      data: saveResult.data,
    };

    let resolvedUserEmail = notificationRequest.userEmail;

    if (!resolvedUserEmail) {
      try {
        resolvedUserEmail = await getUserEmailById(
          notificationRequest.userId,
          context
        );
        if (resolvedUserEmail) {
          context.log(
            `Resolved user email via Auth0 for ${notificationRequest.userId}`
          );
        } else {
          context.log(
            `Auth0 did not return an email for user ${notificationRequest.userId}`
          );
        }
      } catch (lookupError) {
        context.error(
          `Failed to resolve email for user ${notificationRequest.userId}`,
          lookupError
        );
      }
    }

    // Send email notification if email address is provided or resolved
    if (resolvedUserEmail) {
      context.log(
        `Attempting to send email notification to ${resolvedUserEmail}`
      );
      const emailSent = await sendEmailNotification(
        saveResult.data,
        resolvedUserEmail,
        context
      );

      if (!emailSent) {
        context.log(
          "Warning: Failed to send email notification, but notification was created successfully"
        );
      } else {
        context.log("Email notification sent successfully");
      }
    } else {
      context.log("No email address provided, skipping email notification");
    }

    return {
      status: 201,
      headers: {
        "Content-Type": "application/json",
        Location: `/api/notifications/${saveResult.data.id}`,
      },
      body: JSON.stringify(successResponse, null, 2),
    };
  } catch (error: any) {
    if (error instanceof MissingCosmosConfigurationError) {
      context.log(
        "Missing Cosmos configuration settings:",
        error.missingSettings.join(", ")
      );

      const errorResponse: CreateNotificationResponse = {
        success: false,
        error: {
          code: "CONFIGURATION_ERROR",
          message:
            "Cosmos DB configuration is incomplete. Please configure COSMOS_ENDPOINT, COSMOS_DATABASE, COSMOS_CONTAINER, and COSMOS_KEY.",
          details: error.missingSettings,
        },
      };

      return {
        status: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(errorResponse, null, 2),
      };
    }

    context.log("Error creating notification:", error);

    const errorResponse: CreateNotificationResponse = {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while creating the notification",
      },
    };

    return {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(errorResponse, null, 2),
    };
  }
}

// Register the function with Azure Functions runtime
app.http("createNotification", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "notifications",
  handler: createNotificationHttp,
});
