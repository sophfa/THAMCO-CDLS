import { app, InvocationContext } from "@azure/functions";
import { getUserEmailById } from "../auth0/userDirectory";
import { getNotificationRepo } from "../infra/notificationRepoFactory";
import { sendEmailNotification } from "./createNotificationHttp";
import { EMAIL_QUEUE_NAME, EmailQueueMessage } from "../queues/emailQueue";

const parseQueueMessage = (raw: unknown): EmailQueueMessage | null => {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as EmailQueueMessage;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object") {
    return raw as EmailQueueMessage;
  }
  return null;
};

export async function processNotificationEmailQueue(
  queueItem: unknown,
  context: InvocationContext
): Promise<void> {
  const message = parseQueueMessage(queueItem);
  const correlationId =
    message?.correlationId || context.invocationId || "unknown";
  const baseLog = { correlationId, service: "notifications-service-func" };

  if (!message?.notificationId || !message?.userId) {
    context.warn({
      ...baseLog,
      message: "Email queue message missing notificationId or userId",
    });
    return;
  }

  if (!process.env.RESEND_API_KEY || !process.env.FROM_EMAIL) {
    context.log({
      ...baseLog,
      message: "Email configuration missing; skipping queued email",
      notificationId: message.notificationId,
    });
    return;
  }

  const repo = getNotificationRepo();
  const notificationResult = await repo.get(message.notificationId);
  if (!notificationResult.success) {
    const errorDetails = (notificationResult as { error: unknown }).error;
    context.warn({
      ...baseLog,
      message: "Queued email notification not found",
      notificationId: message.notificationId,
      error:
        errorDetails instanceof Error
          ? errorDetails.message
          : String(errorDetails),
    });
    return;
  }

  let resolvedUserEmail = message.userEmail?.trim();
  if (!resolvedUserEmail) {
    try {
      resolvedUserEmail = await getUserEmailById(message.userId, context);
      if (resolvedUserEmail) {
        context.log({
          ...baseLog,
          message: "Resolved user email via Auth0",
          userId: message.userId,
        });
      } else {
        context.log({
          ...baseLog,
          message: "Auth0 did not return an email for user",
          userId: message.userId,
        });
      }
    } catch (lookupError) {
      context.error({
        ...baseLog,
        message: "Failed to resolve email for user",
        userId: message.userId,
        error:
          lookupError instanceof Error
            ? lookupError.message
            : String(lookupError),
      });
    }
  }

  if (!resolvedUserEmail) {
    context.log({
      ...baseLog,
      message: "No email address resolved; skipping queued email",
      notificationId: message.notificationId,
    });
    return;
  }

  const emailSent = await sendEmailNotification(
    notificationResult.data,
    resolvedUserEmail,
    context,
    baseLog
  );

  if (!emailSent) {
    throw new Error("Email send failed");
  }
}

app.storageQueue("processNotificationEmailQueue", {
  queueName: EMAIL_QUEUE_NAME,
  connection: "AzureWebJobsStorage",
  handler: processNotificationEmailQueue,
});
