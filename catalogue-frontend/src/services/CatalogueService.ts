import { CategoryProduct } from "../types/models";
import { resolveApiUrl } from "./env";

export type {
  Product as Product,
  LaptopProduct,
  TabletProduct,
  CameraProduct,
  CategoryProduct,
} from "../types/models";

export { isTablet, isCamera, isLaptop } from "../types/models";

const BASE_ROOT = resolveApiUrl({
  dev: import.meta.env.VITE_CATALOGUE_API_URL,
  test: import.meta.env.VITE_CATALOGUE_API_URL_TEST,
  prod: import.meta.env.VITE_CATALOGUE_API_URL_PROD,
}).replace(/\/$/, "");
const BASE_URL = BASE_ROOT ? `${BASE_ROOT}/products` : "";
console.log("[CatalogueService] Base URL:", BASE_URL);

export async function fetchCatalogue(): Promise<CategoryProduct[]> {
  console.log("[CatalogueService] fetchCatalogue start", { url: BASE_URL });
  const response = await fetch(BASE_URL);
  if (!response.ok) throw new Error("Failed to fetch catalogue");
  const body = await response.json();
  console.log("[CatalogueService] fetchCatalogue response", {
    count: body?.data?.length ?? 0,
  });
  return body.data ?? [];
}

export async function fetchProductById(id: string): Promise<CategoryProduct> {
  const response = await fetch(`${BASE_URL}/${id}`);
  if (!response.ok) throw new Error("Failed to fetch product");
  const body = await response.json();
  return body.data;
}
