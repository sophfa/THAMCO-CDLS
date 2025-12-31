import { output } from "@azure/functions";

export interface EmailQueueMessage {
  notificationId: string;
  userId: string;
  userEmail?: string;
  correlationId?: string;
}

export const EMAIL_QUEUE_NAME = "notification-email";

export const emailQueueOutput = output.storageQueue({
  queueName: EMAIL_QUEUE_NAME,
  connection: "AzureWebJobsStorage",
});
