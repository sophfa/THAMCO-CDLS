import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { validateToken } from "../../utils/auth";
import { loansContainer } from "../../config/cosmosClient";

export async function addToWaitlistByDeviceHttp(
  req: HttpRequest,
  ctx: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Validate authentication token
    const authResult = validateToken(req, ctx);
    if (!authResult.isValid) {
      ctx.log("Authentication failed:", authResult.error);
      return {
        status: 401,
        jsonBody: { message: authResult.error || "Unauthorized" },
      };
    }

    const rawDeviceId = req.params.deviceId ?? "";
    const deviceId = decodeURIComponent(rawDeviceId).trim();
    const body = (await req.json()) as { userId?: string };
    const userId = (body?.userId ?? "").trim();

    if (!deviceId || !userId) {
      return {
        status: 400,
        jsonBody: {
          message: "deviceId route param and userId body are required",
        },
      };
    }

    // Verify the authenticated user matches the userId in the request
    if (authResult.userId !== userId) {
      ctx.log("Access denied: User mismatch");
      return {
        status: 403,
        jsonBody: {
          message: "Access denied: Cannot add other users to waitlist",
        },
      };
    }

    // Find active loan for this device
    const { resources } = await loansContainer.items
      .query({
        query: "SELECT TOP 1 * FROM c WHERE c.deviceId = @deviceId",
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

    await loansContainer.items.upsert(loan);
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
