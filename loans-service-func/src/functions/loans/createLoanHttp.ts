import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { loansContainer } from "../../config/cosmosClient";
import { publishLoanStatusChangedEvent } from "../../events/eventGridPublisher";
import { validateToken } from "../../utils/auth";
import "dotenv/config";

const INVENTORY_API_URL = (process.env.INVENTORY_API_URL || "").trim();
const LOCK_TTL_MS = 30_000;
const LOCK_RETRY_DELAY_MS = 150;
const LOCK_MAX_ATTEMPTS = 12;

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const buildInventoryUrl = (deviceId: string): string | null => {
  if (!INVENTORY_API_URL) {
    return null;
  }
  const base = INVENTORY_API_URL.replace(/\/$/, "");
  return `${base}/api/inventory/${encodeURIComponent(deviceId)}`;
};

const fetchInventoryStock = async (
  deviceId: string,
  context: InvocationContext,
  baseLog: { correlationId: string; service: string }
): Promise<number | null> => {
  const url = buildInventoryUrl(deviceId);
  if (!url) {
    context.error({
      ...baseLog,
      message: "INVENTORY_API_URL is not configured",
      deviceId,
    });
    return null;
  }

  const response = await fetch(url);
  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    context.error({
      ...baseLog,
      message: "Failed to fetch inventory stock",
      deviceId,
      status: response.status,
      error: errorBody || response.statusText,
    });
    return null;
  }

  const body = await response.json().catch(() => null);
  const record = (body && (body.data ?? body)) || null;
  const stock = record?.stock;
  if (typeof stock !== "number" || Number.isNaN(stock)) {
    context.error({
      ...baseLog,
      message: "Inventory response missing stock",
      deviceId,
    });
    return null;
  }
  return stock;
};

const getActiveLoanCountForDevice = async (
  deviceId: string
): Promise<number> => {
  const querySpec = {
    query:
      "SELECT VALUE COUNT(1) FROM c WHERE c.deviceId = @deviceId AND c.status IN ('Requested', 'Approved', 'Collected', 'Overdue')",
    parameters: [{ name: "@deviceId", value: deviceId }],
  };
  const { resources } = await loansContainer.items
    .query<number>(querySpec)
    .fetchAll();
  const count = resources?.[0];
  return typeof count === "number" ? count : 0;
};

const acquireDeviceLock = async (
  deviceId: string,
  context: InvocationContext,
  baseLog: { correlationId: string; service: string }
): Promise<string | null> => {
  const lockId = `LOCK-${deviceId}`;

  for (let attempt = 1; attempt <= LOCK_MAX_ATTEMPTS; attempt += 1) {
    const now = new Date();
    const lockDoc = {
      id: lockId,
      type: "reservationLock",
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + LOCK_TTL_MS).toISOString(),
    };

    try {
      await loansContainer.items.create(lockDoc, {
        disableAutomaticIdGeneration: true,
      });
      return lockId;
    } catch (error: any) {
      if (error?.code !== 409) {
        throw error;
      }
    }

    try {
      const existing = await loansContainer.item(lockId, lockId).read<any>();
      const expiresAt = existing.resource?.expiresAt;
      if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
        await loansContainer.item(lockId, lockId).delete();
        continue;
      }
    } catch (error: any) {
      if (error?.code !== 404) {
        context.warn({
          ...baseLog,
          message: "Failed to read reservation lock",
          lockId,
          error: error?.message ?? String(error),
        });
      }
    }

    await sleep(LOCK_RETRY_DELAY_MS * attempt);
  }

  context.warn({
    ...baseLog,
    message: "Reservation lock busy; rejecting request",
    deviceId,
  });
  return null;
};

const releaseDeviceLock = async (
  lockId: string,
  context: InvocationContext,
  baseLog: { correlationId: string; service: string }
): Promise<void> => {
  try {
    await loansContainer.item(lockId, lockId).delete();
  } catch (error: any) {
    if (error?.code !== 404) {
      context.warn({
        ...baseLog,
        message: "Failed to release reservation lock",
        lockId,
        error: error?.message ?? String(error),
      });
    }
  }
};

export async function createLoanHttp(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const correlationId =
    req.headers.get("x-correlation-id")?.trim() ||
    context.invocationId ||
    "unknown";
  const baseLog = { correlationId, service: "loans-service-func" };

  try {
    // Validate authentication token
    const authResult = await validateToken(req, context);
    if (!authResult.isValid) {
      context.log({
        ...baseLog,
        message: "Authentication failed",
        error: authResult.error,
      });
      return {
        status: 401,
        jsonBody: { message: authResult.error || "Unauthorized" },
      };
    }

    const body = (await req.json()) as {
      deviceId?: string;
      userId?: string;
      from?: string;
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
      context.log({
        ...baseLog,
        message: "Access denied: User mismatch",
        userId: authResult.userId,
        requestedUserId: userId,
      });
      return {
        status: 403,
        jsonBody: {
          message: "Access denied: Cannot create loan for other users",
        },
      };
    }

    const now = new Date();
    const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
    const defaultStartHour = 9;
    const defaultEndHour = 17;
    const requestedFrom = (body?.from ?? "").trim();
    let from = now;
    let dateOnlyProvided = false;
    if (requestedFrom) {
      const dateOnlyMatch = requestedFrom.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      const parsed = dateOnlyMatch
        ? new Date(
            Number(dateOnlyMatch[1]),
            Number(dateOnlyMatch[2]) - 1,
            Number(dateOnlyMatch[3]),
            defaultStartHour,
            0,
            0,
            0
          )
        : new Date(requestedFrom);
      if (Number.isNaN(parsed.getTime())) {
        return {
          status: 400,
          jsonBody: { message: "from must be a valid date" },
        };
      }
      from = parsed;
      dateOnlyProvided = Boolean(dateOnlyMatch);
    }
    const till = new Date(from.getTime() + twoDaysMs);
    if (dateOnlyProvided) {
      till.setHours(defaultEndHour, 0, 0, 0);
    }

    const lockId = await acquireDeviceLock(deviceId, context, baseLog);
    if (!lockId) {
      return {
        status: 409,
        jsonBody: {
          message:
            "Reservation is busy for this device. Please try again shortly.",
        },
      };
    }

    try {
      const [stock, activeLoans] = await Promise.all([
        fetchInventoryStock(deviceId, context, baseLog),
        getActiveLoanCountForDevice(deviceId),
      ]);

      if (stock === null) {
        return {
          status: 503,
          jsonBody: {
            message: "Unable to verify availability. Please try again later.",
          },
        };
      }

      if (activeLoans >= stock) {
        return {
          status: 409,
          jsonBody: {
            message:
              "No available devices for this product. Please join the waitlist.",
            activeLoans,
            stock,
          },
        };
      }

      const newLoan = {
        id: `LOAN-${Date.now()}`,
        deviceId,
        userId,
        createdAt: now.toISOString(),
        statusChangedAt: now.toISOString(),
        from: from.toISOString(),
        till: till.toISOString(),
        status: "Requested" as const,
      };

      await loansContainer.items.upsert(newLoan);

      context.log({
        ...baseLog,
        message: "TEMP: Publishing loan status change event",
        loanId: newLoan.id,
        previousStatus: "Created",
        newStatus: newLoan.status,
        statusChangedAt: newLoan.statusChangedAt,
      });
      await publishLoanStatusChangedEvent(
        {
          loanId: newLoan.id,
          deviceId: newLoan.deviceId,
          userId: newLoan.userId,
          from: newLoan.from,
          till: newLoan.till,
          correlationId,
          previousStatus: "Created",
          newStatus: newLoan.status,
          statusChangedAt: newLoan.statusChangedAt,
          waitlist: undefined,
        },
        context
      );
      context.log({
        ...baseLog,
        message: "TEMP: Loan status change event publish completed",
        loanId: newLoan.id,
        newStatus: newLoan.status,
      });

      return { status: 201, jsonBody: newLoan };
    } finally {
      await releaseDeviceLock(lockId, context, baseLog);
    }
  } catch (error: any) {
    context.log({
      ...baseLog,
      message: "Failed to create loan",
      error: error?.message ?? String(error),
    });
    return { status: 500, jsonBody: { message: "Failed to create loan" } };
  }
}

app.http("createLoanHttp", {
  route: "loans",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: createLoanHttp,
});
