import {
  EventGridEvent,
  InvocationContext,
} from "@azure/functions";
import { fetchUserProfile } from "../../services/auth0UserService";
import { publishUserSnapshot } from "../../events/userEventPublisher";

interface SnapshotRequestData {
  userId: string;
  correlationId?: string;
  requestedBy?: string;
  reason?: string;
}

function isSnapshotRequestData(data: unknown): data is SnapshotRequestData {
  if (!data || typeof data !== "object") {
    return false;
  }

  return typeof (data as { userId?: unknown }).userId === "string";
}

export async function handleUserSnapshotRequestEvent(
  event: EventGridEvent,
  context: InvocationContext
): Promise<void> {
  const data = event.data;

  if (!isSnapshotRequestData(data)) {
    context.log?.("User snapshot request missing userId");
    return;
  }

  try {
    const profile = await fetchUserProfile(data.userId, context);
    await publishUserSnapshot(
      {
        user: profile,
        correlationId: data.correlationId ?? event.id,
        reason: data.reason ?? event.eventType,
        requestedBy: data.requestedBy,
      },
      context
    );
    context.log?.(`User snapshot published for ${data.userId}`);
  } catch (error) {
    context.error?.("Failed to handle user snapshot request", error);
  }
}
