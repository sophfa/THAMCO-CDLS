import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { loansContainer } from "../../config/cosmosClient";
import { validateToken } from "../../utils/auth";
import "dotenv/config";

export async function createLoanHttp(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Validate authentication token
    const authResult = validateToken(req, context);
    if (!authResult.isValid) {
      context.log("Authentication failed:", authResult.error);
      return {
        status: 401,
        jsonBody: { message: authResult.error || "Unauthorized" },
      };
    }

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

    // Verify the authenticated user matches the userId in the request
    if (authResult.userId !== userId) {
      context.log("Access denied: User mismatch");
      return {
        status: 403,
        jsonBody: {
          message: "Access denied: Cannot create loan for other users",
        },
      };
    }

    const now = new Date();
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    const from = now;
    const till = new Date(now.getTime() + oneWeekMs);

    const newLoan = {
      id: `LOAN-${Date.now()}`,
      deviceId,
      userId,
      createdAt: now.toISOString(),
      from: from.toISOString(),
      till: till.toISOString(),
      status: "Requested" as const,
    };

    await loansContainer.items.upsert(newLoan);
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
