import { InvocationContext } from "@azure/functions";
import { getAuth0Config, MissingAuth0ConfigurationError } from "./config";
import { getManagementApiToken } from "./tokenProvider";

export interface Auth0UserProfile {
  id: string;
  email?: string;
  name?: string;
  userMetadata?: Record<string, unknown>;
  appMetadata?: Record<string, unknown>;
}

interface CachedProfile {
  profile: Auth0UserProfile;
  expiresAt: number;
}

const profileCache = new Map<string, CachedProfile>();
const PROFILE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getUserProfileById(
  userId: string,
  context?: InvocationContext
): Promise<Auth0UserProfile | null> {
  if (!userId) {
    return null;
  }

  try {
    const cached = profileCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.profile;
    }

    const config = getAuth0Config();
    const token = await getManagementApiToken(context);

    const response = await fetch(
      `https://${config.domain}/api/v2/users/${encodeURIComponent(userId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status === 404) {
      context?.log?.(`Auth0 user not found for id ${userId}`);
      return null;
    }

    if (!response.ok) {
      const errorBody = await response.text();
      context?.error?.(
        `Failed to fetch Auth0 user ${userId}: ${response.status} ${response.statusText} ${errorBody}`
      );
      throw new Error("Auth0 user lookup failed");
    }

    const rawProfile = await response.json();
    const profile: Auth0UserProfile = {
      id: rawProfile.user_id ?? userId,
      email: rawProfile.email,
      name: rawProfile.name,
      userMetadata: rawProfile.user_metadata,
      appMetadata: rawProfile.app_metadata,
    };

    profileCache.set(userId, {
      profile,
      expiresAt: Date.now() + PROFILE_TTL_MS,
    });

    return profile;
  } catch (error) {
    if (error instanceof MissingAuth0ConfigurationError) {
      context?.log?.(
        "Auth0 configuration incomplete. Skipping user lookup.",
        error.missingSettings
      );
      return null;
    }

    context?.error?.("Unexpected error during Auth0 user lookup:", error);
    throw error;
  }
}

export async function getUserEmailById(
  userId: string,
  context?: InvocationContext
): Promise<string | undefined> {
  const profile = await getUserProfileById(userId, context);
  return profile?.email;
}
