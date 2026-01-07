import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { loansContainer } from "../../config/cosmosClient";
import { validateToken } from "../../utils/auth";

export async function getDeviceLoanHistoryHttp(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  if (req.method === "OPTIONS") {
    return { status: 204 };
  }
  const auth = await validateToken(req, context);
  if (!auth.isValid || !auth.userId) {
    return {
      status: 401,
      jsonBody: { error: "Unauthorized" },
    };
  }
  const correlationId =
    req.headers.get("x-correlation-id")?.trim() ||
    context.invocationId ||
    "unknown";
  const baseLog = { correlationId, service: "loans-service-func" };

  try {
    const deviceId = req.params.deviceId;

    if (!deviceId) {
      return {
        status: 400,
        jsonBody: {
          error: "BAD_REQUEST",
          message: "Device ID is required",
        },
      };
    }

    const decodedDeviceId = decodeURIComponent(deviceId).trim();

    // Query all loans for this device
    const querySpec = {
      query:
        "SELECT * FROM c WHERE c.deviceId = @deviceId ORDER BY c.createdAt DESC",
      parameters: [{ name: "@deviceId", value: decodedDeviceId }],
    };

    const { resources: loans } = await loansContainer.items
      .query(querySpec)
      .fetchAll();

    context.log({
      ...baseLog,
      message: "Found loans for device",
      deviceId: decodedDeviceId,
      count: loans.length,
    });

    // Get statistics
    const stats = {
      totalLoans: loans.length,
      byStatus: loans.reduce((acc: Record<string, number>, loan: any) => {
        acc[loan.status] = (acc[loan.status] || 0) + 1;
        return acc;
      }, {}),
      currentLoan:
        loans.find(
          (loan: any) =>
            loan.status === "Collected" || loan.status === "Approved"
        ) || null,
    };

    return {
      status: 200,
      jsonBody: {
        deviceId: decodedDeviceId,
        loans: loans.map((loan: any) => ({
          id: loan.id,
          userId: loan.userId,
          status: loan.status,
          createdAt: loan.createdAt,
          from: loan.from,
          till: loan.till,
          approvedAt: loan.approvedAt,
          collectedAt: loan.collectedAt,
          returnedAt: loan.returnedAt,
          cancelledAt: loan.cancelledAt,
          rejectedAt: loan.rejectedAt,
          rejectionReason: loan.rejectionReason,
          waitlist: loan.waitlist,
        })),
        stats,
      },
    };
  } catch (error: any) {
    context.error({
      ...baseLog,
      message: "Error fetching device loan history",
      error: error?.message ?? String(error),
    });
    return {
      status: 500,
      jsonBody: {
        error: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch device loan history",
      },
    };
  }
}

app.http("getDeviceLoanHistoryHttp", {
  methods: ["GET"],
  route: "loans/device/{deviceId}",
  authLevel: "anonymous",
  handler: getDeviceLoanHistoryHttp,
});
