import { app, EventGridEvent, InvocationContext } from "@azure/functions";
import { InventoryRepo } from "../domain/inventory-repo";
import { getInventoryRepo } from "../infra/inventory-repo-factory";

type LoanStatus =
  | "Requested"
  | "Approved"
  | "Rejected"
  | "Cancelled"
  | "Collected"
  | "Returned"
  | string;

interface LoanStatusChangedEventData {
  loanId: string;
  deviceId: string;
  userId: string;
  newStatus: LoanStatus;
}

const AVAILABLE_STATUSES = new Set<LoanStatus>([
  "Returned",
  "Rejected",
  "Cancelled",
]);

export async function updateInventoryFromLoanEvent(
  event: EventGridEvent,
  context: InvocationContext
): Promise<void> {
  const data = event.data
    ? (event.data as unknown as LoanStatusChangedEventData)
    : undefined;
  const correlationId =
    (data as any)?.correlationId || context.invocationId || "unknown";
  const baseLog = {
    correlationId,
    service: "inventory-service-func",
  };

  const productId = data?.deviceId;
  if (!productId) {
    context.warn({
      ...baseLog,
      message: "Loan status event missing productId; skipping.",
    });
    return;
  }

  const available = AVAILABLE_STATUSES.has(data.newStatus);
  context.log({
    ...baseLog,
    message: "Loan status change processed",
    loanId: data.loanId,
    newStatus: data.newStatus,
    productId,
    available,
  });

  let repo: InventoryRepo;
  try {
    repo = getInventoryRepo();
  } catch (error) {
    context.error({
      ...baseLog,
      message: "Inventory repository is not configured",
      error: error?.message ?? String(error),
    });
    return;
  }

  const result = await repo.setStock(productId, available);

  if (result.success) {
    context.log({
      ...baseLog,
      message: "Inventory updated for product",
      productId,
      stock: result.data.stock,
    });
  } else {
    const err = (
      result as { success: false; error: { code: string; message: string } }
    ).error;
    context.error({
      ...baseLog,
      message: "Failed to update stock for product",
      productId,
      errorCode: err.code,
      error: err.message,
    });
  }
}

app.eventGrid("updateInventoryFromLoanEvent", {
  handler: updateInventoryFromLoanEvent,
});
