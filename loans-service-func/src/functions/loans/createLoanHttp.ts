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

export async function createLoanHttp(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const { deviceId, userId } = (await req.json()) as {
    deviceId: string;
    userId: string;
  };

  const newLoan = {
    id: `LOAN-${Date.now()}`,
    deviceId,
    loaned: true,
    userId,
    waitlist: [],
    lastLoanedDate: new Date().toISOString(),
  };

  await container.items.upsert(newLoan);
  return { status: 201, jsonBody: newLoan };
}

app.http("createLoanHttp", {
  route: "loans",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: createLoanHttp,
});
