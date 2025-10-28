// src/services/api/notificationsService.ts
import { apiPost } from "./httpClient";

const BASE_URL = import.meta.env.VITE_NOTIFICATIONS_API_URL;

export async function subscribeToDevice(deviceId: string, userId: string) {
  return apiPost(`${BASE_URL}/subscribe`, { deviceId, userId });
}
