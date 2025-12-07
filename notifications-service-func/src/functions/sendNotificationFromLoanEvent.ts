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

  if (!data?.userId) {
    context.warn("Loan status event missing userId; skipping notification.");
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
    context.error(
      "Failed to create notification from loan event",
      creation.errors
    );
    return;
  }

  try {
    const repo = getNotificationRepo();
    const result = await repo.create(creation.notification);

    if (result.success) {
      context.log(
        `Notification stored for loan ${data.loanId} (${data.newStatus})`
      );
    } else {
      const err = (result as { success: false; error: unknown }).error;
      context.error("Failed to persist notification:", err);
    }
  } catch (err) {
    context.error("Error saving notification for loan event:", err);
  }
}

app.eventGrid("sendNotificationFromLoanEvent", {
  handler: sendNotificationFromLoanEvent,
});
