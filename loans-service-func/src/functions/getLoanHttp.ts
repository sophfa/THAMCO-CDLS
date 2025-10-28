// Azure Function - Get Loan by ID HTTP Trigger

import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { Loan } from "../domain/loan";
import { LoanRepo } from "../domain/loan-repo";
import { CosmosLoanRepo } from "../infra/cosmos-loan-repo";

// Configuration from environment variables
const cosmosOptions = {
  endpoint: process.env.COSMOS_ENDPOINT || "https://localhost:8081",
  databaseId: process.env.COSMOS_DATABASE || "loans-db",
  containerId: process.env.COSMOS_CONTAINER || "Loans",
  key: process.env.COSMOS_KEY,
};

// Initialize repository
const loanRepo: LoanRepo = new CosmosLoanRepo(cosmosOptions);

/**
 * Response format for single loan API
 */
interface GetLoanResponse {
  readonly success: boolean;
  readonly data?: Loan;
  readonly error?: {
    readonly code: string;
    readonly message: string;
  };
}

/**
 * Azure Function to get a loan by ID
 *
 * GET /api/loans/{id}
 *
 * Returns a single loan by its ID
 */
export async function getLoanByIdHttp(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const loanId = request.params.id;

  context.log(
    `HTTP trigger function processed a request to get loan: ${loanId}`
  );

  // Validate loan ID parameter
  if (!loanId || loanId.trim().length === 0) {
    const errorResponse: GetLoanResponse = {
      success: false,
      error: {
        code: "INVALID_INPUT",
        message: "Loan ID is required",
      },
    };

    return {
      status: 400,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(errorResponse, null, 2),
    };
  }

  try {
    // Get loan from repository
    const result = await loanRepo.get(loanId.trim());

    if (result.success) {
      const response: GetLoanResponse = {
        success: true,
        data: result.data,
      };

      return {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300", // Cache for 5 minutes
        },
        body: JSON.stringify(response, null, 2),
      };
    }

    // Handle repository errors - result.success is false, so error exists
    const error = (result as { success: false; error: any }).error;
    const statusCode = error.code === "NOT_FOUND" ? 404 : 500;

    const errorResponse: GetLoanResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    };

    return {
      status: statusCode,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(errorResponse, null, 2),
    };
  } catch (error: any) {
    context.log("Error getting loan:", error);

    const errorResponse: GetLoanResponse = {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while retrieving the loan",
      },
    };

    return {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(errorResponse, null, 2),
    };
  }
}

// Register the function with Azure Functions runtime
app.http("getLoanById", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "loans/{id}",
  handler: getLoanByIdHttp,
});
