import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { loansContainer } from '../../config/cosmosClient';
import { publishLoanStatusChangedEvent } from '../../events/eventGridPublisher';

export async function authLoanHttp(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const correlationId =
    request.headers.get("x-correlation-id")?.trim() ||
    context.invocationId ||
    "unknown";
  const baseLog = { correlationId, service: "loans-service-func" };

  context.log({
    ...baseLog,
    message: "Http function processed request",
    url: request.url,
  });

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

    const previousStatus = loan.status;

    // Update loan status to 'Approved'
    loan.status = 'Approved';
    loan.approvedAt = new Date().toISOString();
    loan.statusChangedAt = loan.approvedAt;

    await loansContainer.items.upsert(loan);

    const waitlist = Array.isArray(loan.waitlist) ? loan.waitlist : undefined;
    await publishLoanStatusChangedEvent(
      {
        loanId: loan.id,
        deviceId: loan.deviceId,
        userId: loan.userId,
        from: loan.from,
        till: loan.till,
        correlationId,
        previousStatus,
        newStatus: loan.status,
        statusChangedAt: loan.approvedAt,
        waitlist,
      },
      context
    );

    context.log({
      ...baseLog,
      message: "Loan status updated to Approved",
      loanId,
    });

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
    context.log({
      ...baseLog,
      message: "Error authorizing loan",
      error: error?.message ?? String(error),
    });
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
