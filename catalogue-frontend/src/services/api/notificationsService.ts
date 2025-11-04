import { apiPost } from "./httpClient";
import { getProductById } from "./catalogueService";
const BASE_URL = import.meta.env.VITE_NOTIFICATIONS_API_URL;

export async function getNotificationsForUser(userId: string) {
  console.log("getting notifs for user: ", userId);
  const response = await fetch(
    `${BASE_URL}/notifications/user/${encodeURIComponent(userId)}`
  );
  if (!response.ok)
    throw new Error(`Failed to fetch notifications for ${userId}`);
  const body = await response.json();
  // Backend returns { success, data } or an array; normalize to UI-friendly array
  const raw = Array.isArray(body) ? body : body?.data || [];
  const mapped = raw.map((n: any) => {
    const ts = n?.createdAt || n?.timestamp;
    const date = ts ? new Date(ts) : n?._ts ? new Date(n._ts * 1000) : new Date();
    return {
      id: n?.id || n?.notificationId || n?._id,
      title: n?.title || n?.type || "Notification",
      message: n?.message || n?.content || n?.payload?.message || "",
      type: String(n?.type || "system").toLowerCase(),
      read: Boolean(n?.read),
      timestamp: date,
    };
  });
  return mapped;
}

export async function markNotificationRead(id: string, read: boolean = true) {
  const res = await fetch(
    `${BASE_URL}/notifications/${encodeURIComponent(id)}/read`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
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

  console.log("payload: ", payload);
  // POST to /api/notifications (function app route)
  return apiPost(`${BASE_URL}/notifications`, payload);
}
