import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";
import "dotenv/config";

const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  key: process.env.COSMOS_KEY!,
});
const container = client
  .database(process.env.COSMOS_DATABASE!)
  .container(process.env.COSMOS_CONTAINER!);

export async function returnLoanHttp(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const loanId = req.params.id;

  try {
    // Read the existing loan record
    const { resource: loan } = await container.item(loanId, loanId).read();

    if (!loan) {
      return { status: 404, jsonBody: { error: `Loan ${loanId} not found` } };
    }

    // Update the loan status
    loan.loaned = false;
    loan.lastReturnedDate = new Date().toISOString();

    await container.items.upsert(loan);

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
