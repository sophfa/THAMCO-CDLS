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
  console.log("responce: ", response);
  return response.json();
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
