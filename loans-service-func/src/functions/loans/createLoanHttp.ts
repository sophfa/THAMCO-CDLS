import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { loansContainer } from "../../config/cosmosClient";
import { publishLoanStatusChangedEvent } from "../../events/eventGridPublisher";
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
    const defaultStartHour = 9;
    const defaultEndHour = 17;
    const requestedFrom = (body?.from ?? "").trim();
    let from = now;
    let dateOnlyProvided = false;
    if (requestedFrom) {
      const dateOnlyMatch = requestedFrom.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      const parsed = dateOnlyMatch
        ? new Date(
            Number(dateOnlyMatch[1]),
            Number(dateOnlyMatch[2]) - 1,
            Number(dateOnlyMatch[3]),
            defaultStartHour,
            0,
            0,
            0
          )
        : new Date(requestedFrom);
      if (Number.isNaN(parsed.getTime())) {
        return {
          status: 400,
          jsonBody: { message: "from must be a valid date" },
        };
      }
      from = parsed;
      dateOnlyProvided = Boolean(dateOnlyMatch);
    }
    const till = new Date(from.getTime() + twoDaysMs);
    if (dateOnlyProvided) {
      till.setHours(defaultEndHour, 0, 0, 0);
    }

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

    context.log({
      ...baseLog,
      message: "TEMP: Publishing loan status change event",
      loanId: newLoan.id,
      previousStatus: "Created",
      newStatus: newLoan.status,
      statusChangedAt: newLoan.statusChangedAt,
    });
    await publishLoanStatusChangedEvent(
      {
        loanId: newLoan.id,
        deviceId: newLoan.deviceId,
        userId: newLoan.userId,
        from: newLoan.from,
        till: newLoan.till,
        correlationId,
        previousStatus: "Created",
        newStatus: newLoan.status,
        statusChangedAt: newLoan.statusChangedAt,
        waitlist: undefined,
      },
      context
    );
    context.log({
      ...baseLog,
      message: "TEMP: Loan status change event publish completed",
      loanId: newLoan.id,
      newStatus: newLoan.status,
    });

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
