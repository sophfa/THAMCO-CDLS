import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { loansContainer } from "../../config/cosmosClient";
import { validateToken } from "../../utils/auth";

export async function cancelLoanHttp(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Validate authentication token
    const authResult = validateToken(req, context);
    if (!authResult.isValid) {
      context.log("Authentication failed:", authResult.error);
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
      context.log("Access denied: User mismatch");
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
          detail: 'Only loans with status "Requested" or "Approved" can be cancelled',
        },
      };
    }

    // Update loan status to 'Cancelled'
    loan.status = "Cancelled";
    loan.cancelledAt = new Date().toISOString();

    await loansContainer.items.upsert(loan);

    context.log(`Loan ${loanId} cancelled by user ${authResult.userId}`);

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
    context.error("Error cancelling loan:", error);
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
  authLevel: "anonymous",
  handler: cancelLoanHttp,
});
