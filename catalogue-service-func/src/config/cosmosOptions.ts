const isLocal =
  (process.env.AZURE_FUNCTIONS_ENVIRONMENT || "").toLowerCase() ===
    "development" || (process.env.NODE_ENV || "").toLowerCase() === "development";

export const COSMOS_OPTIONS = {
  endpoint: process.env.COSMOS_ENDPOINT!,
  databaseId: process.env.COSMOS_DATABASE!,
  containerId: process.env.COSMOS_CONTAINER!,
  key: isLocal ? process.env.COSMOS_KEY : undefined,
};
