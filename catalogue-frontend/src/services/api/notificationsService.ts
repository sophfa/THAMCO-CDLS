import { apiPost } from "./httpClient";
import { getProductById } from "./catalogueService";
import { getToken } from "../authService";
import { resolveApiUrl } from "../env";
import { fetchWithRetry } from "../fetchWithRetry";

const BASE_URL = resolveApiUrl({
  dev: import.meta.env.VITE_NOTIFICATIONS_API_URL,
  test: import.meta.env.VITE_NOTIFICATIONS_API_URL_TEST,
  prod: import.meta.env.VITE_NOTIFICATIONS_API_URL_PROD,
});

console.log("[NotificationsService] Base URL:", BASE_URL);

export type UiNotification = {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  timestamp: Date;
};

export function normalizeNotification(raw: any): UiNotification | null {
  if (!raw) return null;
  const id = raw?.id || raw?.notificationId || raw?._id;
  if (!id) return null;
  const ts = raw?.createdAt || raw?.timestamp;
  const date = ts
    ? new Date(ts)
    : raw?._ts
    ? new Date(raw._ts * 1000)
    : new Date();
  return {
    id,
    title: raw?.title || raw?.type || "Notification",
    message: raw?.message || raw?.content || raw?.payload?.message || "",
    type: String(raw?.type || "system").toLowerCase(),
    read: Boolean(raw?.read),
    timestamp: date,
  };
}

async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getToken();
  if (!token) throw new Error("User not authenticated");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  const method = (options.method ?? "GET").toUpperCase();
  const requester =
    method === "GET" || method === "HEAD" ? fetchWithRetry : fetch;
  return requester(url, { ...options, headers });
}

export async function getNotificationsForUser(userId: string) {
  const response = await fetchWithAuth(
    `${BASE_URL}/notifications/user/${encodeURIComponent(userId)}`,
    { cache: "no-store" }
  );
  if (!response.ok)
    throw new Error(`Failed to fetch notifications for ${userId}`);
  const body = await response.json();
  // Backend returns { success, data } or an array; normalize to UI-friendly array
  const raw = Array.isArray(body) ? body : body?.data || [];
  return raw
    .map((n: any) => normalizeNotification(n))
    .filter((n: UiNotification | null): n is UiNotification => Boolean(n));
}

export async function markNotificationRead(id: string, read: boolean = true) {
  const res = await fetchWithAuth(
    `${BASE_URL}/notifications/${encodeURIComponent(id)}/read`,
    {
      method: "PATCH",
      body: JSON.stringify({ read }),
    }
  );
  if (!res.ok) throw new Error(`Failed to update read status for ${id}`);
  return res.json();
}

export async function sendNotification(
  userId: string,
  message: string,
  type: string
) {
  const t = (type || "").toLowerCase();
  const mappedType: NotificationType =
    t === "reservation" || t === "reserve"
      ? "Reservation"
      : t === "waitlist"
      ? "Waitlist"
      : t === "accepted"
      ? "Accepted"
      : t === "rejected"
      ? "Rejected"
      : t === "cancelled" || t === "canceled"
      ? "Cancelled"
      : t === "collected"
      ? "Collected"
      : t === "returned"
      ? "Returned"
      : "Custom";

  const payload: Record<string, any> = {
    userId,
    type: mappedType,
    content: message,
  };

  return apiPost(`${BASE_URL}/notifications`, payload);
}

export type NotificationType =
  | "Waitlist"
  | "Reservation"
  | "Accepted"
  | "Rejected"
  | "Cancelled"
  | "Collected"
  | "Returned"
  | "Custom";

type CreateNotificationExtras = {
  collectionDate?: string;
  returnDate?: string;
  reason?: string;
  content?: any;
  numInQueue?: number;
  userEmail?: string;
};

// Creates a notification via notifications function app
export async function createNotification(
  userId: string,
  type: NotificationType,
  deviceId?: string,
  extras?: CreateNotificationExtras
) {
  if (!BASE_URL) {
    console.warn(
      "[Notifications] Missing VITE_NOTIFICATIONS_API_URL(_TEST/_PROD); skipping create."
    );
    return { skipped: true };
  }
  const payload: Record<string, any> = { userId, type };

  if (deviceId) {
    try {
      const product = await getProductById(deviceId as string);
      if (product?.name) payload.deviceName = product.name;
    } catch (e) {
      // If lookup fails, continue without deviceName; backend will validate
      // Optionally attach raw deviceId for traceability
      payload.deviceId = deviceId;
    }
  }
  if (!payload.deviceName && deviceId) {
    payload.deviceName = deviceId;
  }

  if (extras) {
    const {
      collectionDate,
      returnDate,
      reason,
      content,
      numInQueue,
      userEmail,
    } = extras;
    if (collectionDate) payload.collectionDate = collectionDate;
    if (returnDate) payload.returnDate = returnDate;
    if (reason) payload.reason = reason;
    if (typeof content !== "undefined") payload.content = content;
    if (typeof numInQueue === "number") payload.numInQueue = numInQueue;
    if (userEmail) payload.userEmail = userEmail;
  }

  console.info("[Notifications] createNotification payload", payload);
  const res = await fetchWithAuth(`${BASE_URL}/notifications`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to create notification: ${res.status} ${res.statusText} ${text}`.trim()
    );
  }
  const data = await res.json().catch(() => ({}));
  console.info("[Notifications] createNotification success", data);
  return data;
}
