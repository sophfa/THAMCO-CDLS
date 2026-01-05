import { app, InvocationContext, TimerRequest } from "@azure/functions";
import {
  computeNextAttempt,
  getTopicConfig,
  sendWithRetry,
} from "../../events/eventGridPublisher";
import { getOutboxRepo } from "../../infra/outbox-repo-factory";

const MAX_BATCH_SIZE = 20;

app.timer("processLoanOutboxEvents", {
  schedule: "0 */1 * * * *",
  handler: async (_timer: TimerRequest, context: InvocationContext) => {
    const correlationId = context.invocationId || "outbox-scheduler";
    const baseLog = { correlationId, service: "loans-service-func" };
    const outboxRepo = getOutboxRepo();

    const pendingResult = await outboxRepo.fetchPending(MAX_BATCH_SIZE);
    if (!pendingResult.success) {
      context.error({
        ...baseLog,
        message: "Failed to read pending outbox events",
        error: pendingResult.error,
      });
      return;
    }

    if (pendingResult.data.length === 0) {
      context.log({
        ...baseLog,
        message: "No pending outbox events to process",
      });
      return;
    }

    const { endpoint, key } = getTopicConfig();
    if (!endpoint || !key) {
      context.warn({
        ...baseLog,
        message:
          "Event Grid configuration missing; cannot drain outbox. Events will remain pending.",
      });
      return;
    }

    for (const event of pendingResult.data) {
      const eventLog = {
        ...baseLog,
        correlationId: event.correlationId || correlationId,
        eventId: event.id,
        eventType: event.payload.eventType,
      };

      context.log({
        ...eventLog,
        message: "Processing outbox event",
      });

      const dispatchResult = await sendWithRetry(
        [event.payload],
        context,
        endpoint,
        key,
        eventLog
      );

      if (dispatchResult.success) {
        await outboxRepo.markSent(event.id);
        context.log({
          ...eventLog,
          message: "Outbox event sent and marked as delivered",
        });
        continue;
      }

      await outboxRepo.markFailed(event.id, {
        attempts: event.retryCount + 1,
        error: dispatchResult.error,
        nextAttemptAt: computeNextAttempt(event.retryCount + 1),
      });

      context.warn({
        ...eventLog,
        message: "Outbox event dispatch failed; will retry later",
        error: dispatchResult.error,
      });
    }
  },
});
