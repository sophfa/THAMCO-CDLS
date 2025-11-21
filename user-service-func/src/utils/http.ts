import { HttpRequest, HttpResponseInit } from "@azure/functions";

const allowedOriginsSetting = process.env.CORS_ALLOWED_ORIGINS ?? "*";
const allowedOrigins = allowedOriginsSetting
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowAnyOrigin =
  allowedOrigins.length === 0 || allowedOrigins.includes("*");

function resolveOrigin(request: HttpRequest): string | undefined {
  // Host-triggered invocations can omit headers entirely.
  const requestOrigin = request.headers?.get?.("origin");

  if (allowAnyOrigin) {
    return requestOrigin ?? "*";
  }

  if (!requestOrigin) {
    return undefined;
  }

  return allowedOrigins.find(
    (origin) => origin.toLowerCase() === requestOrigin.toLowerCase()
  );
}

function buildCorsHeaders(
  request: HttpRequest,
  allowedMethods: string[]
): Record<string, string> {
  const origin = resolveOrigin(request);

  if (!origin) {
    return {};
  }

  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": allowedMethods.join(","),
    "Access-Control-Allow-Headers":
      request.headers?.get?.("Access-Control-Request-Headers") ??
      "Authorization,Content-Type",
    "Access-Control-Max-Age": "86400",
  };

  if (!allowAnyOrigin) {
    headers["Vary"] = "Origin";
  }

  return headers;
}

export function withCors(
  request: HttpRequest,
  response: HttpResponseInit,
  allowedMethods: string[]
): HttpResponseInit {
  return {
    ...response,
    headers: {
      ...(response.headers ?? {}),
      ...buildCorsHeaders(request, allowedMethods),
    },
  };
}

export function handleCorsPreflight(
  request: HttpRequest,
  allowedMethods: string[]
): HttpResponseInit | null {
  // Some host-triggered invocations omit the method; guard before uppercase to avoid crashes.
  const method = request.method?.toUpperCase?.() ?? "";

  if (method !== "OPTIONS") {
    return null;
  }

  return withCors(
    request,
    {
      status: 204,
    },
    allowedMethods
  );
}
