import { InvocationContext } from "@azure/functions";
import { randomUUID } from "crypto";
import { getOutboxRepo } from "../infra/outbox-repo-factory";
import { OutboxEvent } from "../domain/outbox-event";

let missingConfigLogged = false;
const DEFAULT_RETRIES = 2;

export function getTopicConfig() {
  return {
    endpoint: process.env.EVENT_GRID_TOPIC_ENDPOINT,
    key: process.env.EVENT_GRID_TOPIC_KEY,
  };
}

function buildEventPayload(
  payload: LoanStatusEventPayload,
  eventId: string,
  statusChangedAt: string
): OutboxEvent["payload"] {
  return {
    id: eventId,
    eventType: "LoanStatusChanged",
    subject: `/loans/${payload.loanId}`,
    eventTime: statusChangedAt,
    dataVersion: "1.0",
    data: {
      loanId: payload.loanId,
      deviceId: payload.deviceId,
      deviceName: payload.deviceName,
      userId: payload.userId,
      from: payload.from,
      till: payload.till,
      previousStatus: payload.previousStatus,
      newStatus: payload.newStatus,
      statusChangedAt,
      collectedAt: payload.collectedAt,
      returnedAt: payload.returnedAt,
      reason: payload.reason,
      correlationId: payload.correlationId,
      waitlist: payload.waitlist,
    },
  };
}

export interface LoanStatusEventPayload {
  loanId: string;
  deviceId: string;
  deviceName?: string;
  userId: string;
  from: string;
  till: string;
  previousStatus: string;
  newStatus: string;
  statusChangedAt?: string;
  collectedAt?: string;
  returnedAt?: string;
  reason?: string;
  correlationId?: string;
  waitlist?: string[];
}

export async function publishLoanStatusChangedEvent(
  payload: LoanStatusEventPayload,
  context: InvocationContext
): Promise<void> {
  const correlationId = payload.correlationId || context.invocationId || "unknown";
  const baseLog = { correlationId, service: "loans-service-func" };
  context.log({
    ...baseLog,
    message: "TEMP: publishLoanStatusChangedEvent called",
    loanId: payload.loanId,
    previousStatus: payload.previousStatus,
    newStatus: payload.newStatus,
    statusChangedAt: payload.statusChangedAt,
  });

  if (!payload.loanId || !payload.newStatus) {
    context.warn({
      ...baseLog,
      message: "TEMP: Event Grid publish skipped due to invalid payload",
      loanId: payload.loanId,
      newStatus: payload.newStatus,
    });
    context.warn({
      ...baseLog,
      message: "Event Grid publish skipped: invalid payload",
      payload,
    });
    return;
  }

  const outboxRepo = getOutboxRepo();
  const statusChangedAt =
    payload.statusChangedAt ?? new Date().toISOString();
  const eventId = randomUUID();
  const eventPayload = buildEventPayload(payload, eventId, statusChangedAt);

  const outboxEvent: OutboxEvent = {
    id: eventId,
    payload: eventPayload,
    status: "PENDING",
    retryCount: 0,
    correlationId,
    createdAt: new Date().toISOString(),
  };

  const enqueueResult = await outboxRepo.enqueue(outboxEvent);
  if (!enqueueResult.success) {
    context.error({
      ...baseLog,
      message: "Failed to enqueue loan status event",
      error: enqueueResult.error,
    });
    return;
  }

  const { endpoint, key } = getTopicConfig();
  context.log({
    ...baseLog,
    message: "TEMP: Event Grid config check",
    hasEndpoint: Boolean(endpoint),
    hasKey: Boolean(key),
  });

  if (!endpoint || !key) {
    if (!missingConfigLogged) {
      context.log({
        ...baseLog,
        message:
          "Event Grid configuration missing (EVENT_GRID_TOPIC_ENDPOINT / EVENT_GRID_TOPIC_KEY); skipping publish.",
      });
      missingConfigLogged = true;
    }
    return;
  }

  context.log({
    ...baseLog,
    message: "TEMP: Sending Event Grid event batch",
    eventCount: 1,
    eventType: eventPayload.eventType,
    subject: eventPayload.subject,
  });

  const dispatchResult = await sendWithRetry(
    [eventPayload],
    context,
    endpoint,
    key,
    baseLog
  );

  if (dispatchResult.success) {
    await outboxRepo.markSent(eventId);
    context.log({
      ...baseLog,
      message: "Event Grid publish succeeded",
      loanId: payload.loanId,
      eventId,
    });
    return;
  }

  context.warn({
    ...baseLog,
    message: "Event Grid publish failed. Event persisted for retry.",
    loanId: payload.loanId,
    eventId,
    error: dispatchResult.error,
  });

  await outboxRepo.markFailed(eventId, {
    attempts: 1,
    error: dispatchResult.error,
    nextAttemptAt: computeNextAttempt(1),
  });
}

export async function sendWithRetry(
  events: any[],
  context: InvocationContext,
  endpoint: string,
  key: string,
  baseLog: { correlationId: string; service: string },
  retries: number = DEFAULT_RETRIES
): Promise<{ success: true } | { success: false; error: string }> {
  let attempt = 0;
  let lastError: string | undefined;

  while (attempt <= retries) {
    try {
      context.log({
        ...baseLog,
        message: "TEMP: Event Grid publish attempt",
        attempt: attempt + 1,
      });
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "aeg-sas-key": key,
        },
        body: JSON.stringify(events),
      });

      if (response.ok) {
        context.log({
          ...baseLog,
          message: "TEMP: Event Grid publish attempt succeeded",
          attempt: attempt + 1,
          status: response.status,
        });
        return { success: true };
      }

      const errorBody = await response.text();
      lastError = `${response.status} ${response.statusText}: ${errorBody}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }

    attempt += 1;
    if (attempt <= retries) {
      const backoff = 100 * attempt;
      context.warn({
        ...baseLog,
        message: "Event Grid publish attempt failed, retrying",
        attempt,
        backoffMs: backoff,
        error: lastError,
      });
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }

  const failure = lastError ?? "Unknown error";
  context.error({
    ...baseLog,
    message: "Event Grid publish failed after retries",
    error: failure,
  });
  return { success: false, error: failure };
}

export function computeNextAttempt(attempts: number): string {
  const backoffMs = Math.min(60_000 * attempts, 300_000);
  return new Date(Date.now() + backoffMs).toISOString();
}
