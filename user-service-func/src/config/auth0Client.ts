import { InvocationContext } from "@azure/functions";

const domain = process.env.AUTH0_DOMAIN;
const clientId = process.env.AUTH0_M2M_CLIENT_ID;
const clientSecret = process.env.AUTH0_M2M_CLIENT_SECRET;
const audience = process.env.AUTH0_AUDIENCE;

interface TokenCacheEntry {
  token: string;
  expiresAt: number;
}

let cache: TokenCacheEntry | null = null;

async function requestClientCredentialsToken(
  context: InvocationContext
): Promise<TokenCacheEntry> {
  if (!domain || !clientId || !clientSecret || !audience) {
    throw new Error("Auth0 machine-to-machine configuration is incomplete");
  }

  const response = await fetch(`https://${domain}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      audience,
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    context.error?.(
      `Auth0 token request failed (${response.status}): ${errorBody}`
    );
    throw new Error("Unable to obtain Auth0 access token");
  }

  const body = (await response.json()) as {
    access_token: string;
    expires_in: number;
    token_type: string;
  };

  const expiresAt = Date.now() + body.expires_in * 1000 - 30000;
  return { token: `${body.token_type} ${body.access_token}`, expiresAt };
}

export async function getManagementApiToken(
  context: InvocationContext
): Promise<string> {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.token;
  }

  cache = await requestClientCredentialsToken(context);
  return cache.token;
}
