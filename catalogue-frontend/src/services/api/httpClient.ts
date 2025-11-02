// src/services/api/httpClient.ts
const baseConfig: RequestInit = {
  headers: {
    "Content-Type": "application/json",
  },
};

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, baseConfig);
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    ...baseConfig,
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${url} failed: ${res.status}`);
  return res.json() as Promise<T>;
}
