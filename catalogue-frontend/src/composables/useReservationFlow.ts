import { reactive, ref, watch } from "vue";
import { useAuth } from "./useAuth";
import {
  createLoan,
  joinWaitlistForDevice,
  cancelLoan,
  getUserLoans,
  getUserWaitlistEntries,
} from "../services/api/loansService";
import { getUserId } from "../services/authService";
import type { Product, Loan } from "../types/models";

const ACTIVE_LOAN_STATUSES = new Set([
  "Requested",
  "Approved",
  "Collected",
  "Overdue",
]);
const LOAN_DURATION_DAYS = 2;
const LOAN_DURATION_MS = LOAN_DURATION_DAYS * 24 * 60 * 60 * 1000;

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function computeEndDate(startDate: string): string {
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return "";
  return toDateString(new Date(start.getTime() + LOAN_DURATION_MS));
}

type DialogKind = "reserve" | "waitlist" | "cancel";

type ReservationFlowOptions = {
  onReservationChange?: (args: {
    kind: "reserve" | "cancel";
    product: Product;
  }) => void | Promise<void>;
};

export function useReservationFlow(options: ReservationFlowOptions = {}) {
  const userActiveLoans = ref<
    Map<string, { id: string; status: Loan["status"] }>
  >(new Map());
  const userWaitlistDeviceIds = ref<Set<string>>(new Set());
  const dialog = reactive({
    open: false as boolean,
    kind: "reserve" as DialogKind,
    state: "confirm" as "confirm" | "success" | "error",
    loading: false as boolean,
    error: "" as string,
    product: null as Product | null,
    startDate: "" as string,
    endDate: "" as string,
    loanId: null as string | null,
  });

  const { loggedIn } = useAuth();

  async function loadUserLoans() {
    try {
      const userId = await getUserId();
      if (!userId) {
        userActiveLoans.value = new Map();
        return;
      }
      const loans = await getUserLoans(userId);
      const activeMap = new Map<string, { id: string; status: Loan["status"] }>();
      loans
        .filter((loan) => ACTIVE_LOAN_STATUSES.has(loan.status))
        .forEach((loan) =>
          activeMap.set(loan.deviceId, {
            id: loan.id,
            status: loan.status as Loan["status"],
          })
        );
      userActiveLoans.value = activeMap;
    } catch (e) {
      console.warn("[Reservation] Failed to load user loans:", e);
      userActiveLoans.value = new Map();
    }
  }

  async function loadUserWaitlist() {
    try {
      const userId = await getUserId();
      if (!userId) return;
      const waitlistEntries = await getUserWaitlistEntries(userId);
      userWaitlistDeviceIds.value = new Set(
        waitlistEntries.map((entry) => entry.deviceId)
      );
    } catch (e) {
      console.warn("[Reservation] Failed to load waitlist:", e);
      userWaitlistDeviceIds.value = new Set();
    }
  }

  watch(
    loggedIn,
    async (isLoggedIn) => {
      if (isLoggedIn) {
        try {
          await Promise.all([loadUserLoans(), loadUserWaitlist()]);
        } catch (e) {
          console.warn("[Reservation] Failed to refresh user data", e);
        }
      } else {
        userActiveLoans.value = new Map();
        userWaitlistDeviceIds.value = new Set();
      }
    },
    { immediate: true }
  );

  watch(
    () => dialog.startDate,
    (nextStart) => {
      if (!nextStart) return;
      const nextEnd = computeEndDate(nextStart);
      if (nextEnd && nextEnd !== dialog.endDate) {
        dialog.endDate = nextEnd;
      }
    }
  );

  function hasActiveLoanForProduct(productId: string) {
    return userActiveLoans.value.has(productId);
  }

  function getActiveLoanId(productId: string) {
    return userActiveLoans.value.get(productId)?.id;
  }

  function getActiveLoanStatus(productId: string) {
    return userActiveLoans.value.get(productId)?.status;
  }

  function isOnWaitlist(deviceId: string) {
    return userWaitlistDeviceIds.value.has(deviceId);
  }

  const handleReserveOrWaitlist = (product: Product) => {
    if (hasActiveLoanForProduct(product.id)) {
      const loanId = getActiveLoanId(product.id);
      if (!loanId) return;
      dialog.open = true;
      dialog.kind = "cancel";
      dialog.product = product;
      dialog.state = "confirm";
      dialog.loanId = loanId;
      dialog.startDate = "";
      dialog.endDate = "";
      return;
    }
    dialog.open = true;
    dialog.kind = product.inStock ? "reserve" : "waitlist";
    dialog.product = product;
    dialog.state = "confirm";
    dialog.loanId = null;
    if (product.inStock) {
      const today = new Date();
      const startDate = toDateString(today);
      dialog.startDate = startDate;
      dialog.endDate = computeEndDate(startDate);
    }
  };

  async function confirmDialog() {
    if (!dialog.product) return;
    dialog.loading = true;
    dialog.error = "";
    try {
      if (dialog.kind === "reserve") {
        const start = dialog.startDate || toDateString(new Date());
        const end = computeEndDate(start);
        dialog.startDate = start;
        dialog.endDate = end;
        await createLoan(
          dialog.product.id,
          start,
          end,
          "Requested",
          dialog.product.name
        );
        await loadUserLoans();
      } else if (dialog.kind === "waitlist") {
        const _wl = await joinWaitlistForDevice(dialog.product.id);
        (dialog as any)._waitlistResult = _wl;
        await loadUserWaitlist();
      } else if (dialog.kind === "cancel") {
        const loanId = dialog.loanId;
        if (!loanId) throw new Error("Missing reservation to cancel");
        await cancelLoan(loanId);
        await loadUserLoans();
      }

      if (dialog.kind === "reserve" || dialog.kind === "cancel") {
        try {
          await options.onReservationChange?.({
            kind: dialog.kind,
            product: dialog.product,
          });
        } catch (e) {
          console.warn("[Reservation] Refresh after action failed:", e);
        }
      }

      dialog.state = "success";
    } catch (e: any) {
      const rawMessage =
        typeof e?.message === "string" ? e.message.trim() : "";
      const isGenericFetch =
        !rawMessage || rawMessage.toLowerCase().includes("failed to fetch");
      const fallbackMessage =
        dialog.kind === "reserve"
          ? "We couldn't create your loan right now. Please try again."
          : dialog.kind === "waitlist"
          ? "We couldn't add you to the waitlist right now. Please try again."
          : "We couldn't cancel your reservation right now. Please try again.";
      dialog.state = "error";
      dialog.error = isGenericFetch ? fallbackMessage : rawMessage;
    } finally {
      dialog.loading = false;
    }
  }

  function closeDialog() {
    dialog.open = false;
    dialog.loading = false;
    dialog.error = "";
    dialog.product = null;
    dialog.state = "confirm";
    dialog.startDate = "";
    dialog.endDate = "";
    dialog.loanId = null;
  }

  return {
    dialog,
    userActiveLoans,
    userWaitlistDeviceIds,
    hasActiveLoanForProduct,
    isOnWaitlist,
    handleReserveOrWaitlist,
    getActiveLoanStatus,
    confirmDialog,
    closeDialog,
  };
}
