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
