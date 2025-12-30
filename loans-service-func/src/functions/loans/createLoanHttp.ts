import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { loansContainer } from "../../config/cosmosClient";
import { validateToken } from "../../utils/auth";
import "dotenv/config";

export async function createLoanHttp(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const correlationId =
    req.headers.get("x-correlation-id")?.trim() ||
    context.invocationId ||
    "unknown";
  const baseLog = { correlationId, service: "loans-service-func" };

  try {
    // Validate authentication token
    const authResult = await validateToken(req, context);
    if (!authResult.isValid) {
      context.log({
        ...baseLog,
        message: "Authentication failed",
        error: authResult.error,
      });
      return {
        status: 401,
        jsonBody: { message: authResult.error || "Unauthorized" },
      };
    }

    const body = (await req.json()) as {
      deviceId?: string;
      userId?: string;
      from?: string;
    };

    const deviceId = (body?.deviceId ?? "").trim();
    const userId = (body?.userId ?? "").trim();

    if (!deviceId || !userId) {
      return {
        status: 400,
        jsonBody: { message: "deviceId and userId are required" },
      };
    }

    // Verify the authenticated user matches the userId in the request
    if (authResult.userId !== userId) {
      context.log({
        ...baseLog,
        message: "Access denied: User mismatch",
        userId: authResult.userId,
        requestedUserId: userId,
      });
      return {
        status: 403,
        jsonBody: {
          message: "Access denied: Cannot create loan for other users",
        },
      };
    }

    const now = new Date();
    const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
    const requestedFrom = (body?.from ?? "").trim();
    let from = now;
    if (requestedFrom) {
      const parsed = new Date(requestedFrom);
      if (Number.isNaN(parsed.getTime())) {
        return {
          status: 400,
          jsonBody: { message: "from must be a valid date" },
        };
      }
      from = parsed;
    }
    const till = new Date(from.getTime() + twoDaysMs);

    const newLoan = {
      id: `LOAN-${Date.now()}`,
      deviceId,
      userId,
      createdAt: now.toISOString(),
      statusChangedAt: now.toISOString(),
      from: from.toISOString(),
      till: till.toISOString(),
      status: "Requested" as const,
    };

    await loansContainer.items.upsert(newLoan);
    return { status: 201, jsonBody: newLoan };
  } catch (error: any) {
    context.log({
      ...baseLog,
      message: "Failed to create loan",
      error: error?.message ?? String(error),
    });
    return { status: 500, jsonBody: { message: "Failed to create loan" } };
  }
}

app.http("createLoanHttp", {
  route: "loans",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: createLoanHttp,
});
