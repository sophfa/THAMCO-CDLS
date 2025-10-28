// src/services/api/catalogueService.ts
import { apiGet } from "./httpClient";

const BASE_URL = import.meta.env.VITE_DEVICES_API_URL;

export async function getAllProducts() {
  return apiGet(`${BASE_URL}/devices`);
}

export async function getProductById(productId: string) {
  return apiGet(`${BASE_URL}/devices/${productId}`);
}
