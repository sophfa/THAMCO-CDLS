import {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { listUsers } from "../../services/auth0UserService";
import { authenticateRequest, isAdmin } from "../../utils/auth";
import { handleCorsPreflight, withCors } from "../../utils/http";

export async function listUsersHttp(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const corsMethods = ["GET", "OPTIONS"];
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

  if (!isAdmin(auth.principal)) {
    return withCors(
      request,
      { status: 403, jsonBody: { message: "Admin role required" } },
      corsMethods
    );
  }

  const search = request.query.get("search") ?? "";
  const page = Number(request.query.get("page") ?? "0");
  const pageSize = Number(request.query.get("pageSize") ?? "25");

  try {
    const result = await listUsers(
      { search, page, pageSize },
      context
    );

    return withCors(
      request,
      {
        status: 200,
        jsonBody: { success: true, ...result },
      },
      corsMethods
    );
  } catch (error: any) {
    context.error?.("User search failed", error);
    return withCors(
      request,
      {
        status: 502,
        jsonBody: { success: false, message: "Failed to query Auth0" },
      },
      corsMethods
    );
  }
}
