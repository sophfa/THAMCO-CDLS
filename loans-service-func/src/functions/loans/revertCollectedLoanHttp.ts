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

export async function revertCollectedLoanHttp(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const correlationId =
    req.headers.get("x-correlation-id")?.trim() || randomUUID();
  const baseLog = { correlationId, service: "loans-service-func" };

  try {
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
    loan.statusChangedAt = revertedAt;

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
      statusChangedAt: revertedAt,
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
        statusChangedAt: revertedAt,
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
      message: "Loan reverted to Approved",
      loanId,
      userId: authResult.userId,
    });

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
    context.error({
      ...baseLog,
      message: "Error reverting collected loan",
      error: error?.message ?? String(error),
    });
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
