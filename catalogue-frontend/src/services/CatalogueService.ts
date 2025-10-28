export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  model: string;
  processor: string;
  ram: string;
  storage: string;
  gpu: string;
  display: string;
  os: string;
  batteryLife: string;
  weight: string;
  ports: string[];
  connectivity: string[];
  description: string;
  imageUrl: string;
  price: number;
  inStock: boolean;
  createdAt: string;
  _rid: string;
  _self: string;
  _etag: string;
  _attachments: string;
  _ts: number;
}

const BASE_URL = import.meta.env.VITE_CATALOGUE_API_URL + "/products";

export async function fetchCatalogue(): Promise<Product[]> {
  const response = await fetch(BASE_URL);
  if (!response.ok) throw new Error("Failed to fetch catalogue");
  const body = await response.json();
  return body.data ?? []; // your API returns { success, data: [...] }
}

export async function fetchProductById(id: string): Promise<Product> {
  const response = await fetch(`${BASE_URL}/${id}`);
  if (!response.ok) throw new Error("Failed to fetch product");
  const body = await response.json();
  return body.data;
}
