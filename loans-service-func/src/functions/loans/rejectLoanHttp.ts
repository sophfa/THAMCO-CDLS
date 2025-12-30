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

export async function rejectLoanHttp(
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
    const body = (await req.json()) as { reason?: string };
    const reason = body?.reason?.trim() || "No reason provided";

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

    // Check if loan is in 'Requested' status
    if (loan.status !== "Requested") {
      return {
        status: 400,
        jsonBody: {
          error: "INVALID_STATUS",
          message: `Loan cannot be rejected. Current status: '${loan.status}'`,
          detail: 'Only loans with status "Requested" can be rejected',
        },
      };
    }

    const previousStatus = loan.status;

    // Update loan status to 'Rejected'
    loan.status = "Rejected";
    loan.rejectedAt = new Date().toISOString();
    loan.statusChangedAt = loan.rejectedAt;
    loan.rejectedBy = authResult.userId;
    loan.rejectionReason = reason;

    await loansContainer.items.upsert(loan);

    const waitlist = Array.isArray(loan.waitlist) ? loan.waitlist : undefined;
    await publishLoanStatusChangedEvent(
      {
        loanId: loan.id,
        deviceId: loan.deviceId,
        userId: loan.userId,
        from: loan.from,
        till: loan.till,
        correlationId,
        previousStatus,
        newStatus: loan.status,
        statusChangedAt: loan.rejectedAt,
        returnedAt: loan.returnedAt,
        reason,
        waitlist,
      },
      context
    );

    context.log({
      ...baseLog,
      message: "Loan rejected",
      loanId,
      userId: authResult.userId,
      reason,
    });

    return {
      status: 200,
      jsonBody: {
        success: true,
        message: "Loan rejected successfully",
        loan: {
          id: loan.id,
          deviceId: loan.deviceId,
          userId: loan.userId,
          status: loan.status,
          rejectedAt: loan.rejectedAt,
          rejectedBy: loan.rejectedBy,
          rejectionReason: loan.rejectionReason,
        },
      },
    };
  } catch (error: any) {
    context.error({
      ...baseLog,
      message: "Error rejecting loan",
      error: error?.message ?? String(error),
    });
    return {
      status: 500,
      jsonBody: {
        error: "INTERNAL_SERVER_ERROR",
        message: "Failed to reject loan",
      },
    };
  }
}

app.http("rejectLoanHttp", {
  methods: ["PUT"],
  route: "loans/{id}/reject",
  authLevel: "anonymous",
  handler: rejectLoanHttp,
});
