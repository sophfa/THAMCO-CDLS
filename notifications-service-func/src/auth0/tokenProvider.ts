import { InvocationContext } from "@azure/functions";
import { getAuth0Config } from "./config";

interface CachedToken {
  token: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

export async function getManagementApiToken(
  context?: InvocationContext
): Promise<string> {
  const config = getAuth0Config();

  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const tokenEndpoint = `https://${config.domain}/oauth/token`;
  const body = {
    grant_type: "client_credentials",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    audience: config.audience,
  };

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    context?.error?.(
      `Auth0 token request failed (${response.status} ${response.statusText}): ${errorBody}`
    );
    throw new Error("Failed to obtain Auth0 Management API token");
  }

  const json = (await response.json()) as {
    access_token: string;
    expires_in?: number;
  };

  const expiresInSeconds = typeof json.expires_in === "number" ? json.expires_in : 60;
  const safetyWindowMs = 30 * 1000;
  cachedToken = {
    token: json.access_token,
    expiresAt: Date.now() + expiresInSeconds * 1000 - safetyWindowMs,
  };

  return cachedToken.token;
}
