import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";

const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT || "https://localhost:8081",
  key: process.env.COSMOS_KEY,
});
const databaseId = process.env.COSMOS_DATABASE || "loans-db";
const containerId = process.env.COSMOS_CONTAINER || "Loans";
const container = client.database(databaseId).container(containerId);

export async function addToWaitlistByDeviceHttp(
  req: HttpRequest,
  ctx: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const rawDeviceId = req.params.deviceId ?? "";
    const deviceId = decodeURIComponent(rawDeviceId).trim();
    const body = (await req.json()) as { userId?: string };
    const userId = (body?.userId ?? "").trim();

    if (!deviceId || !userId) {
      return {
        status: 400,
        jsonBody: { message: "deviceId route param and userId body are required" },
      };
    }

    // Find active loan for this device
    const { resources } = await container.items
      .query({
        query:
          "SELECT TOP 1 * FROM c WHERE c.deviceId = @deviceId",
        parameters: [{ name: "@deviceId", value: deviceId }],
      })
      .fetchAll();

    let loan = resources && resources[0];
    if (!loan) {
      // Create a placeholder loan record to hold the waitlist
      loan = {
        id: `LOAN-${deviceId}`,
        deviceId,
        userId: null,
        loaned: false,
        waitlist: [],
        createdAt: new Date().toISOString(),
      };
    }
    loan.waitlist = Array.isArray(loan.waitlist) ? loan.waitlist : [];
    if (!loan.waitlist.includes(userId)) {
      loan.waitlist.push(userId);
    }

    await container.items.upsert(loan);
    return { status: 200, jsonBody: loan };
  } catch (error: any) {
    ctx.log("Failed to add to waitlist by device:", error);
    return { status: 500, jsonBody: { message: "Failed to add to waitlist" } };
  }
}

app.http("addToWaitlistByDeviceHttp", {
  route: "loans/device/{deviceId}/waitlist",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: addToWaitlistByDeviceHttp,
});
