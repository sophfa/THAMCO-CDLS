import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

/**
 * Validates an inbound function key (x-functions-key header or code query param).
 * If no key is configured, returns 500 to force secure configuration in deployed environments.
 */
export function validateFunctionKey(
  req: HttpRequest,
  ctx: InvocationContext
): HttpResponseInit | null {
  const expected =
    process.env.FUNCTION_KEY || process.env.PRODUCTS_FUNCTION_KEY || null;

  // No key configured: treat as misconfiguration to avoid accidental open access
  if (!expected || expected.trim().length === 0) {
    ctx.log("Function key configuration missing");
    return {
      status: 500,
      jsonBody: {
        success: false,
        error: {
          code: "CONFIGURATION_ERROR",
          message:
            "Function key is not configured. Set FUNCTION_KEY or PRODUCTS_FUNCTION_KEY.",
        },
      },
    };
  }

  const provided =
    req.headers.get("x-functions-key") ||
    req.query.get("code") ||
    req.headers.get("X-Functions-Key");

  if (!provided) {
    ctx.log("Function key missing");
    return {
      status: 401,
      jsonBody: { success: false, error: { code: "UNAUTHORIZED", message: "Function key required" } },
    };
  }

  if (provided !== expected) {
    ctx.log("Function key invalid");
    return {
      status: 403,
      jsonBody: { success: false, error: { code: "FORBIDDEN", message: "Invalid function key" } },
    };
  }

  return null;
}
