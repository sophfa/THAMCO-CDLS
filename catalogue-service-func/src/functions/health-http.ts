import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { randomUUID } from "crypto";

function withCors(
  res: HttpResponseInit,
  allowMethods = "GET,OPTIONS"
): HttpResponseInit {
  return {
    ...res,
    headers: {
      ...(res.headers ?? {}),
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": allowMethods,
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  };
}

export async function healthHttp(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  if (req.method === "OPTIONS") {
    return withCors({ status: 204 }, "GET,OPTIONS");
  }

  const correlationId =
    req.headers.get("x-correlation-id")?.trim() || randomUUID();
  const start = Date.now();

  context.log({
    correlationId,
    service: "catalogue-service-func",
    message: "health check",
  });

  const response = withCors({
    status: 200,
    headers: {
      "x-correlation-id": correlationId,
    },
    jsonBody: {
      status: "ok",
      service: "catalogue-service-func",
      timestamp: new Date().toISOString(),
      correlationId,
    },
  });

  const durationMs = Date.now() - start;
  context.log({
    correlationId,
    service: "catalogue-service-func",
    durationMs,
    message: "health check complete",
  });

  return response;
}

app.http("healthHttp", {
  route: "health",
  methods: ["GET", "OPTIONS"],
  authLevel: "function",
  handler: healthHttp,
});
