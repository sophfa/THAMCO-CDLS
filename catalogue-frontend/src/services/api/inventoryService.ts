const BASE_URL = (import.meta.env.VITE_INVENTORY_API_URL || "").replace(
  /\/$/,
  ""
);

export interface InventoryRecord {
  id: string;
  deviceIds?: string[];
  deviceId?: string;
  stock?: number;
  [key: string]: unknown;
}

const stockCache = new Map<string, InventoryRecord>();

function resolveUrl(path: string): string {
  if (!BASE_URL) {
    throw new Error("VITE_INVENTORY_API_URL is not configured");
  }
  return path.startsWith("/") ? `${BASE_URL}${path}` : `${BASE_URL}/${path}`;
}

export async function getInventoryByDeviceId(
  deviceId: string
): Promise<InventoryRecord | null> {
  if (!deviceId) return null;

  if (stockCache.has(deviceId)) {
    console.log("stockcache ", deviceId, stockCache.get(deviceId));
    return stockCache.get(deviceId)!;
  }

  const url = resolveUrl(`/inventory/${encodeURIComponent(deviceId)}`);
  const response = await fetch(url);
  console.log("response: ", response);
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const text = await response.text().catch(() => "");
    throw new Error(
      `Inventory request failed: ${response.status} ${response.statusText} ${text}`
    );
  }

  const body = await response.json().catch(() => null);
  const record: InventoryRecord | null = (body && (body.data ?? body)) || null;

  if (record) {
    console.log("stock for: ", deviceId, "is", record);
    stockCache.set(deviceId, record);
  }
  return record;
}

export async function getAvailableStockForDevice(
  deviceId: string
): Promise<number | null> {
  const record = await get(deviceId);
  const stock = record?.stock;
  console.log("available stock: ", deviceId, "=>", stock);
  return typeof stock === "number" && !Number.isNaN(stock) ? stock : null;
}

export async function getStockForDevice(
  deviceId: string
): Promise<number | null> {
  const record = await getInventoryByDeviceId(deviceId);
  const stock = record?.stock;
  console.log("stock: ", deviceId, "=>", stock);
  return typeof stock === "number" && !Number.isNaN(stock) ? stock : null;
}
