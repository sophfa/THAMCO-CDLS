import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";
import "dotenv/config";

const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT || "https://localhost:8081",
  key: process.env.COSMOS_KEY,
});
const databaseId = process.env.COSMOS_DATABASE || "loans-db";
const containerId = process.env.COSMOS_CONTAINER || "Loans";
const container = client.database(databaseId).container(containerId);

export async function createLoanHttp(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const body = (await req.json()) as {
      deviceId?: string;
      userId?: string;
    };

    const deviceId = (body?.deviceId ?? "").trim();
    const userId = (body?.userId ?? "").trim();

    if (!deviceId || !userId) {
      return {
        status: 400,
        jsonBody: { message: "deviceId and userId are required" },
      };
    }

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
  } catch (error: any) {
    context.log("Failed to create loan:", error);
    return { status: 500, jsonBody: { message: "Failed to create loan" } };
  }
}

app.http("createLoanHttp", {
  route: "loans",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: createLoanHttp,
});
