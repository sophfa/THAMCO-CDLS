import { InvocationContext } from "@azure/functions";
import { randomUUID } from "crypto";
import { UserProfile } from "../domain/userProfile";

const topicEndpoint =
  process.env.USER_EVENT_GRID_TOPIC_ENDPOINT ??
  process.env.EVENT_GRID_TOPIC_ENDPOINT;
const topicKey =
  process.env.USER_EVENT_GRID_TOPIC_KEY ??
  process.env.EVENT_GRID_TOPIC_KEY;

export interface UserSnapshotEvent {
  readonly user: UserProfile;
  readonly correlationId?: string;
  readonly reason?: string;
  readonly requestedBy?: string;
}

export async function publishUserSnapshot(
  event: UserSnapshotEvent,
  context: InvocationContext
): Promise<void> {
  if (!topicEndpoint || !topicKey) {
    context.log?.(
      "Event Grid topic config missing; skipping user snapshot publish."
    );
    return;
  }

  const now = new Date().toISOString();
  const body = [
    {
      id: randomUUID(),
      eventType: "UserSnapshotAvailable",
      subject: `/users/${encodeURIComponent(event.user.id)}`,
      dataVersion: "1.0",
      eventTime: now,
      data: {
        user: event.user,
        correlationId: event.correlationId,
        reason: event.reason,
        requestedBy: event.requestedBy,
        publishedAt: now,
      },
    },
  ];

  const response = await fetch(topicEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "aeg-sas-key": topicKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    context.error?.(
      `Failed to publish user snapshot: ${response.status} ${errorBody}`
    );
  }
}
