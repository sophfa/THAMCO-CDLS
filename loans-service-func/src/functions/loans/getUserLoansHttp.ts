import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { validateToken, verifyUserAccess } from "../../utils/auth";
import { loansContainer } from "../../config/cosmosClient";

export async function getUserLoansHttp(
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
        jsonBody: { message: "Access denied: Cannot access other user data" },
      };
    }

    const { resources } = await loansContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.userId = @userId",
        parameters: [{ name: "@userId", value: userId }],
      })
      .fetchAll();

    return { status: 200, jsonBody: resources };
  } catch (error: any) {
    ctx.log("Failed to get loans for user:", error);
    return {
      status: 500,
      jsonBody: { message: "Failed to fetch user loans" },
    };
  }
}

app.http("getUserLoansHttp", {
  methods: ["GET"],
  route: "loans/user/{userId}",
  authLevel: "anonymous",
  handler: getUserLoansHttp,
});
