import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { loansContainer } from '../../config/cosmosClient';

export async function authLoanHttp(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  try {
    const loanId = request.params.loanId;

    if (!loanId) {
      return {
        status: 400,
        jsonBody: { error: 'Loan ID is required' },
      };
    }

    // Get the loan record
    const { resource: loan } = await loansContainer.item(loanId, loanId).read();

    if (!loan) {
      return {
        status: 404,
        jsonBody: { error: `Loan with ID '${loanId}' not found` },
      };
    }

    // Check if loan is in 'Requested' status
    if (loan.status !== 'Requested') {
      return {
        status: 400,
        jsonBody: {
          error: `Loan cannot be approved. Current status: '${loan.status}'`,
          message: 'Only loans with status "Requested" can be approved'
        },
      };
    }

    // Update loan status to 'Approved'
    loan.status = 'Approved';
    loan.approvedAt = new Date().toISOString();

    await loansContainer.items.upsert(loan);

    context.log(`Loan ${loanId} status updated to 'Approved'`);

    return {
      status: 200,
      jsonBody: {
        message: 'Loan approved successfully',
        loanId: loanId,
        status: 'Approved',
        approvedAt: loan.approvedAt,
        loan: {
          id: loan.id,
          deviceId: loan.deviceId,
          userId: loan.userId,
          status: loan.status
        }
      },
    };
  } catch (error) {
    context.log('Error authorizing loan:', error);
    return {
      status: 500,
      jsonBody: { error: 'Internal server error' },
    };
  }
}

app.http('authLoan', {
  methods: ['PUT', 'PATCH'],
  route: 'loans/{loanId}/authorize',
  authLevel: 'anonymous',
  handler: authLoanHttp,
});
