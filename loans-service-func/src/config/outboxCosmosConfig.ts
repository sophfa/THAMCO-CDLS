interface OutboxCosmosConfig {
  readonly databaseId: string;
  readonly containerId: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getOutboxCosmosConfig(): OutboxCosmosConfig {
  return {
    databaseId: requireEnv("COSMOS_DATABASE"),
    containerId: requireEnv("COSMOS_CONTAINER_OUTBOX"),
  };
}
