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

export async function revertCollectedLoanHttp(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const authResult = validateToken(req, context);
    if (!authResult.isValid) {
      context.log("Authentication failed:", authResult.error);
      return {
        status: 401,
        jsonBody: { message: authResult.error || "Unauthorized" },
      };
    }

    const loanId = req.params.id;
    const correlationId =
      req.headers.get("x-correlation-id") ?? randomUUID();

    if (!loanId) {
      return {
        status: 400,
        jsonBody: {
          error: "BAD_REQUEST",
          message: "Loan ID is required",
        },
      };
    }

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

    if (loan.status !== "Collected") {
      return {
        status: 400,
        jsonBody: {
          error: "INVALID_STATUS",
          message: `Loan cannot be reverted. Current status: '${loan.status}'`,
          detail: 'Only loans with status "Collected" can be reverted',
        },
      };
    }

    const previousStatus = loan.status;
    const revertedAt = new Date().toISOString();

    loan.status = "Approved";
    delete loan.collectedAt;
    loan.collectionRevertedAt = revertedAt;
    loan.collectionRevertedBy = authResult.userId;

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
        statusChangedAt: revertedAt,
        returnedAt: loan.returnedAt,
      },
      context
    );

    context.log(
      `Loan ${loanId} reverted to 'Approved' by user ${authResult.userId}`
    );

    return {
      status: 200,
      jsonBody: {
        success: true,
        message: "Loan reverted to Approved",
        loan: {
          id: loan.id,
          deviceId: loan.deviceId,
          userId: loan.userId,
          status: loan.status,
          collectionRevertedAt: loan.collectionRevertedAt,
        },
      },
    };
  } catch (error: any) {
    context.error("Error reverting collected loan:", error);
    return {
      status: 500,
      jsonBody: {
        error: "INTERNAL_SERVER_ERROR",
        message: "Failed to revert loan status",
      },
    };
  }
}

app.http("revertCollectedLoanHttp", {
  methods: ["PUT"],
  route: "loans/{id}/revert-collection",
  authLevel: "anonymous",
  handler: revertCollectedLoanHttp,
});
