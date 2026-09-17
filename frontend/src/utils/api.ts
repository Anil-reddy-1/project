import { auth } from "../firebase";

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000/api/v1";

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const user = auth.currentUser;
  let token = "";

  if (user) {
    token = await user.getIdToken();
  }

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API error: ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  syncUser: () => fetchWithAuth("/users/sync", { method: "POST" }),
  getMe: () => fetchWithAuth("/users/me", { method: "GET" }),
};
