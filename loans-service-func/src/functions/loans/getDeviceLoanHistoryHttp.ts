import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { loansContainer } from "../../config/cosmosClient";

export async function getDeviceLoanHistoryHttp(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
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
      query: "SELECT * FROM c WHERE c.deviceId = @deviceId ORDER BY c.createdAt DESC",
      parameters: [{ name: "@deviceId", value: decodedDeviceId }],
    };

    const { resources: loans } = await loansContainer.items
      .query(querySpec)
      .fetchAll();

    context.log(`Found ${loans.length} loans for device ${decodedDeviceId}`);

    // Get statistics
    const stats = {
      totalLoans: loans.length,
      byStatus: loans.reduce((acc: Record<string, number>, loan: any) => {
        acc[loan.status] = (acc[loan.status] || 0) + 1;
        return acc;
      }, {}),
      currentLoan: loans.find(
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
    context.error("Error fetching device loan history:", error);
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
