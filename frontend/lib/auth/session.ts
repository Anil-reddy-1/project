/**
 * Session management utilities.
 * Derived from: tech-spec.md §3.3
 *
 * Next.js uses Firebase Auth's client SDK to obtain an ID token,
 * exchanged for an httpOnly session cookie via the /api/session route.
 */

/** Session cookie name */
export const SESSION_COOKIE_NAME = "__session";

/** Session cookie max age — 5 days (Firebase default max is 14 days) */
export const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 5; // 5 days in seconds

/**
 * Exchange a Firebase ID token for a session cookie.
 * Calls the /api/session Next.js route handler.
 */
export async function createSession(idToken: string): Promise<void> {
  const response = await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    throw new Error("Failed to create session");
  }
}

/**
 * Clear the session cookie (logout).
 * Calls the /api/session Next.js route handler with DELETE method.
 */
export async function clearSession(): Promise<void> {
  const response = await fetch("/api/session", {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to clear session");
  }
}
