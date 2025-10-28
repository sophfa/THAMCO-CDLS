// src/services/api/loansService.ts
import { apiGet, apiPost } from "./httpClient";

const BASE_URL = import.meta.env.VITE_CATALOGUE_API_URL;

export async function getLoans() {
  return apiGet(`${BASE_URL}/loans`);
}

export async function createLoan(payload: {
  userId: string;
  deviceId: string;
}) {
  return apiPost(`${BASE_URL}/create-loan`, payload);
}
