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

export async function collectLoanHttp(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Validate authentication token
    const authResult = await validateToken(req, context);
    if (!authResult.isValid) {
      context.log("Authentication failed:", authResult.error);
      return {
        status: 401,
        jsonBody: { message: authResult.error || "Unauthorized" },
      };
    }

    const loanId = req.params.id;
    const correlationId = req.headers.get("x-correlation-id") ?? randomUUID();

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

    // Check if loan is in 'Approved' status
    if (loan.status !== "Approved") {
      return {
        status: 400,
        jsonBody: {
          error: "INVALID_STATUS",
          message: `Loan cannot be collected. Current status: '${loan.status}'`,
          detail: 'Only loans with status "Approved" can be collected',
        },
      };
    }

    const previousStatus = loan.status;

    // Update loan status to 'Collected'
    loan.status = "Collected";
    loan.collectedAt = new Date().toISOString();

    await loansContainer.items.upsert(loan);

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
        statusChangedAt: loan.collectedAt,
        collectedAt: loan.collectedAt,
        returnedAt: loan.returnedAt,
      },
      context
    );

    context.log(
      `Loan ${loanId} status updated to 'Collected' by user ${authResult.userId}`
    );

    return {
      status: 200,
      jsonBody: {
        success: true,
        message: "Loan collected successfully",
        loan: {
          id: loan.id,
          deviceId: loan.deviceId,
          userId: loan.userId,
          status: loan.status,
          collectedAt: loan.collectedAt,
          from: loan.from,
          till: loan.till,
        },
      },
    };
  } catch (error: any) {
    context.error("Error collecting loan:", error);
    return {
      status: 500,
      jsonBody: {
        error: "INTERNAL_SERVER_ERROR",
        message: "Failed to collect loan",
      },
    };
  }
}

app.http("collectLoanHttp", {
  methods: ["PUT"],
  route: "loans/{id}/collect",
  authLevel: "anonymous",
  handler: collectLoanHttp,
});
