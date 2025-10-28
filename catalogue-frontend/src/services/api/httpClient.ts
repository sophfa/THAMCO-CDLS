// src/services/api/httpClient.ts
const baseConfig = {
  headers: {
    "Content-Type": "application/json",
  },
};

export async function apiGet(url: string) {
  const res = await fetch(url, baseConfig);
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
  return res.json();
}

export async function apiPost(url: string, body: any) {
  const res = await fetch(url, {
    ...baseConfig,
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${url} failed: ${res.status}`);
  return res.json();
}
