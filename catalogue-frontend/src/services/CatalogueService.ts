export type {
  Product as Product,
  LaptopProduct,
  TabletProduct,
  CameraProduct,
  CategoryProduct,
} from "../types/models";
export { isTablet, isCamera, isLaptop } from "../types/models";
const BASE_URL = import.meta.env.VITE_CATALOGUE_API_URL + "/products";

export async function fetchCatalogue(): Promise<CategoryProduct[]> {
  const response = await fetch(BASE_URL);
  if (!response.ok) throw new Error("Failed to fetch catalogue");
  const body = await response.json();
  return body.data ?? []; // your API returns { success, data: [...] }
}

export async function fetchProductById(id: string): Promise<CategoryProduct> {
  const response = await fetch(`${BASE_URL}/${id}`);
  if (!response.ok) throw new Error("Failed to fetch product");
  const body = await response.json();
  return body.data;
}
