import { InvocationContext } from "@azure/functions";
import { getManagementApiToken } from "../config/auth0Client";
import { UserListResult, UserProfile } from "../domain/userProfile";

const domain = process.env.AUTH0_DOMAIN;
const cacheTtlMs =
  Number(process.env.USER_CACHE_TTL_SECONDS ?? "120") * 1000;

interface CacheEntry {
  expiresAt: number;
  profile: UserProfile;
}

const profileCache = new Map<string, CacheEntry>();

function mapAuth0User(user: any): UserProfile {
  return {
    id: user.user_id,
    email: user.email,
    name: user.name,
    nickname: user.nickname,
    picture: user.picture,
    roles: user.app_metadata?.roles ?? user.roles ?? [],
    createdAt: user.created_at,
    updatedAt: user.updated_at,
    lastLogin: user.last_login,
    blocked: user.blocked,
    metadata: user.app_metadata,
  };
}

function cacheKey(userId: string): string {
  return userId;
}

export async function fetchUserProfile(
  userId: string,
  context: InvocationContext
): Promise<UserProfile> {
  if (!domain) {
    throw new Error("AUTH0_DOMAIN is not configured");
  }

  const key = cacheKey(userId);
  const cached = profileCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.profile;
  }

  const token = await getManagementApiToken(context);
  const fields =
    "user_id,email,name,nickname,picture,app_metadata,updated_at,last_login,blocked,created_at";
  const response = await fetch(
    `https://${domain}/api/v2/users/${encodeURIComponent(
      userId
    )}?fields=${fields}&include_fields=true`,
    {
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const details = await response.text();
    context.error?.(
      `Auth0 user lookup failed for ${userId}: ${response.status} ${details}`
    );
    throw new Error("User not found");
  }

  const body = await response.json();
  const profile = mapAuth0User(body);

  profileCache.set(key, { expiresAt: Date.now() + cacheTtlMs, profile });
  return profile;
}

export async function listUsers(
  options: {
    search?: string;
    page?: number;
    pageSize?: number;
  },
  context: InvocationContext
): Promise<UserListResult> {
  if (!domain) {
    throw new Error("AUTH0_DOMAIN is not configured");
  }

  const page = Math.max(0, options.page ?? 0);
  const pageSize = Math.min(50, Math.max(1, options.pageSize ?? 25));
  const query =
    options.search && options.search.trim().length > 0
      ? options.search.trim()
      : "*";

  const token = await getManagementApiToken(context);
  const url = new URL(`https://${domain}/api/v2/users`);
  url.searchParams.set("q", query);
  url.searchParams.set("search_engine", "v3");
  url.searchParams.set("per_page", pageSize.toString());
  url.searchParams.set("page", page.toString());
  url.searchParams.set("include_totals", "true");
  url.searchParams.set(
    "fields",
    "user_id,email,name,nickname,picture,app_metadata,blocked,last_login,updated_at,created_at"
  );

  const response = await fetch(url, {
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const details = await response.text();
    context.error?.(
      `Auth0 user search failed: ${response.status} ${details}`
    );
    throw new Error("Unable to search users");
  }

  const payload = await response.json();
  const users = Array.isArray(payload.users)
    ? payload.users.map(mapAuth0User)
    : (payload as any[]).map(mapAuth0User);

  const total = payload.total ?? payload.length ?? users.length;
  const hasMore = page * pageSize + users.length < total;

  return {
    users,
    pagination: {
      page,
      pageSize,
      total,
      hasMore,
    },
  };
}
