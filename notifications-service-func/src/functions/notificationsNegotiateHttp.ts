import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
  input,
} from "@azure/functions";
import { validateToken } from "../utils/auth";

const signalRConnectionInfo = input.generic({
  type: "signalRConnectionInfo",
  name: "connectionInfo",
  hubName: "notifications",
  connectionStringSetting: "AzureSignalRConnectionString",
  userId: "{headers.x-user-id}",
});

export async function notificationsNegotiateHttp(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const auth = await validateToken(request, context);
  if (!auth.isValid || !auth.userId) {
    return {
      status: 401,
      jsonBody: { message: auth.error || "Unauthorized" },
    };
  }

  const headerUserId = request.headers.get("x-user-id") || "";
  if (headerUserId !== auth.userId) {
    return {
      status: 403,
      jsonBody: { message: "Access denied: user mismatch" },
    };
  }

  const info = context.extraInputs.get(signalRConnectionInfo);
  return { status: 200, jsonBody: info };
}

app.http("notificationsNegotiateHttp", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  route: "notifications/negotiate",
  handler: notificationsNegotiateHttp,
  extraInputs: [signalRConnectionInfo],
});
