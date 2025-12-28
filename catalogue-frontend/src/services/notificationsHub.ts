import * as signalR from "@microsoft/signalr";
import { getToken, getUserId } from "./authService";
import { resolveApiUrl } from "./env";

const BASE_URL = resolveApiUrl({
  dev: import.meta.env.VITE_NOTIFICATIONS_API_URL,
  test: import.meta.env.VITE_NOTIFICATIONS_API_URL_TEST,
  prod: import.meta.env.VITE_NOTIFICATIONS_API_URL_PROD,
});

type NotificationHandler = (payload: unknown) => void;

let connection: signalR.HubConnection | null = null;
let starting: Promise<void> | null = null;
const handlers = new Set<NotificationHandler>();

async function negotiate() {
  if (!BASE_URL) {
    throw new Error("Notifications API URL is not configured");
  }
  const token = await getToken();
  const userId = await getUserId();
  if (!token || !userId) {
    throw new Error("User not authenticated");
  }

  const res = await fetch(`${BASE_URL}/notifications/negotiate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "x-user-id": userId,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Negotiate failed: ${res.status} ${res.statusText} ${text}`.trim()
    );
  }

  const body = await res.json();
  if (!body?.url || !body?.accessToken) {
    throw new Error("Negotiate response missing url/accessToken");
  }
  return body as { url: string; accessToken: string };
}

async function ensureConnection() {
  if (connection) return;
  if (!starting) {
    starting = (async () => {
      const info = await negotiate();
      connection = new signalR.HubConnectionBuilder()
        .withUrl(info.url, {
          accessTokenFactory: () => info.accessToken,
        })
        .withAutomaticReconnect()
        .build();

      connection.on("notificationCreated", (payload) => {
        console.info("[Notifications] SignalR event received", payload);
        handlers.forEach((handler) => handler(payload));
      });
      connection.onreconnected((connectionId) => {
        console.info("[Notifications] SignalR reconnected", connectionId);
      });
      connection.onclose((err) => {
        console.warn("[Notifications] SignalR closed", err);
      });

      await connection.start();
    })().finally(() => {
      starting = null;
    });
  }

  await starting;
}

async function stopConnection() {
  if (!connection) return;
  try {
    await connection.stop();
  } catch (err) {
    console.warn("[Notifications] Failed to stop SignalR connection", err);
  } finally {
    connection = null;
  }
}

export async function subscribeToNotifications(handler: NotificationHandler) {
  handlers.add(handler);
  await ensureConnection();
  return async () => {
    handlers.delete(handler);
    if (handlers.size === 0) {
      await stopConnection();
    }
  };
}

export async function resetNotificationsHub() {
  handlers.clear();
  await stopConnection();
}
