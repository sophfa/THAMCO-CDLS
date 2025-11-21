import { getToken } from "../authService";
import type { UserListResult, UserProfile } from "../../types/models";

const BASE_URL = (import.meta.env.VITE_USER_SERVICE_API_URL || "").replace(
  /\/$/,
  ""
);

const profileCache = new Map<string, UserProfile>();
let hasLoggedTokenMeta = false;

function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function resolveUrl(path: string): string {
  if (!BASE_URL) {
    throw new Error("VITE_USER_SERVICE_API_URL is not configured");
  }

  if (!path.startsWith("/")) {
    return `${BASE_URL}/${path}`;
  }
  return `${BASE_URL}${path}`;
}

async function authenticatedRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = resolveUrl(path);
  const token = await getToken();
  console.log("token: ", token);
  if (!token) {
    console.warn(
      "[userService] No token available when calling",
      path,
      "- user likely not authenticated"
    );
    throw new Error(
      "User service request failed: no auth token available. Please sign in again."
    );
  }

  if (!hasLoggedTokenMeta) {
    const payload = decodeJwtPayload(token);
    console.log("payload: ", payload);
    console.info("[userService] Token info", {
      preview: `${token.slice(0, 16)}...${token.slice(-8)}`,
      aud: payload?.aud,
      roles:
        payload?.["https://thamco-clds.app/roles"] ??
        payload?.roles ??
        payload?.["https://thamco.com/roles"],
      iss: payload?.iss,
    });
    hasLoggedTokenMeta = true;
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });
  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");

    console.warn("[userService] Request failed", {
      path,
      status: response.status,
      statusText: response.statusText,
      bodyPreview: errorBody?.slice(0, 200),
    });
    const statusInfo = `${response.status} ${response.statusText}`.trim();
    const message =
      response.status === 401
        ? "User directory access is unauthorized for this session. Please sign in again."
        : `User service request failed: ${statusInfo} ${errorBody}`;
    throw new Error(message);
  }

  const body = await response.json();
  return (body?.data ?? body) as T;
}

export async function getUserProfile(
  userId: string,
  opts: { force?: boolean } = {}
): Promise<UserProfile | null> {
  if (!userId) {
    return null;
  }

  if (!opts.force && profileCache.has(userId)) {
    return profileCache.get(userId)!;
  }

  const profile = await authenticatedRequest<UserProfile>(
    `/users/${encodeURIComponent(userId)}`
  );
  profileCache.set(userId, profile);
  return profile;
}

export function getCachedUserProfile(userId: string): UserProfile | undefined {
  return profileCache.get(userId);
}

export async function searchUsers(
  search = "*",
  page = 0,
  pageSize = 25
): Promise<UserListResult> {
  const params = new URLSearchParams({
    search: search && search.trim().length > 0 ? search.trim() : "*",
    page: page.toString(),
    pageSize: pageSize.toString(),
  });

  return authenticatedRequest<UserListResult>(`/users?${params.toString()}`);
}
