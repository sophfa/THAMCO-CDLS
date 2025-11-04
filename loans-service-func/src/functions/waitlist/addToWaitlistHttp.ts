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
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
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
          message: "userId is required and cannot be empty"
        }
      };
    }

    if (!loanId || loanId.trim().length === 0) {
      return {
        status: 400,
        jsonBody: {
          error: "BAD_REQUEST",
          message: "Loan ID is required and cannot be empty"
        }
      };
    }

    // Get the loan record
    const { resource: loan } = await container.item(loanId, loanId).read();

    if (!loan) {
      return {
        status: 404,
        jsonBody: {
          error: "NOT_FOUND",
          message: `Loan with ID '${loanId}' not found`
        }
      };
    }

    // Check if user is already in the waitlist
    const trimmedUserId = userId.trim();
    if (loan.waitlist && loan.waitlist.includes(trimmedUserId)) {
      return {
        status: 409,
        jsonBody: {
          error: "ALREADY_EXISTS",
          message: `User '${trimmedUserId}' is already in the waitlist for loan '${loanId}'`
        }
      };
    }

    // Initialize waitlist if it doesn't exist
    if (!loan.waitlist) {
      loan.waitlist = [];
    }

    // Add user to waitlist
    loan.waitlist.push(trimmedUserId);
    await container.items.upsert(loan);

    context.log(`User '${trimmedUserId}' added to waitlist for loan '${loanId}'`);

    return {
      status: 200,
      jsonBody: {
        success: true,
        message: `User '${trimmedUserId}' successfully added to waitlist`,
        loan: {
          id: loan.id,
          deviceId: loan.deviceId,
          waitlist: loan.waitlist,
          waitlistPosition: loan.waitlist.length
        }
      }
    };
  } catch (error: any) {
    context.log('Error adding user to waitlist:', error);
    
    return {
      status: 500,
      jsonBody: {
        error: "INTERNAL_ERROR",
        message: "An unexpected error occurred while adding user to waitlist"
      }
    };
  }
}

app.http("addToWaitlistHttp", {
  route: "loans/{id}/waitlist",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: addToWaitlistHttp,
});
