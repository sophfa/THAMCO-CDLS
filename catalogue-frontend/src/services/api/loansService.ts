import { getUserId, getToken, logout } from "../authService";
import { resolveApiUrl } from "../env";
import { fetchWithRetry } from "../fetchWithRetry";
import type { Loan, WaitlistEntry } from "../../types/models";

const BASE_URL = resolveApiUrl({
  dev: import.meta.env.VITE_LOANS_API_URL,
  test: import.meta.env.VITE_LOANS_API_URL_TEST,
  prod: import.meta.env.VITE_LOANS_API_URL_PROD,
});
console.log("[LoansService] Base URL:", BASE_URL);
if (!BASE_URL) {
  console.error(
    "[LoansService] Missing VITE_LOANS_API_URL(_TEST/_PROD); requests will fail."
  );
}
const LOANS_FUNCTION_CODE = import.meta.env.VITE_LOANS_API_CODE;
const ACTIVE_LOAN_STATUSES = new Set<Loan["status"]>([
  "Requested",
  "Approved",
  "Collected",
  "Overdue",
]);

async function ensureNoDuplicateLoan(deviceId: string, userId: string) {
  const existing = await getUserLoans(userId);
  const hasActive = existing.some(
    (loan) =>
      loan.deviceId === deviceId && ACTIVE_LOAN_STATUSES.has(loan.status)
  );
  if (hasActive) {
    throw new Error("You already have an active loan for this device");
  }
}

// Helper function for authenticated API calls
async function authenticatedFetch(url: string, options: RequestInit = {}) {
  const token = await getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const method = (options.method ?? "GET").toUpperCase();
  const requester =
    method === "GET" || method === "HEAD" ? fetchWithRetry : fetch;
  const response = await requester(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorMessage = `API call failed: ${response.status} ${response.statusText}`;
    console.error(`[LoansService] ${errorMessage}`, {
      url,
      status: response.status,
      statusText: response.statusText,
      method: options.method || "GET",
    });
    if (response.status === 401 || response.status === 403) {
      try {
        await logout();
      } catch (logoutErr) {
        console.warn(
          "[LoansService] Logout failed after auth error",
          logoutErr
        );
      }
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();

  return data;
}

export interface DeviceLoanHistory {
  deviceId: string;
  loans: Array<
    Pick<Loan, "id" | "userId" | "status" | "from" | "till" | "createdAt">
  >;
  stats?: {
    totalLoans?: number;
    byStatus?: Record<string, number>;
    currentLoan?: unknown;
  };
}

export async function getDeviceLoanHistory(
  deviceId: string
): Promise<DeviceLoanHistory> {
  const data = await authenticatedFetch(
    `${BASE_URL}/loans/device/${encodeURIComponent(deviceId)}`
  );
  return data as DeviceLoanHistory;
}

export async function getActiveLoanCountForDevice(deviceId: string): Promise<{
  activeLoans: number;
  byStatus: Record<string, number>;
}> {
  const history = await getDeviceLoanHistory(deviceId);
  const byStatus = history.stats?.byStatus ?? {};
  const activeLoans = Object.entries(byStatus).reduce(
    (sum, [status, count]) => {
      return ACTIVE_LOAN_STATUSES.has(status as Loan["status"])
        ? sum + (count || 0)
        : sum;
    },
    0
  );
  return { activeLoans, byStatus };
}

export async function createLoan(
  deviceId: string,
  from: string,
  till: string,
  status: Loan["status"] = "Requested"
): Promise<Loan> {
  const userId = await getUserId();
  if (!userId) throw new Error("User not authenticated");

  await ensureNoDuplicateLoan(deviceId, userId);

  const payload = {
    deviceId,
    userId,
    from,
    till,
    status,
  };

  try {
    const loan = await authenticatedFetch(`${BASE_URL}/loans`, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return loan as Loan;
  } catch (error) {
    console.error(
      `[LoansService] Failed to create loan for device: ${deviceId}`,
      error
    );
    throw error;
  }
}

export async function returnLoan(loanId: string): Promise<Loan> {
  try {
    const data = await authenticatedFetch(`${BASE_URL}/loans/${loanId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "Returned" }),
    });

    return data as Loan;
  } catch (error) {
    console.error(`[LoansService] Failed to return loan: ${loanId}`, error);
    throw error;
  }
}

// Admin: list all loans
export async function listAllLoans(): Promise<Loan[]> {
  try {
    const body = await authenticatedFetch(`${BASE_URL}/loans`);
    const data = Array.isArray(body) ? body : body?.data || [];
    return data as Loan[];
  } catch (error) {
    console.error(`[LoansService] Failed to fetch all loans`, error);
    throw error;
  }
}

// Admin: approve (authorize) a requested loan
export async function authorizeLoan(loanId: string): Promise<any> {
  const codeParam = LOANS_FUNCTION_CODE
    ? `?code=${encodeURIComponent(LOANS_FUNCTION_CODE)}`
    : "";
  const url = `${BASE_URL}/loans/${encodeURIComponent(
    loanId
  )}/authorize${codeParam}`;

  try {
    const data = await authenticatedFetch(url, {
      method: "PUT",
    });
    return data;
  } catch (error: any) {
    console.error(`[LoansService] Failed to authorize loan: ${loanId}`, error);
    throw error;
  }
}
export async function addToWaitlist(
  deviceId: string,
  userId: string,
  userEmail: string
): Promise<any> {
  try {
    const data = await authenticatedFetch(
      `${BASE_URL}/loans/${deviceId}/waitlist`,
      {
        method: "POST",
        body: JSON.stringify({ userId, userEmail }),
      }
    );

    return data;
  } catch (error) {
    console.error(
      `[LoansService] Failed to add to waitlist for device: ${deviceId}`,
      error
    );
    throw error;
  }
}

export async function joinWaitlistForDevice(deviceId: string) {
  const userId = await getUserId();
  if (!userId) throw new Error("User not authenticated");

  const data = await authenticatedFetch(
    `${BASE_URL}/loans/device/${encodeURIComponent(deviceId)}/waitlist`,
    {
      method: "POST",
      body: JSON.stringify({ userId }),
    }
  );

  return data;
}

export interface DeviceWaitlistResponse {
  deviceId: string;
  loanId?: string;
  waitlist?: Array<{ userId?: string; position?: number } | string>;
  waitlistCount?: number;
}

export async function getWaitlistForDevice(
  deviceId: string
): Promise<DeviceWaitlistResponse> {
  try {
    const data = await authenticatedFetch(
      `${BASE_URL}/loans/device/${encodeURIComponent(deviceId)}/waitlist`,
      {
        method: "GET",
      }
    );
    return data as DeviceWaitlistResponse;
  } catch (error) {
    console.error(
      `[LoansService] Failed to fetch waitlist for device: ${deviceId}`,
      error
    );
    throw error;
  }
}

export async function cancelLoan(loanId: string): Promise<Loan> {
  try {
    const data = await authenticatedFetch(
      `${BASE_URL}/loans/${encodeURIComponent(loanId)}/cancel`,
      {
        method: "PUT",
      }
    );
    return data as Loan;
  } catch (error) {
    console.error(`[LoansService] Failed to cancel loan: ${loanId}`, error);
    throw error;
  }
}

export async function markLoanCollected(loanId: string): Promise<Loan> {
  try {
    const data = await authenticatedFetch(
      `${BASE_URL}/loans/${encodeURIComponent(loanId)}/collect`,
      {
        method: "PUT",
      }
    );
    return data as Loan;
  } catch (error) {
    console.error(
      `[LoansService] Failed to mark loan collected: ${loanId}`,
      error
    );
    throw error;
  }
}

export async function revertLoanCollection(loanId: string): Promise<Loan> {
  try {
    const data = await authenticatedFetch(
      `${BASE_URL}/loans/${encodeURIComponent(loanId)}/revert-collection`,
      {
        method: "PUT",
      }
    );
    return data as Loan;
  } catch (error) {
    console.error(
      `[LoansService] Failed to revert collection for loan: ${loanId}`,
      error
    );
    throw error;
  }
}

export async function rejectLoan(
  loanId: string,
  reason = "Rejected by admin"
): Promise<Loan> {
  try {
    const data = await authenticatedFetch(
      `${BASE_URL}/loans/${encodeURIComponent(loanId)}/reject`,
      {
        method: "PUT",
        body: JSON.stringify({ reason }),
      }
    );
    return data as Loan;
  } catch (error) {
    console.error(`[LoansService] Failed to reject loan: ${loanId}`, error);
    throw error;
  }
}

export async function getUserLoans(userId: string): Promise<Loan[]> {
  try {
    const data = await authenticatedFetch(
      `${BASE_URL}/loans/user/${encodeURIComponent(userId)}`
    );

    const loans = (Array.isArray(data) ? data : []) as Loan[];

    return loans;
  } catch (error) {
    console.error(
      `[LoansService] Failed to fetch loans for user: ${userId}`,
      error
    );
    throw error;
  }
}

export async function getUserFavorites(userId: string): Promise<string[]> {
  const response = await authenticatedFetch(
    `${BASE_URL}/loans/user/${encodeURIComponent(userId)}/favorites`
  );

  const payload = (response && (response.data ?? response)) || [];
  const items: unknown[] = Array.isArray(payload) ? payload : [];

  const deviceIds = items
    .map((item) =>
      typeof item === "string" ? item : (item as any)?.deviceId ?? ""
    )
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  const unique = Array.from(new Set(deviceIds));

  return unique;
}

export async function addToFavorites(userId: string, deviceId: string) {
  const result = await authenticatedFetch(`${BASE_URL}/favourites`, {
    method: "POST",
    body: JSON.stringify({
      userId: userId,
      deviceId: deviceId,
    }),
  });

  return result;
}

export async function addFavourite(userId: string, deviceId: string) {
  const result = await authenticatedFetch(`${BASE_URL}/favourites`, {
    method: "POST",
    body: JSON.stringify({
      userId: userId,
      deviceId: deviceId,
    }),
  });

  return result;
}

export async function removeFromFavorites(userId: string, deviceId: string) {
  const result = await authenticatedFetch(
    `${BASE_URL}/loans/user/${userId}/favorites/${deviceId}`,
    {
      method: "DELETE",
    }
  );

  return result;
}

export async function syncAllFavorites(userId: string, favoriteIds: string[]) {
  const result = await authenticatedFetch(
    `${BASE_URL}/loans/user/${userId}/favorites`,
    {
      method: "PUT",
      body: JSON.stringify({
        favorites: favoriteIds,
      }),
    }
  );

  return result;
}

export async function clearAllFavorites(userId: string) {
  const result = await authenticatedFetch(
    `${BASE_URL}/loans/user/${userId}/favorites`,
    {
      method: "DELETE",
    }
  );

  return result;
}

export async function getUserWaitlistEntries(
  userId: string
): Promise<WaitlistEntry[]> {
  try {
    const response = await authenticatedFetch(
      `${BASE_URL}/loans/waitlist/${encodeURIComponent(userId)}`
    );

    // Response is an array of { deviceId, position }
    const results = Array.isArray(response) ? response : [];
    // Transform to WaitlistEntry format
    const waitlistEntries: WaitlistEntry[] = results
      .filter((item: any) => item.position !== null)
      .map((item: any) => ({
        deviceId: item.deviceId,
        id: item.loanId,
        userId: userId,
        position: item.position,
        estimatedAvailability: undefined,
      }));

    return waitlistEntries;
  } catch (error) {
    console.error(
      `[LoansService] Failed to fetch waitlist entries for user: ${userId}`,
      error
    );
    // Return empty array on error to prevent breaking the UI
    return [];
  }
}

export async function removeFromWaitlist(
  userId: string,
  loanId: string
): Promise<void> {
  try {
    await authenticatedFetch(
      `${BASE_URL}/loans/${encodeURIComponent(loanId)}/waitlist`,
      {
        method: "DELETE",
        body: JSON.stringify({ userId }),
      }
    );
  } catch (error) {
    console.error(
      `[LoansService] Failed to remove user ${userId} from waitlist for loan: ${loanId}`,
      error
    );
    throw error;
  }
}
