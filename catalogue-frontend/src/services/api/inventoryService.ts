import { getToken, getUserId } from "../authService";
import { resolveApiUrl } from "../env";

const RAW_BASE_URL = resolveApiUrl({
  dev: import.meta.env.VITE_INVENTORY_API_URL,
  test: import.meta.env.VITE_INVENTORY_API_URL_TEST,
  prod: import.meta.env.VITE_INVENTORY_API_URL_PROD,
});
const BASE_URL = RAW_BASE_URL ? RAW_BASE_URL.replace(/\/$/, "") : "";
console.log("[InventoryService] Base URL:", BASE_URL);
if (!BASE_URL) {
  console.error(
    "[InventoryService] Missing VITE_INVENTORY_API_URL(_TEST/_PROD); requests will fail."
  );
}

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

export async function getInventoryByProductId(
  productId: string
): Promise<InventoryRecord | null> {
  if (!productId) return null;

  if (stockCache.has(productId)) {
    return stockCache.get(productId)!;
  }

  const url = resolveUrl(`/inventory/${encodeURIComponent(productId)}`);
  const response = await fetch(url);
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
    stockCache.set(productId, record);
  }
  return record;
}

export async function getAvailableStockForProduct(
  productId: string
): Promise<number | null> {
  const record = await getInventoryByProductId(productId);
  const stock = record?.stock;
  return typeof stock === "number" && !Number.isNaN(stock) ? stock : null;
}

export async function getStockForProduct(
  productId: string
): Promise<number | null> {
  const record = await getInventoryByProductId(productId);
  const stock = record?.stock;
  return typeof stock === "number" && !Number.isNaN(stock) ? stock : null;
}

export async function adjustInventoryStock(
  productId: string,
  delta: number,
  reason?: string,
  ref?: string
): Promise<InventoryRecord> {
  if (!productId) {
    throw new Error("Inventory ID is required");
  }
  if (!Number.isInteger(delta)) {
    throw new Error("Stock adjustment must be an integer");
  }

  const token = await getToken();
  if (!token) {
    throw new Error("User not authenticated");
  }
  const userId = await getUserId();

  const url = resolveUrl(
    `/inventory/${encodeURIComponent(productId)}/stock-adjustment`
  );
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      delta,
      lastAdjustedBy: userId ?? "admin",
      lastAdjustmentReason: reason,
      lastAdjustmentRef: ref,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Inventory adjustment failed: ${response.status} ${response.statusText} ${text}`.trim()
    );
  }

  const body = await response.json().catch(() => ({}));
  const record: InventoryRecord | null = (body && (body.data ?? body)) || null;
  if (!record?.id) {
    throw new Error("Inventory adjustment returned an invalid response");
  }
  stockCache.set(record.id, record);
  return record;
}
