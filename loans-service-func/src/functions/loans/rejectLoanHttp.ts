import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { loansContainer } from "../../config/cosmosClient";
import { validateToken } from "../../utils/auth";

export async function rejectLoanHttp(
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

    // Update loan status to 'Rejected'
    loan.status = "Rejected";
    loan.rejectedAt = new Date().toISOString();
    loan.rejectedBy = authResult.userId;
    loan.rejectionReason = reason;

    await loansContainer.items.upsert(loan);

    context.log(
      `Loan ${loanId} rejected by ${authResult.userId}. Reason: ${reason}`
    );

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
    context.error("Error rejecting loan:", error);
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
