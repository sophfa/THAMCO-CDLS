import { app, EventGridEvent, InvocationContext } from "@azure/functions";
import {
  createNotification,
  Notification,
  NotificationType,
} from "../domain/notification";
import { getNotificationRepo } from "../infra/notificationRepoFactory";
import { signalROutput } from "./createNotificationHttp";
import {
  EmailQueueMessage,
  emailQueueOutput,
} from "../queues/emailQueue";

type LoanStatus =
  | "Requested"
  | "Approved"
  | "Rejected"
  | "Cancelled"
  | "Collected"
  | "Returned"
  | string;

interface LoanStatusChangedEventData {
  loanId: string;
  deviceId: string;
  userId: string;
  from: string;
  till: string;
  previousStatus: LoanStatus;
  newStatus: LoanStatus;
  statusChangedAt?: string;
  collectedAt?: string;
  returnedAt?: string;
  reason?: string;
  waitlist?: string[];
}

const STATUS_TO_NOTIFICATION: Partial<
  Record<LoanStatus, NotificationType>
> = {
  Requested: "Reservation",
  Approved: "Accepted",
  Rejected: "Rejected",
  Cancelled: "Cancelled",
  Collected: "Collected",
  Returned: "Returned",
};

const WAITLIST_AVAILABLE_STATUSES = new Set<LoanStatus>([
  "Returned",
  "Cancelled",
  "Rejected",
]);

const toUniqueUserIds = (waitlist: unknown): string[] => {
  if (!Array.isArray(waitlist)) return [];
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const entry of waitlist) {
    if (typeof entry !== "string") continue;
    const trimmed = entry.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    unique.push(trimmed);
  }
  return unique;
};

function buildPayload(
  type: NotificationType,
  data: LoanStatusChangedEventData
): any {
  const base = {
    deviceName: data.deviceId,
    from: data.from,
    till: data.till,
  };

  switch (type) {
    case "Reservation":
      return base;
    case "Accepted":
      return {
        ...base,
        approvedAt: data.statusChangedAt,
      };
    case "Rejected":
      return {
        ...base,
        reason: data.reason ?? "Loan request was rejected.",
      };
    case "Cancelled":
      return {
        ...base,
        reason: data.reason,
      };
    case "Collected":
      return {
        ...base,
        collectedAt: data.collectedAt ?? data.statusChangedAt,
      };
    case "Returned":
      return {
        ...base,
        returnedAt: data.returnedAt ?? data.statusChangedAt,
      };
    default:
      return {
        subject: "Loan update",
        message: `Loan ${data.loanId} changed to ${data.newStatus}`,
      };
  }
}

export async function handleLoanStatusEvent(
  event: EventGridEvent,
  context: InvocationContext
): Promise<void> {
  const data = event.data
    ? (event.data as unknown as LoanStatusChangedEventData)
    : undefined;
  const correlationId =
    (data as any)?.correlationId || context.invocationId || "unknown";
  const baseLog = { correlationId, service: "notifications-service-func" };
  const hasSignalR = Boolean(
    process.env.AZURE_SIGNALR_CONNECTION_STRING?.trim()
  );
  const signalrMessages: Array<{
    userId: string;
    target: string;
    arguments: [Notification];
  }> = [];
  const emailQueueMessages: EmailQueueMessage[] = [];

  const queueSignalRNotification = (
    notification: Notification,
    userId: string
  ) => {
    if (!hasSignalR) return;
    signalrMessages.push({
      userId,
      target: "notificationCreated",
      arguments: [notification],
    });
    context.log({
      ...baseLog,
      message: "SignalR notification queued",
      notificationId: notification.id,
      userId,
    });
  };

  const queueEmailNotification = (
    notification: Notification,
    userId: string
  ) => {
    emailQueueMessages.push({
      notificationId: notification.id,
      userId,
      correlationId,
    });
    context.log({
      ...baseLog,
      message: "Email notification queued",
      notificationId: notification.id,
      userId,
    });
  };

  if (!data?.userId) {
    context.warn({
      ...baseLog,
      message: "Loan status event missing userId; skipping.",
    });
    return;
  }

  const notificationType =
    STATUS_TO_NOTIFICATION[data.newStatus] ?? "Custom";

  const payload = buildPayload(notificationType, data);
  const creation = createNotification({
    userId: data.userId,
    type: notificationType,
    payload,
    message: `Loan ${data.loanId} status updated to ${data.newStatus}`,
  });

  if (creation.success === false) {
    context.error({
      ...baseLog,
      message: "Failed to create notification from event",
      errors: creation.errors,
    });
    return;
  }

  try {
    const repo = getNotificationRepo();
    const result = await repo.create(creation.notification);

    if (result.success) {
      context.log({
        ...baseLog,
        message: "Notification stored for loan",
        loanId: data.loanId,
        newStatus: data.newStatus,
      });
      queueSignalRNotification(result.data, data.userId);
      queueEmailNotification(result.data, data.userId);
    } else {
      const errorDetails = (result as { success: false; error: unknown }).error;
      context.error({
        ...baseLog,
        message: "Failed to persist notification",
        error:
          errorDetails instanceof Error
            ? errorDetails.message
            : String(errorDetails),
      });
    }

    const waitlistUsers = toUniqueUserIds(data.waitlist);
    if (
      WAITLIST_AVAILABLE_STATUSES.has(data.newStatus) &&
      waitlistUsers.length > 0
    ) {
      const deviceName = data.deviceId;
      const messageBase = `Waitlist alert: ${deviceName} is available now. Reserve soon.`;

      for (const [index, waitlistUserId] of waitlistUsers.entries()) {
        if (waitlistUserId === data.userId) continue;

        const waitlistCreation = createNotification({
          userId: waitlistUserId,
          type: "Waitlist",
          payload: {
            deviceName,
            requestedFrom: data.from,
            requestedTill: data.till,
            position: 1,
          },
          message: messageBase,
        });

        if (waitlistCreation.success === false) {
          context.error({
            ...baseLog,
            message: "Failed to create waitlist availability notification",
            errors: waitlistCreation.errors,
          });
          continue;
        }

        try {
          const waitlistResult = await repo.create(
            waitlistCreation.notification
          );
          if (waitlistResult.success) {
            context.log({
              ...baseLog,
              message: "Waitlist availability notification stored",
              userId: waitlistUserId,
              deviceId: data.deviceId,
            });
            queueSignalRNotification(
              waitlistResult.data,
              waitlistUserId
            );
            queueEmailNotification(waitlistResult.data, waitlistUserId);
          } else {
            const waitlistError = (
              waitlistResult as { success: false; error: unknown }
            ).error;
            context.error({
              ...baseLog,
              message: "Failed to persist waitlist availability notification",
              error:
                waitlistError instanceof Error
                  ? waitlistError.message
                  : String(waitlistError),
            });
          }
        } catch (waitlistError) {
          context.error({
            ...baseLog,
            message: "Error saving waitlist availability notification",
            error:
              waitlistError instanceof Error
                ? waitlistError.message
                : String(waitlistError),
          });
        }
      }
    }

    if (hasSignalR && signalrMessages.length > 0) {
      context.extraOutputs.set(signalROutput, signalrMessages);
    } else if (!hasSignalR) {
      context.log({
        ...baseLog,
        message: "SignalR connection string missing; skipping realtime notify.",
      });
    }
    if (emailQueueMessages.length > 0) {
      context.extraOutputs.set(emailQueueOutput, emailQueueMessages);
    }
  } catch (err) {
    context.error({
      ...baseLog,
      message: "Error saving notification for loan event",
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

app.eventGrid("handleLoanStatusEvent", {
  handler: handleLoanStatusEvent,
  extraOutputs: [signalROutput, emailQueueOutput],
});
