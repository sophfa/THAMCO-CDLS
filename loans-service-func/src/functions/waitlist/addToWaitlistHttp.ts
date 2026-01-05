import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { loansContainer } from "../../config/cosmosClient";

export async function addToWaitlistHttp(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const correlationId =
    req.headers.get("x-correlation-id")?.trim() ||
    context.invocationId ||
    "unknown";
  const baseLog = { correlationId, service: "loans-service-func" };

  try {
    if (req.method === "OPTIONS") {
      return { status: 204 };
    }
    const { userId } = (await req.json()) as {
      userId: string;
    };
    const loanId = req.params.id;

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

    // Check if user is already in the waitlist
    const trimmedUserId = userId.trim();
    if (loan.waitlist && loan.waitlist.includes(trimmedUserId)) {
      return {
        status: 409,
        jsonBody: {
          error: "ALREADY_EXISTS",
          message: `User '${trimmedUserId}' is already in the waitlist for loan '${loanId}'`,
        },
      };
    }

    // Initialize waitlist if it doesn't exist
    if (!loan.waitlist) {
      loan.waitlist = [];
    }

    // Add user to waitlist
    loan.waitlist.push(trimmedUserId);
    await loansContainer.items.upsert(loan);

    context.log({
      ...baseLog,
      message: "User added to waitlist",
      userId: trimmedUserId,
      loanId,
    });

    return {
      status: 200,
      jsonBody: {
        success: true,
        message: `User '${trimmedUserId}' successfully added to waitlist`,
        loan: {
          id: loan.id,
          deviceId: loan.deviceId,
          waitlist: loan.waitlist,
          waitlistPosition: loan.waitlist.length,
        },
      },
    };
  } catch (error: any) {
    context.log({
      ...baseLog,
      message: "Error adding user to waitlist",
      error: error?.message ?? String(error),
    });

    return {
      status: 500,
      jsonBody: {
        error: "INTERNAL_ERROR",
        message: "An unexpected error occurred while adding user to waitlist",
      },
    };
  }
}

app.http("addToWaitlistHttp", {
  route: "loans/{id}/waitlist",
  methods: ["POST"],
  authLevel: "function",
  handler: addToWaitlistHttp,
});
