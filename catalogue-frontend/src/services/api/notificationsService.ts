const BASE_URL = import.meta.env.VITE_NOTIFICATIONS_API_URL;

export async function getNotificationsForUser(userId: string) {
  const response = await fetch(
    `${BASE_URL}/notifications/${encodeURIComponent(userId)}`
  );
  if (!response.ok)
    throw new Error(`Failed to fetch notifications for ${userId}`);
  return response.json();
}

export async function sendNotification(
  userId: string,
  message: string,
  type: string
) {
  const response = await fetch(`${BASE_URL}/notifications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId,
      message,
      type,
      sentAt: new Date().toISOString(),
    }),
  });
  if (!response.ok) throw new Error(`Failed to send notification`);
  return response.json();
}
