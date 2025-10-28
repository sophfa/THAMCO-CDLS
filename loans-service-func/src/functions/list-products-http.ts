// Azure Function - List Loans HTTP Trigger

import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { Loan } from '../domain/loan';
import { LoanRepo } from '../domain/loan-repo';
import { CosmosLoanRepo } from '../infra/cosmos-loan-repo';

// Configuration from environment variables
const cosmosOptions = {
  endpoint: process.env.COSMOS_ENDPOINT || 'https://localhost:8081',
  databaseId: process.env.COSMOS_DATABASE || 'loans-db',
  containerId: process.env.COSMOS_CONTAINER || 'Loans',

  key: process.env.COSMOS_KEY,
};

// Initialize repository - in loanion, this could be dependency injected
const loanRepo: LoanRepo = new CosmosLoanRepo(cosmosOptions);

/**
 * Response format for loan list API
 */
interface ListLoansResponse {
  readonly success: boolean;
  readonly data?: Loan[];
  readonly error?: {
    readonly code: string;
    readonly message: string;
  };
  readonly metadata?: {
    readonly count: number;
    readonly timestamp: string;
  };
}

/**
 * Azure Function to list all loans
 *
 * GET /api/loans
 *
 * Returns a list of all loans in the system
 */
export async function listLoansHttp(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('HTTP trigger function processed a request to list loans');

  try {
    const result = await loanRepo.list();

    if (!result.success) {
      throw new Error(
        (result as any).error?.message || 'Failed to fetch loans'
      );
    }

    if (!result.data) {
      throw new Error('No data returned from repository');
    }

    const response: ListLoansResponse = {
      success: true,
      data: result.data,
      metadata: {
        count: result.data.length,
        timestamp: new Date().toISOString(),
      },
    };

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify(response, null, 2),
    };
  } catch (error: any) {
    context.log('Error listing loans:', error);
    const errorResponse: ListLoansResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while listing loans',
      },
    };
    return {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorResponse, null, 2),
    };
  }
}

// Register the function with Azure Functions runtime
app.http('listLoans', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'loans',
  handler: listLoansHttp,
});
