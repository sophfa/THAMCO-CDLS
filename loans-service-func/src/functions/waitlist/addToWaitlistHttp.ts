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

export async function addToWaitlistHttp(
  req: HttpRequest
): Promise<HttpResponseInit> {
  const { userId } = (await req.json()) as {
    userId: string;
  };
  const loanId = req.params.id;

  const { resource: loan } = await container.item(loanId, loanId).read();

  if (!loan) return { status: 404, body: "Loan not found" };

  loan.waitlist.push(userId);
  await container.items.upsert(loan);

  return { status: 200, jsonBody: loan };
}

app.http("addToWaitlistHttp", {
  route: "loans/{id}/waitlist",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: addToWaitlistHttp,
});
