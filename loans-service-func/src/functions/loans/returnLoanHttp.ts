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
import { getWaitlistForDevice } from "../../utils/waitlist";

export async function returnLoanHttp(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const loanId = req.params.id;
  const correlationId =
    req.headers.get("x-correlation-id")?.trim() ||
    context.invocationId ||
    "unknown";
  const baseLog = { correlationId, service: "loans-service-func" };

  try {
    // Read the existing loan record
    const { resource: loan } = await loansContainer.item(loanId, loanId).read();

    if (!loan) {
      return { status: 404, jsonBody: { error: `Loan ${loanId} not found` } };
    }

    const previousStatus = loan.status;

    // Update the loan status to fit the new model
    loan.status = "Returned";
    loan.returnedAt = new Date().toISOString();
    loan.statusChangedAt = loan.returnedAt;

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
      statusChangedAt: loan.returnedAt,
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
        statusChangedAt: loan.returnedAt,
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
      message: "Loan marked as returned",
      loanId,
    });
    return { status: 200, jsonBody: loan };
  } catch (error: any) {
    context.log({
      ...baseLog,
      message: "Error returning loan",
      loanId,
      error: error?.message ?? String(error),
    });
    return { status: 500, jsonBody: { error: error.message } };
  }
}

app.http("returnLoanHttp", {
  route: "loans/{id}",
  methods: ["PATCH"],
  authLevel: "anonymous",
  handler: returnLoanHttp,
});
