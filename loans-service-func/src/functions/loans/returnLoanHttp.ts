import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { randomUUID } from "crypto";
import "dotenv/config";
import { loansContainer } from "../../config/cosmosClient";
import { publishLoanStatusChangedEvent } from "../../events/eventGridPublisher";

export async function returnLoanHttp(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const loanId = req.params.id;

  try {
    // Read the existing loan record
    const { resource: loan } = await loansContainer.item(loanId, loanId).read();

    if (!loan) {
      return { status: 404, jsonBody: { error: `Loan ${loanId} not found` } };
    }

    const correlationId = req.headers.get("x-correlation-id") ?? randomUUID();
    const previousStatus = loan.status;

    // Update the loan status to fit the new model
    loan.status = "Returned";
    loan.returnedAt = new Date().toISOString();
    loan.statusChangedAt = loan.returnedAt;

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
        statusChangedAt: loan.returnedAt,
        returnedAt: loan.returnedAt,
        waitlist,
      },
      context
    );

    context.log(`Loan ${loanId} marked as returned.`);
    return { status: 200, jsonBody: loan };
  } catch (error: any) {
    context.log(`Error returning loan ${loanId}:`, error);
    return { status: 500, jsonBody: { error: error.message } };
  }
}

app.http("returnLoanHttp", {
  route: "loans/{id}",
  methods: ["PATCH"],
  authLevel: "anonymous",
  handler: returnLoanHttp,
});
