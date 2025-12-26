// src/services/api/catalogueService.ts
import { apiGet } from "./httpClient";
import type {
  ApiResponse,
  Product,
  LaptopProduct,
  TabletProduct,
  CameraProduct,
} from "../../types/models";

type CategoryProduct = LaptopProduct | TabletProduct | CameraProduct;

// Use the correct catalogue service URL from env
const BASE_URL = import.meta.env.PROD
  ? import.meta.env.VITE_CATALOGUE_API_URL_PROD
  : import.meta.env.VITE_CATALOGUE_API_URL;
console.log("[CatalogueApi] Base URL:", BASE_URL);

export async function getAllProducts(): Promise<CategoryProduct[]> {
  console.log("[CatalogueApi] getAllProducts start", { url: `${BASE_URL}/products` });
  const res = await apiGet<ApiResponse<CategoryProduct[]>>(
    `${BASE_URL}/products`
  );
  console.log("[CatalogueApi] getAllProducts response", {
    count: (res as any)?.data?.length ?? (Array.isArray(res) ? res.length : 0),
  });
  return (res as any).data ?? res;
}

export async function getProductById(
  productId: string
): Promise<CategoryProduct> {
  const res = await apiGet<ApiResponse<CategoryProduct>>(
    `${BASE_URL}/products/${encodeURIComponent(productId)}`
  );
  return (res as any).data ?? res;
}
