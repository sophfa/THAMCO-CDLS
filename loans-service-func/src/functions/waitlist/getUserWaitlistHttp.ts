import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { validateToken, verifyUserAccess } from "../../utils/auth";
import { loansContainer } from "../../config/cosmosClient";

export async function getUserWaitlistPositionsHttp(
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

    const raw = req.params.userId ?? "";
    const userId = decodeURIComponent(raw).trim();

    // Verify the authenticated user is requesting their own data
    if (!verifyUserAccess(authResult.userId!, userId)) {
      ctx.log("Access denied: User mismatch");
      return {
        status: 403,
        jsonBody: {
          message: "Access denied: Cannot access other user waitlist data",
        },
      };
    }

    // Fetch all loans where userId is in the waitlist array
    const { resources } = await loansContainer.items
      .query({
        query:
          "SELECT c.id, c.deviceId, c.waitlist FROM c WHERE ARRAY_CONTAINS(c.waitlist, @userId)",
        parameters: [{ name: "@userId", value: userId }],
      })
      .fetchAll();

    // Map to product id and position (1-based index)
    const results = resources.map((item) => {
      const position = item.waitlist.indexOf(userId);
      return {
        loanId: item.id,
        deviceId: item.deviceId,
        position: position >= 0 ? position + 1 : null,
      };
    });

    return { status: 200, jsonBody: results };
  } catch (error: any) {
    ctx.log("Failed to get waitlist positions for user:", error);
    return {
      status: 500,
      jsonBody: { message: "Failed to fetch user waitlist positions" },
    };
  }
}

app.http("getUserWaitlistPositionsHttp", {
  methods: ["GET"],
  route: "loans/waitlist/{userId}",
  authLevel: "anonymous",
  handler: getUserWaitlistPositionsHttp,
});
