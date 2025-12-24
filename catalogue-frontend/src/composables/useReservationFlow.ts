import { reactive, ref, watch } from "vue";
import { useAuth } from "./useAuth";
import {
  createLoan,
  joinWaitlistForDevice,
  cancelLoan,
  getUserLoans,
  getUserWaitlistEntries,
} from "../services/api/loansService";
import { getUserId, getUserEmail } from "../services/authService";
import { createNotification } from "../services/api/notificationsService";
import type { Product } from "../types/models";

const ACTIVE_LOAN_STATUSES = new Set([
  "Requested",
  "Approved",
  "Collected",
  "Overdue",
]);

type DialogKind = "reserve" | "waitlist" | "cancel";

export function useReservationFlow() {
  const userActiveLoans = ref<Map<string, string>>(new Map());
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
      const activeMap = new Map<string, string>();
      loans
        .filter((loan) => ACTIVE_LOAN_STATUSES.has(loan.status))
        .forEach((loan) => activeMap.set(loan.deviceId, loan.id));
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

  function hasActiveLoanForProduct(productId: string) {
    return userActiveLoans.value.has(productId);
  }

  function getActiveLoanId(productId: string) {
    return userActiveLoans.value.get(productId);
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
      const tomorrow = new Date(Date.now() + 86400000);
      dialog.startDate = today.toISOString().slice(0, 10);
      dialog.endDate = tomorrow.toISOString().slice(0, 10);
    }
  };

  async function confirmDialog() {
    if (!dialog.product) return;
    dialog.loading = true;
    dialog.error = "";
    try {
      if (dialog.kind === "reserve") {
        const start = dialog.startDate || new Date().toISOString().slice(0, 10);
        const end =
          dialog.endDate ||
          new Date(Date.now() + 86400000).toISOString().slice(0, 10);
        await createLoan(dialog.product.id, start, end, "Requested");
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

      if (dialog.kind === "reserve" || dialog.kind === "waitlist") {
        try {
          const uid = await getUserId();
          const email = await getUserEmail();
          if (uid) {
            if (dialog.kind === "reserve") {
              const start =
                dialog.startDate || new Date().toISOString().slice(0, 10);
              await createNotification(uid, "Reservation", dialog.product.id, {
                collectionDate: start,
                userEmail: email || undefined,
              });
            } else {
              const wl = ((dialog as any)._waitlistResult as any)?.waitlist as
                | string[]
                | undefined;
              let position: number | undefined;
              if (Array.isArray(wl)) {
                const idx = wl.indexOf(uid);
                position = idx >= 0 ? idx + 1 : wl.length;
              }
              await createNotification(uid, "Waitlist", dialog.product.id, {
                numInQueue: position,
                userEmail: email || undefined,
              });
            }
          }
        } catch (e) {
          console.warn("Notification failed:", e);
        }
      }

      dialog.state = "success";
    } catch (e: any) {
      dialog.state = "error";
      dialog.error = e?.message || "Operation failed";
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
    confirmDialog,
    closeDialog,
  };
}
