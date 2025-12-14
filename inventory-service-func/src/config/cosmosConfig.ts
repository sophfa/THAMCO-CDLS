export interface CosmosConfig {
  readonly endpoint: string;
  readonly databaseId: string;
  readonly containerId: string;
  readonly key?: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getCosmosConfig(): CosmosConfig {
  return {
    endpoint: requireEnv("COSMOS_ENDPOINT"),
    databaseId: requireEnv("COSMOS_DATABASE"),
    containerId: requireEnv("COSMOS_CONTAINER"),
    key: process.env.COSMOS_KEY,
  };
}
