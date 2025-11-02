import { getUserId, getToken } from "../authService";
import type { Loan } from "../../types/models";

const BASE_URL = import.meta.env.VITE_LOANS_API_URL;

async function authed<T>(url: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...init.headers,
  } as Record<string, string>;
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) throw new Error(`${init.method || "GET"} ${url} failed: ${res.status}`);
  return (await res.json()) as T;
}

export async function createReservation(
  deviceId: string,
  startDate: string,
  endDate: string
) {
  // Create a Requested loan; a reservation is just a requested loan
  const userId = await getUserId();
  if (!userId) throw new Error("User not authenticated");

  return authed(`${BASE_URL}/loans`, {
    method: "POST",
    body: JSON.stringify({
      deviceId,
      userId,
      from: startDate,
      till: endDate,
      status: "Requested",
    }),
  });
}

export async function getUserReservations(userId: string): Promise<Loan[]> {
  // Backend may not separate; we fetch all loans and let caller filter by status
  return authed(`${BASE_URL}/loans/user/${encodeURIComponent(userId)}`);
}
