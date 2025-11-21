import {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { fetchUserProfile } from "../../services/auth0UserService";
import {
  authenticateRequest,
  isAdmin,
  Principal,
} from "../../utils/auth";
import {
  publishUserSnapshot,
  UserSnapshotEvent,
} from "../../events/userEventPublisher";
import { handleCorsPreflight, withCors } from "../../utils/http";

interface BroadcastRequest {
  reason?: string;
  correlationId?: string;
}

function canBroadcast(
  principal: Principal,
  userId: string
): boolean {
  return principal.userId === userId || isAdmin(principal);
}

export async function broadcastUserSnapshotHttp(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const corsMethods = ["POST", "OPTIONS"];
  const preflight = handleCorsPreflight(request, corsMethods);
  if (preflight) {
    return preflight;
  }

  const auth = await authenticateRequest(request, context);
  if (!auth.success) {
    return withCors(
      request,
      { status: auth.status, jsonBody: { message: auth.message } },
      corsMethods
    );
  }

  const userId = decodeURIComponent(request.params.userId ?? "").trim();
  if (!userId) {
    return withCors(
      request,
      { status: 400, jsonBody: { message: "User id required" } },
      corsMethods
    );
  }

  if (!canBroadcast(auth.principal, userId)) {
    return withCors(
      request,
      { status: 403, jsonBody: { message: "Forbidden" } },
      corsMethods
    );
  }

  const body = (await request
    .json()
    .catch(() => ({}))) as BroadcastRequest;

  try {
    const user = await fetchUserProfile(userId, context);
    const event: UserSnapshotEvent = {
      user,
      reason: body.reason ?? "manual-broadcast",
      correlationId: body.correlationId,
      requestedBy: auth.principal.userId,
    };

    await publishUserSnapshot(event, context);

    return withCors(
      request,
      {
        status: 202,
        jsonBody: {
          success: true,
          message: "User snapshot published",
          correlationId: event.correlationId,
        },
      },
      corsMethods
    );
  } catch (error) {
    context.error?.("Broadcast failed", error);
    return withCors(
      request,
      {
        status: 502,
        jsonBody: { success: false, message: "Failed to publish snapshot" },
      },
      corsMethods
    );
  }
}
