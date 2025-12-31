import { app, EventGridEvent, InvocationContext } from "@azure/functions";
import {
  createNotification,
  NotificationType,
  NotificationPayloadMap,
} from "../domain/notification";
import { getNotificationRepo } from "../infra/notificationRepoFactory";

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
  previousStatus?: LoanStatus;
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
): NotificationPayloadMap[NotificationType] {
  const base = {
    deviceName: data.deviceId,
    from: data.from,
    till: data.till,
  };

  switch (type) {
    case "Accepted":
      return { ...base, approvedAt: data.statusChangedAt };
    case "Rejected":
      return {
        ...base,
        reason: data.reason ?? "Loan request rejected.",
      };
    case "Cancelled":
      return { ...base, reason: data.reason ?? "Loan cancelled." };
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
    case "Reservation":
      return base;
    default:
      return {
        ...base,
        status: data.newStatus,
        message: `Loan ${data.loanId} is now ${data.newStatus}`,
      } as NotificationPayloadMap["Custom"];
  }
}

export async function sendNotificationFromLoanEvent(
  event: EventGridEvent,
  context: InvocationContext
): Promise<void> {
  const data = event.data
    ? (event.data as unknown as LoanStatusChangedEventData)
    : undefined;
  const correlationId =
    (data as any)?.correlationId || context.invocationId || "unknown";
  const baseLog = { correlationId, service: "notifications-service-func" };

  if (!data?.userId) {
    context.warn({
      ...baseLog,
      message: "Loan status event missing userId; skipping notification.",
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
      message: "Failed to create notification from loan event",
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
    } else {
      const err = (result as { success: false; error: unknown }).error;
      context.error({
        ...baseLog,
        message: "Failed to persist notification",
        error: err instanceof Error ? err.message : String(err),
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
  } catch (err) {
    context.error({
      ...baseLog,
      message: "Error saving notification for loan event",
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

app.eventGrid("sendNotificationFromLoanEvent", {
  handler: sendNotificationFromLoanEvent,
});
