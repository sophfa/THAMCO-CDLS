import { app, HttpRequest, HttpResponseInit } from "@azure/functions";

const isLocal =
  (process.env.AZURE_FUNCTIONS_ENVIRONMENT || "").toLowerCase() ===
    "development" ||
  (process.env.NODE_ENV || "").toLowerCase() === "development";

async function preflightHttp(_req: HttpRequest): Promise<HttpResponseInit> {
  return { status: 204 };
}

if (isLocal) {
  app.http("preflightHttp", {
    methods: ["OPTIONS"],
    route: "{*path}",
    authLevel: "function",
    handler: preflightHttp,
  });
}
