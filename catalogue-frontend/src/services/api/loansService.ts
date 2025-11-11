import { getUserId, getToken } from "../authService";
import type { Loan, WaitlistEntry } from "../../types/models";

const BASE_URL = import.meta.env.VITE_LOANS_API_URL;
const LOANS_FUNCTION_CODE = import.meta.env.VITE_LOANS_API_CODE;

// Helper function for authenticated API calls
async function authenticatedFetch(url: string, options: RequestInit = {}) {
  console.log(`[LoansService] Making API call to: ${url}`, {
    method: options.method || "GET",
    headers: options.headers,
  });

  const token = await getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(url, {
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
    throw new Error(errorMessage);
  }

  const data = await response.json();
  console.log(`[LoansService] API call successful:`, {
    url,
    status: response.status,
    dataLength: Array.isArray(data) ? data.length : Object.keys(data).length,
  });

  return data;
}

export async function createLoan(
  deviceId: string,
  from: string,
  till: string,
  status: Loan["status"] = "Requested"
): Promise<Loan> {
  console.log(
    `[LoansService] Creating loan for device: ${deviceId} from ${from} to ${till} (${status})`
  );

  const userId = await getUserId();
  if (!userId) throw new Error("User not authenticated");

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
    console.log(
      `[LoansService] Loan created successfully for device: ${deviceId}`
    );
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
  console.log(`[LoansService] Returning loan: ${loanId}`);

  try {
    const data = await authenticatedFetch(`${BASE_URL}/loans/${loanId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "Returned" }),
    });

    console.log(`[LoansService] Loan returned successfully: ${loanId}`);
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
    // Support either { success, data } or raw array
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
  console.log(
    `[LoansService] Adding user ${userId} to waitlist for device: ${deviceId}`
  );

  try {
    const data = await authenticatedFetch(
      `${BASE_URL}/loans/${deviceId}/waitlist`,
      {
        method: "POST",
        body: JSON.stringify({ userId, userEmail }),
      }
    );

    console.log(
      `[LoansService] Successfully added user ${userId} to waitlist for device: ${deviceId}`
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
  console.log(`[LoansService] Joining waitlist for device: ${deviceId}`);

  const userId = await getUserId();
  if (!userId) throw new Error("User not authenticated");

  const data = await authenticatedFetch(
    `${BASE_URL}/loans/device/${encodeURIComponent(deviceId)}/waitlist`,
    {
      method: "POST",
      body: JSON.stringify({ userId }),
    }
  );

  console.log(
    `[LoansService] Successfully joined waitlist for device: ${deviceId}`
  );
  return data;
}

export async function getUserLoans(userId: string): Promise<Loan[]> {
  console.log(`[LoansService] Fetching loans for user: ${userId}`);

  try {
    const data = await authenticatedFetch(
      `${BASE_URL}/loans/user/${encodeURIComponent(userId)}`
    );

    const loans = (Array.isArray(data) ? data : []) as Loan[];
    console.log(
      `[LoansService] Successfully fetched ${loans.length} loans for user: ${userId}`
    );
    return loans;
  } catch (error) {
    console.error(
      `[LoansService] Failed to fetch loans for user: ${userId}`,
      error
    );
    throw error;
  }
}

// === FAVORITES API METHODS ===

export async function getUserFavorites(userId: string): Promise<string[]> {
  console.log(`[LoansService] Fetching favorites for user: ${userId}`);

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

  console.log(
    `[LoansService] Successfully fetched ${unique.length} favorites for user: ${userId}`
  );
  return unique;
}

export async function addToFavorites(userId: string, deviceId: string) {
  console.log(
    `[LoansService] Adding device ${deviceId} to favorites for user: ${userId}`
  );

  const result = await authenticatedFetch(`${BASE_URL}/favourites`, {
    method: "POST",
    body: JSON.stringify({
      userId: userId,
      deviceId: deviceId,
    }),
  });

  console.log(
    `[LoansService] Successfully added device ${deviceId} to favorites for user: ${userId}`
  );
  return result;
}

export async function addFavourite(userId: string, deviceId: string) {
  console.log(
    `[LoansService] Adding device ${deviceId} to favorites for user: ${userId}`
  );
  console.log("base url:", BASE_URL);

  const result = await authenticatedFetch(`${BASE_URL}/favourites`, {
    method: "POST",
    body: JSON.stringify({
      userId: userId,
      deviceId: deviceId,
    }),
  });

  console.log(
    `[LoansService] Successfully added device ${deviceId} to favorites for user: ${userId}`
  );
  return result;
}

export async function removeFromFavorites(userId: string, deviceId: string) {
  console.log(
    `[LoansService] Removing device ${deviceId} from favorites for user: ${userId}`
  );

  const result = await authenticatedFetch(
    `${BASE_URL}/loans/user/${userId}/favorites/${deviceId}`,
    {
      method: "DELETE",
    }
  );

  console.log(
    `[LoansService] Successfully removed device ${deviceId} from favorites for user: ${userId}`
  );
  return result;
}

export async function syncAllFavorites(userId: string, favoriteIds: string[]) {
  console.log(
    `[LoansService] Syncing ${favoriteIds.length} favorites for user: ${userId}`,
    favoriteIds
  );

  const result = await authenticatedFetch(
    `${BASE_URL}/loans/user/${userId}/favorites`,
    {
      method: "PUT",
      body: JSON.stringify({
        favorites: favoriteIds,
      }),
    }
  );

  console.log(
    `[LoansService] Successfully synced ${favoriteIds.length} favorites for user: ${userId}`
  );
  return result;
}

export async function clearAllFavorites(userId: string) {
  console.log(`[LoansService] Clearing all favorites for user: ${userId}`);

  const result = await authenticatedFetch(
    `${BASE_URL}/loans/user/${userId}/favorites`,
    {
      method: "DELETE",
    }
  );

  console.log(
    `[LoansService] Successfully cleared all favorites for user: ${userId}`
  );
  return result;
}

// === WAITLIST API METHODS ===

export async function getUserWaitlistEntries(
  userId: string
): Promise<WaitlistEntry[]> {
  console.log(`[LoansService] Fetching waitlist entries for user: ${userId}`);

  try {
    const response = await authenticatedFetch(
      `${BASE_URL}/loans/waitlist/${encodeURIComponent(userId)}`
    );

    // Response is an array of { deviceId, position }
    const results = Array.isArray(response) ? response : [];
    console.log("results: ", results);
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

    console.log(
      `[LoansService] Successfully fetched ${
        waitlistEntries.length
      } waitlist entries for user: ${userId}, value: ${JSON.stringify(
        waitlistEntries
      )}`
    );
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
  console.log(
    `[LoansService] Removing user ${userId} from waitlist for loan: ${loanId}`
  );

  try {
    await authenticatedFetch(
      `${BASE_URL}/loans/${encodeURIComponent(loanId)}/waitlist`,
      {
        method: "DELETE",
        body: JSON.stringify({ userId }),
      }
    );

    console.log(
      `[LoansService] Successfully removed user ${userId} from waitlist for loan: ${loanId}`
    );
  } catch (error) {
    console.error(
      `[LoansService] Failed to remove user ${userId} from waitlist for loan: ${loanId}`,
      error
    );
    throw error;
  }
}
