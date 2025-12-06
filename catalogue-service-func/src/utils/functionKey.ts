import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

/**
 * Validates an inbound function key (x-functions-key header or code query param).
 * If no expected key is configured via env, validation is skipped to avoid blocking local dev.
 */
export function validateFunctionKey(
  req: HttpRequest,
  ctx: InvocationContext
): HttpResponseInit | null {
  const expected =
    process.env.FUNCTION_KEY || process.env.PRODUCTS_FUNCTION_KEY || null;

  // If no key configured, allow the request (local/dev ease of use)
  if (!expected) {
    return null;
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
