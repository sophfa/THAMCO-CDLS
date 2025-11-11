import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import "dotenv/config";
import { loansContainer } from "../../config/cosmosClient";

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

    // Update the loan status to fit the new model
    loan.status = 'Returned';

    await loansContainer.items.upsert(loan);

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
