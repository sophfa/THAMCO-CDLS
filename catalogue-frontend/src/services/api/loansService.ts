import { getUserId, getToken } from "../authService";
import type { Loan } from "../../types/models";

const BASE_URL = import.meta.env.VITE_LOANS_API_URL;

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
    console.log(`[LoansService] Loan created successfully for device: ${deviceId}`);
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

  const response = await fetch(`${BASE_URL}/loans/${loanId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "Returned" }),
  });

  if (!response.ok) {
    console.error(`[LoansService] Failed to return loan: ${loanId}`, {
      status: response.status,
      statusText: response.statusText,
    });
    throw new Error(`Failed to return loan`);
  }

  const data = (await response.json()) as Loan;
  console.log(`[LoansService] Loan returned successfully: ${loanId}`);
  return data;
}

export async function addToWaitlist(loanId: string, userId: string) {
  console.log(
    `[LoansService] Adding user ${userId} to waitlist for loan: ${loanId}`
  );

  const response = await fetch(`${BASE_URL}/loans/${loanId}/waitlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    console.error(`[LoansService] Failed to add to waitlist`, {
      loanId,
      userId,
      status: response.status,
      statusText: response.statusText,
    });
    throw new Error(`Failed to add to waitlist`);
  }

  const data = await response.json();
  console.log(
    `[LoansService] Successfully added user ${userId} to waitlist for loan: ${loanId}`
  );
  return data;
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

  const response = await fetch(
    `${BASE_URL}/loans/user/${encodeURIComponent(userId)}`
  );

  if (!response.ok) {
    console.error(`[LoansService] Failed to fetch loans for user: ${userId}`, {
      status: response.status,
      statusText: response.statusText,
    });
    throw new Error(`Failed to fetch loans for ${userId}`);
  }

  const data = (await response.json()) as Loan[];
  console.log(
    `[LoansService] Successfully fetched ${
      Array.isArray(data) ? data.length : "unknown"
    } loans for user: ${userId}`
  );
  return data;
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
