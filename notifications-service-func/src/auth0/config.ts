export interface Auth0Config {
  domain: string;
  audience: string;
  clientId: string;
  clientSecret: string;
}

export class MissingAuth0ConfigurationError extends Error {
  constructor(public readonly missingSettings: string[]) {
    super(
      `Auth0 configuration is incomplete: ${missingSettings.join(", ")}`
    );
    this.name = "MissingAuth0ConfigurationError";
  }
}

export function getAuth0Config(): Auth0Config {
  const domain = process.env.AUTH0_DOMAIN?.trim();
  const audience =
    process.env.AUTH0_MGMT_AUDIENCE?.trim() ||
    (domain ? `https://${domain}/api/v2/` : undefined);
  const clientId = process.env.AUTH0_M2M_CLIENT_ID?.trim();
  const clientSecret = process.env.AUTH0_M2M_CLIENT_SECRET?.trim();

  const missing: string[] = [];

  if (!domain) missing.push("AUTH0_DOMAIN");
  if (!audience) missing.push("AUTH0_MGMT_AUDIENCE");
  if (!clientId) missing.push("AUTH0_M2M_CLIENT_ID");
  if (!clientSecret) missing.push("AUTH0_M2M_CLIENT_SECRET");

  if (missing.length > 0) {
    throw new MissingAuth0ConfigurationError(missing);
  }

  return {
    domain,
    audience,
    clientId,
    clientSecret,
  };
}
