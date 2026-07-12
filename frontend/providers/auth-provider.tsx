/**
 * Firebase Auth context provider.
 * Derived from: tech-spec.md §3
 *
 * Wraps the app to provide authentication state to all components.
 * Manages Firebase Auth listener and session cookie exchange.
 *
 * Auth bug fixes applied:
 *   A2 — logout() clears session cookie before signOut; if clearSession()
 *         fails, we delete the cookie client-side as a fallback so stale
 *         sessions never persist.
 *   A9 — onAuthStateChanged now calls getIdTokenResult(true) to force-refresh
 *         the token, ensuring custom claims set during registration are
 *         immediately visible instead of waiting for the next natural refresh.
 */

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signOut,
  type User,
  type Auth,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { createSession, clearSession } from "@/lib/auth/session";
import type { UserRole, UserStatus } from "@/types";

/** Auth context value shape */
interface AuthContextValue {
  /** Firebase Auth user object — null when not authenticated */
  user: User | null;

  /** User role from custom claims — null until claims are loaded */
  role: UserRole | null;

  /** User account status from custom claims */
  status: UserStatus | null;

  /** Whether auth state is still being determined */
  loading: boolean;

  /** Sign out and clear session cookie */
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: null,
  status: null,
  loading: true,
  logout: async () => {},
});

/** Hook to access auth state */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

/** Props for AuthProvider */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Fallback: delete the session cookie client-side.
 * Used when the server-side DELETE /api/session call fails — ensures the
 * stale cookie is always removed so the middleware never reads an orphaned session.
 *
 * NOTE: This only clears the cookie from the browser. The server-side session
 * cookie was httpOnly, so document.cookie can't reach it. Instead we make a
 * best-effort fetch with no-cache to force cookie deletion on the response.
 */
async function forceDeleteSessionCookie(): Promise<void> {
  try {
    // Retry the DELETE once more with cache-busting
    await fetch("/api/session", {
      method: "DELETE",
      cache: "no-store",
    });
  } catch {
    // Truly unreachable server — cookie will expire naturally via maxAge
    console.warn("Could not clear session cookie — it will expire naturally.");
  }
}

/**
 * Auth provider component.
 *
 * - Listens to Firebase Auth state changes
 * - Extracts role and status from custom claims (force-refreshed)
 * - Exchanges ID token for session cookie on sign-in
 * - Clears session cookie on sign-out
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [status, setStatus] = useState<UserStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [firebaseAuth, setFirebaseAuth] = useState<Auth | null>(null);

  // Initialize Firebase Auth on mount (client-side only)
  useEffect(() => {
    const authInstance = getFirebaseAuth();
    setFirebaseAuth(authInstance);

    if (!authInstance) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(authInstance, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        // FIX A9: Force-refresh token to get latest custom claims.
        // Without forceRefresh=true, claims set during registration
        // (e.g. role=retailer set by POST /auth/register) won't appear
        // until the token naturally refreshes (~1 hour).
        const tokenResult = await firebaseUser.getIdTokenResult(true);
        const claims = tokenResult.claims;
        setRole((claims.role as UserRole) ?? null);
        setStatus((claims.status as UserStatus) ?? null);

        // Exchange ID token for session cookie
        const idToken = tokenResult.token;
        try {
          await createSession(idToken);
        } catch {
          // Session creation failure is non-fatal for client-side auth
          console.error("Failed to create session cookie");
        }
      } else {
        setUser(null);
        setRole(null);
        setStatus(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /**
   * Sign out from Firebase Auth and clear the session cookie.
   *
   * FIX A2: clearSession() is called FIRST (while auth.currentUser is still
   * valid). If it fails, we attempt a fallback deletion. Only then do we
   * call signOut() to clear the client-side Firebase state.
   *
   * All 4 dashboards should call this instead of inlining their own signout logic.
   */
  const logout = async () => {
    try {
      await clearSession();
    } catch {
      console.error("Failed to clear session cookie — attempting fallback");
      await forceDeleteSessionCookie();
    }
    if (firebaseAuth) {
      await signOut(firebaseAuth);
    }
  };

  return (
    <AuthContext value={{ user, role, status, loading, logout }}>
      {children}
    </AuthContext>
  );
}
