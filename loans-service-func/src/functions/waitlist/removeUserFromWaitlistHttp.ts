import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { loansContainer } from "../../config/cosmosClient";
import { validateToken } from "../../utils/auth";

export async function removeUserFromWaitlistHttp(
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

    const loanId = req.params.id;
    const { userId } = (await req.json()) as { userId: string };

    // Validate input
    if (!userId || userId.trim().length === 0) {
      return {
        status: 400,
        jsonBody: {
          error: "BAD_REQUEST",
          message: "userId is required and cannot be empty",
        },
      };
    }

    if (!loanId || loanId.trim().length === 0) {
      return {
        status: 400,
        jsonBody: {
          error: "BAD_REQUEST",
          message: "Loan ID is required and cannot be empty",
        },
      };
    }

    const trimmedUserId = userId.trim();

    // Verify the authenticated user matches the userId in the request
    if (authResult.userId !== trimmedUserId) {
      context.log("Access denied: User mismatch");
      return {
        status: 403,
        jsonBody: {
          message: "Access denied: Cannot remove other users from waitlist",
        },
      };
    }

    // Get the loan record
    const { resource: loan } = await loansContainer.item(loanId, loanId).read();

    if (!loan) {
      return {
        status: 404,
        jsonBody: {
          error: "NOT_FOUND",
          message: `Loan with ID '${loanId}' not found`,
        },
      };
    }

    // Check if waitlist exists and user is in it
    if (!loan.waitlist || !Array.isArray(loan.waitlist)) {
      return {
        status: 404,
        jsonBody: {
          error: "NOT_FOUND",
          message: `User '${trimmedUserId}' is not in the waitlist for loan '${loanId}'`,
        },
      };
    }

    const userIndex = loan.waitlist.indexOf(trimmedUserId);
    if (userIndex === -1) {
      return {
        status: 404,
        jsonBody: {
          error: "NOT_FOUND",
          message: `User '${trimmedUserId}' is not in the waitlist for loan '${loanId}'`,
        },
      };
    }

    // Remove user from waitlist
    loan.waitlist.splice(userIndex, 1);
    await loansContainer.items.upsert(loan);

    context.log(
      `User '${trimmedUserId}' removed from waitlist for loan '${loanId}'`
    );

    return {
      status: 200,
      jsonBody: {
        success: true,
        message: `User '${trimmedUserId}' successfully removed from waitlist`,
        loan: {
          id: loan.id,
          deviceId: loan.deviceId,
          waitlist: loan.waitlist,
        },
      },
    };
  } catch (error: any) {
    context.error("Error removing user from waitlist:", error);
    return {
      status: 500,
      jsonBody: {
        error: "INTERNAL_SERVER_ERROR",
        message: "Failed to remove user from waitlist",
      },
    };
  }
}

app.http("removeUserFromWaitlistHttp", {
  methods: ["DELETE"],
  route: "loans/{id}/waitlist",
  authLevel: "anonymous",
  handler: removeUserFromWaitlistHttp,
});
