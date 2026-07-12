/**
 * Express API client — centralized fetch wrapper.
 * Derived from: tech-spec.md §1.1, §3.3, §13
 *
 * All write operations go through Express — the frontend never writes
 * directly to Firestore for sensitive state (tech-spec.md §1.1).
 *
 * Authentication: Firebase ID token sent as Authorization: Bearer <token>
 * Express verifies via Admin SDK on each request (tech-spec.md §3.3).
 */

import { auth } from "@/lib/firebase/client";
import { API_BASE_URL } from "@/lib/firebase/config";

/** API error with structured response data */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Get the current user's Firebase ID token.
 * Returns null if no user is signed in.
 */
async function getIdToken(): Promise<string | null> {
  const user = auth?.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

/**
 * Centralized API client for Express backend communication.
 *
 * - Automatically attaches Firebase ID token
 * - Handles JSON serialization/deserialization
 * - Throws ApiError on non-OK responses
 *
 * @example
 * ```ts
 * const order = await apiClient<Order>("/orders", {
 *   method: "POST",
 *   body: { shopId, items, paymentMethod },
 * });
 * ```
 */
export async function apiClient<T>(
  endpoint: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: unknown;
    headers?: Record<string, string>;
  } = {},
): Promise<T> {
  const { method = "GET", body, headers = {} } = options;

  const token = await getIdToken();

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (token) {
    requestHeaders["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let errorData: unknown;
    try {
      errorData = await response.json();
    } catch {
      errorData = await response.text();
    }
    throw new ApiError(
      `API request failed: ${response.status} ${response.statusText}`,
      response.status,
      errorData,
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
