const BASE_URL = import.meta.env.VITE_LOANS_API_URL;

export async function createLoan(deviceId: string, userId: string) {
  const response = await fetch(`${BASE_URL}/loans`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId, userId }),
  });
  if (!response.ok) throw new Error(`Failed to create loan`);
  return response.json();
}

export async function returnLoan(loanId: string) {
  const response = await fetch(`${BASE_URL}/loans/${loanId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ loaned: false }),
  });
  if (!response.ok) throw new Error(`Failed to return loan`);
  return response.json();
}

export async function addToWaitlist(loanId: string, userId: string) {
  const response = await fetch(`${BASE_URL}/loans/${loanId}/waitlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  if (!response.ok) throw new Error(`Failed to add to waitlist`);
  return response.json();
}

export async function getUserLoans(userId: string) {
  const response = await fetch(`${BASE_URL}/loans/user/${userId}`);
  if (!response.ok) throw new Error(`Failed to fetch loans for ${userId}`);
  return response.json();
}
