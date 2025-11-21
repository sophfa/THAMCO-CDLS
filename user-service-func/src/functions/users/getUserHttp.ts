import {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { fetchUserProfile } from "../../services/auth0UserService";
import { authenticateRequest, isAdmin } from "../../utils/auth";
import { handleCorsPreflight, withCors } from "../../utils/http";

export async function getUserHttp(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log?.("[http] Incoming getUserHttp request", {
    method: request.method,
    url: request.url,
    route: request.params.userId,
  });
  if (request.headers && typeof (request.headers as any)[Symbol.iterator] === "function") {
    context.log?.("[http] Request headers snapshot", {
      entries: Array.from(request.headers as any),
    });
  } else if (request.headers) {
    context.log?.("[http] Request headers snapshot (non-iterable)", {
      headers: request.headers,
    });
  } else {
    context.log?.("[http] Request headers missing");
  }
  const corsMethods = ["GET", "OPTIONS"];
  const preflight = handleCorsPreflight(request, corsMethods);
  if (preflight) {
    context.log?.("[http] Preflight handled");
    return preflight;
  }

  const auth = await authenticateRequest(request, context);
  if (!auth.success) {
    context.log?.("[http] Auth failed", {
      status: auth.status,
      message: auth.message,
    });
    return withCors(
      request,
      {
        status: auth.status,
        jsonBody: { message: auth.message },
      },
      corsMethods
    );
  }

  const requestedUserId = decodeURIComponent(
    request.params.userId ?? ""
  ).trim();
  context.log?.("[http] Requested user id resolved", {
    requestedUserId,
    principalUserId: auth.principal.userId,
  });

  if (!requestedUserId) {
    context.log?.("[http] Missing user id");
    return withCors(
      request,
      {
        status: 400,
        jsonBody: { message: "User id is required" },
      },
      corsMethods
    );
  }

  if (
    auth.principal.userId !== requestedUserId &&
    !isAdmin(auth.principal)
  ) {
    context.log?.("[http] Forbidden access attempt", {
      requestedUserId,
      principalUserId: auth.principal.userId,
      roles: auth.principal.roles,
    });
    return withCors(
      request,
      {
        status: 403,
        jsonBody: { message: "Forbidden" },
      },
      corsMethods
    );
  }

  try {
    const profile = await fetchUserProfile(requestedUserId, context);
    context.log?.("[http] User profile fetched", {
      requestedUserId,
      source: "auth0",
    });
    return withCors(
      request,
      {
        status: 200,
        jsonBody: {
          success: true,
          data: profile,
          fetchedAt: new Date().toISOString(),
          source: "auth0",
        },
      },
      corsMethods
    );
  } catch (error: any) {
    context.error?.("Failed to fetch user profile", {
      requestedUserId,
      error,
    });
    return withCors(
      request,
      {
        status: 404,
        jsonBody: {
          success: false,
          message: "User not found",
        },
      },
      corsMethods
    );
  }
}
