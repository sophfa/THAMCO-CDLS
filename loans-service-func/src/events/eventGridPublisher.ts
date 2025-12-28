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
  const { endpoint, key } = getTopicConfig();
  if (!endpoint || !key) {
    if (!missingConfigLogged) {
      context.log(
        "Event Grid configuration missing (EVENT_GRID_TOPIC_ENDPOINT / EVENT_GRID_TOPIC_KEY); skipping publish."
      );
      missingConfigLogged = true;
    }
    return;
  }

  if (!payload.loanId || !payload.newStatus) {
    context.warn("Event Grid publish skipped: invalid payload", payload);
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

  await sendWithRetry(events, context, endpoint, key);
}

async function sendWithRetry(
  events: any[],
  context: InvocationContext,
  endpoint: string,
  key: string,
  retries: number = DEFAULT_RETRIES
): Promise<void> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retries) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "aeg-sas-key": key,
        },
        body: JSON.stringify(events),
      });

      if (response.ok) {
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
      context.warn(
        `Event Grid publish attempt ${attempt} failed, retrying in ${backoff}ms`
      );
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }

  context.error("Event Grid publish failed after retries", lastError);
}
