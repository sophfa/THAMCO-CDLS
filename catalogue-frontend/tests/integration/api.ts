type ServiceName = "inventory" | "catalogue" | "loans" | "notifications";

const envVarMap: Record<ServiceName, string> = {
  inventory: "API_INVENTORY_BASE_URL",
  catalogue: "API_CATALOGUE_BASE_URL",
  loans: "API_LOANS_BASE_URL",
  notifications: "API_NOTIFICATIONS_BASE_URL",
};

const baseUrlCache: Partial<Record<ServiceName, string>> = {};

function requireServiceBaseUrl(service: ServiceName): string {
  if (baseUrlCache[service]) {
    return baseUrlCache[service] as string;
  }

  const envVarName = envVarMap[service];
  const raw = process.env[envVarName];
  if (!raw || raw.trim().length === 0) {
    throw new Error(`${envVarName} is required to run integration tests for ${service}.`);
  }

  const normalized = raw.trim().replace(/\/+$/, "");
  baseUrlCache[service] = normalized;
  return normalized;
}

export function getServiceBaseUrl(service: ServiceName): string {
  return requireServiceBaseUrl(service);
}

export function hasServiceBaseUrl(service: ServiceName): boolean {
  return Boolean(
    baseUrlCache[service] ?? (() => {
      try {
        requireServiceBaseUrl(service);
        return true;
      } catch {
        return false;
      }
    })()
  );
}

export function getHealthUrl(service: ServiceName): string {
  return `${requireServiceBaseUrl(service)}/health`;
}

export function getInventoryUrl(productId: string): string {
  return `${requireServiceBaseUrl("inventory")}/inventory/${encodeURIComponent(productId)}`;
}
