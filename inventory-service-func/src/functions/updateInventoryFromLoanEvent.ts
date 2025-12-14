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

  if (!data?.deviceId) {
    context.warn("Loan status event missing deviceId; skipping.");
    return;
  }

  const available = AVAILABLE_STATUSES.has(data.newStatus);
  context.log(
    `Loan ${data.loanId} status ${data.newStatus} -> set device ${data.deviceId} available=${available}`
  );

  let repo: InventoryRepo;
  try {
    repo = getInventoryRepo();
  } catch (error) {
    context.error("Inventory repository is not configured", error);
    return;
  }

  const result = await repo.setStock(data.deviceId, available);

  if (result.success) {
    context.log(
      `Inventory updated for device ${data.deviceId}, stock=${result.data.stock}`
    );
  } else {
    const err = (result as { success: false; error: { code: string; message: string } }).error;
    context.error(
      `Failed to update stock for device ${data.deviceId}: ${err.code} ${err.message}`
    );
  }
}

app.eventGrid("updateInventoryFromLoanEvent", {
  handler: updateInventoryFromLoanEvent,
});
