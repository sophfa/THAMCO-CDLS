import { app, EventGridEvent, InvocationContext } from "@azure/functions";
import { CosmosInventoryRepo } from "../infra/cosmos-inventory-repo";
import { InventoryRepo } from "../domain/inventory-repo";

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

const cosmosOptions = {
  endpoint: process.env.COSMOS_ENDPOINT,
  databaseId: process.env.COSMOS_DATABASE,
  containerId: process.env.COSMOS_CONTAINER,
  key: process.env.COSMOS_KEY,
};

const repo: InventoryRepo = new CosmosInventoryRepo(cosmosOptions);

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

  const inStock = AVAILABLE_STATUSES.has(data.newStatus);
  context.log(
    `Loan ${data.loanId} status ${data.newStatus} -> set device ${data.deviceId} inStock=${inStock}`
  );

  const result = await repo.setStock(data.deviceId, inStock);

  if (result.success) {
    context.log(
      `Inventory updated for device ${data.deviceId}, inStock=${result.data.inStock}`
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
