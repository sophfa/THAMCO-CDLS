import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

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
  _context: InvocationContext
): Promise<HttpResponseInit> {
  if (req.method === "OPTIONS") {
    return withCors({ status: 204 }, "GET,OPTIONS");
  }

  return withCors({
    status: 200,
    jsonBody: {
      status: "ok",
      service: "notifications-service-func",
      timestamp: new Date().toISOString(),
    },
  });
}

app.http("healthHttp", {
  route: "health",
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  handler: healthHttp,
});
