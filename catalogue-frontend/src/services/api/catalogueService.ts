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
const BASE_URL = import.meta.env.VITE_CATALOGUE_API_URL;

export async function getAllProducts(): Promise<CategoryProduct[]> {
  const res = await apiGet<ApiResponse<CategoryProduct[]>>(
    `${BASE_URL}/products`
  );
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
