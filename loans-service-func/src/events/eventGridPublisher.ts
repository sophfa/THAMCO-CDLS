import { InvocationContext } from "@azure/functions";
import { randomUUID } from "crypto";

const topicEndpoint = process.env.EVENT_GRID_TOPIC_ENDPOINT;
const topicKey = process.env.EVENT_GRID_TOPIC_KEY;

let missingConfigLogged = false;

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
}

export async function publishLoanStatusChangedEvent(
  payload: LoanStatusEventPayload,
  context: InvocationContext
): Promise<void> {
  if (!topicEndpoint || !topicKey) {
    if (!missingConfigLogged) {
      context.log(
        "Event Grid configuration missing (EVENT_GRID_TOPIC_ENDPOINT / EVENT_GRID_TOPIC_KEY); skipping publish."
      );
      missingConfigLogged = true;
    }
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
      },
    },
  ];

  try {
    const response = await fetch(topicEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "aeg-sas-key": topicKey,
      },
      body: JSON.stringify(events),
    });

    if (!response.ok) {
      const errorBody = await response.text();

      context.error(
        `Event Grid publish failed (${response.status} ${response.statusText}): ${errorBody}`
      );
    }
  } catch (error) {
    context.error("Unexpected error while publishing to Event Grid:", error);
  }
}
