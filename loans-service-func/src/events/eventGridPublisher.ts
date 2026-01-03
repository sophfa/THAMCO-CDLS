import { InvocationContext } from "@azure/functions";
import { randomUUID } from "crypto";

let missingConfigLogged = false;
const DEFAULT_RETRIES = 2;

function getTopicConfig() {
  return {
    endpoint: process.env.EVENT_GRID_TOPIC_ENDPOINT,
    key: process.env.EVENT_GRID_TOPIC_KEY,
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

  const statusChangedAt =
    payload.statusChangedAt ?? new Date().toISOString();

  const events = [
    {
      id: randomUUID(),
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
    },
  ];

  context.log({
    ...baseLog,
    message: "TEMP: Sending Event Grid event batch",
    eventCount: events.length,
    eventType: events[0]?.eventType,
    subject: events[0]?.subject,
  });
  await sendWithRetry(events, context, endpoint, key, baseLog);
}

async function sendWithRetry(
  events: any[],
  context: InvocationContext,
  endpoint: string,
  key: string,
  baseLog: { correlationId: string; service: string },
  retries: number = DEFAULT_RETRIES
): Promise<void> {
  let attempt = 0;
  let lastError: unknown;

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
          message: "TEMP: Event Grid publish succeeded",
          attempt: attempt + 1,
          status: response.status,
        });
        return;
      }

      const errorBody = await response.text();
      lastError = `${response.status} ${response.statusText}: ${errorBody}`;
    } catch (err) {
      lastError = err;
    }

    attempt += 1;
    if (attempt <= retries) {
      const backoff = 100 * attempt;
      context.warn({
        ...baseLog,
        message: "Event Grid publish attempt failed, retrying",
        attempt,
        backoffMs: backoff,
        error: lastError instanceof Error ? lastError.message : String(lastError),
      });
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }

  context.error({
    ...baseLog,
    message: "Event Grid publish failed after retries",
    error: lastError instanceof Error ? lastError.message : String(lastError),
  });
}
