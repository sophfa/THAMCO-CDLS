import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { randomUUID } from "crypto";
import { loansContainer } from "../../config/cosmosClient";
import { publishLoanStatusChangedEvent } from "../../events/eventGridPublisher";
import { validateToken } from "../../utils/auth";
import { getWaitlistForDevice } from "../../utils/waitlist";

export async function cancelLoanHttp(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const correlationId =
    req.headers.get("x-correlation-id")?.trim() || randomUUID();
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

    const loanId = req.params.id;

    if (!loanId) {
      return {
        status: 400,
        jsonBody: {
          error: "BAD_REQUEST",
          message: "Loan ID is required",
        },
      };
    }

    // Get the loan record
    const { resource: loan } = await loansContainer.item(loanId, loanId).read();

    if (!loan) {
      return {
        status: 404,
        jsonBody: {
          error: "NOT_FOUND",
          message: `Loan with ID '${loanId}' not found`,
        },
      };
    }

    // Verify the authenticated user matches the loan's userId
    if (authResult.userId !== loan.userId) {
      context.log({
        ...baseLog,
        message: "Access denied: User mismatch",
        userId: authResult.userId,
        loanUserId: loan.userId,
      });
      return {
        status: 403,
        jsonBody: {
          message: "Access denied: Cannot cancel loan for other users",
        },
      };
    }

    // Check if loan can be cancelled (only Requested or Approved loans)
    if (!["Requested", "Approved"].includes(loan.status)) {
      return {
        status: 400,
        jsonBody: {
          error: "INVALID_STATUS",
          message: `Loan cannot be cancelled. Current status: '${loan.status}'`,
          detail:
            'Only loans with status "Requested" or "Approved" can be cancelled',
        },
      };
    }

    const previousStatus = loan.status;

    // Update loan status to 'Cancelled'
    loan.status = "Cancelled";
    loan.cancelledAt = new Date().toISOString();
    loan.statusChangedAt = loan.cancelledAt;

    await loansContainer.items.upsert(loan);

    const waitlist = await getWaitlistForDevice(
      loan.deviceId,
      context,
      baseLog
    );
    context.log({
      ...baseLog,
      message: "TEMP: Publishing loan status change event",
      loanId: loan.id,
      previousStatus,
      newStatus: loan.status,
      statusChangedAt: loan.cancelledAt,
    });
    await publishLoanStatusChangedEvent(
      {
        loanId: loan.id,
        deviceId: loan.deviceId,
        deviceName: loan.deviceName,
        userId: loan.userId,
        from: loan.from,
        till: loan.till,
        correlationId,
        previousStatus,
        newStatus: loan.status,
        statusChangedAt: loan.cancelledAt,
        returnedAt: loan.returnedAt,
        waitlist,
      },
      context
    );
    context.log({
      ...baseLog,
      message: "TEMP: Loan status change event publish completed",
      loanId: loan.id,
      newStatus: loan.status,
    });

    context.log({
      ...baseLog,
      message: "Loan cancelled",
      loanId,
      userId: authResult.userId,
    });

    return {
      status: 200,
      jsonBody: {
        success: true,
        message: "Loan cancelled successfully",
        loan: {
          id: loan.id,
          deviceId: loan.deviceId,
          userId: loan.userId,
          status: loan.status,
          cancelledAt: loan.cancelledAt,
        },
      },
    };
  } catch (error: any) {
    context.error({
      ...baseLog,
      message: "Error cancelling loan",
      error: error?.message ?? String(error),
    });
    return {
      status: 500,
      jsonBody: {
        error: "INTERNAL_SERVER_ERROR",
        message: "Failed to cancel loan",
      },
    };
  }
}

app.http("cancelLoanHttp", {
  methods: ["PUT", "DELETE"],
  route: "loans/{id}/cancel",
  authLevel: "function",
  handler: cancelLoanHttp,
});
