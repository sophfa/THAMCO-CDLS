import { getStockForProduct } from "./inventoryService";
import { getActiveLoanCountForDevice } from "./loansService";

const ACTIVE_LOAN_STATUSES = new Set([
  "Requested",
  "Approved",
  "Collected",
  "Overdue",
]);

export interface AvailabilityResult {
  stock: number | null;
  activeLoans: number;
  available: number | null;
  rawStats?: Record<string, number>;
}

/**
 * Fetches inventory stock from the inventory service and active loan counts
 * from the loans service, then computes currently available units.
 */
export async function getAvailabilityForProduct(
  productId: string
): Promise<AvailabilityResult> {
  const [stock, loanStats] = await Promise.all([
    getStockForProduct(productId),
    getActiveLoanCountForDevice(productId),
  ]);

  const activeLoans = loanStats.activeLoans;
  const available =
    typeof stock === "number"
      ? Math.max(stock - activeLoans, 0)
      : null;

  return {
    stock,
    activeLoans,
    available,
    rawStats: loanStats.byStatus,
  };
}
