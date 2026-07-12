/**
 * Firebase Admin SDK initialization — server-side only.
 * Derived from: tech-spec.md §3.1, §3.3
 *
 * Used exclusively in:
 * - Next.js API routes (session cookie creation)
 * - Server components that need to verify session cookies
 *
 * NEVER import this file from client components.
 *
 * Initialization is lazy to prevent build-time errors
 * when environment variables are not yet configured.
 */

import { initializeApp, getApps, cert, type ServiceAccount } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

/**
 * Lazy-initialized Firebase Admin Auth instance.
 * Only initializes when first accessed — prevents build-time crashes
 * when FIREBASE_ADMIN_* env vars are not yet set.
 */
function getAdminAuth(): Auth {
  if (getApps().length === 0) {
    const adminConfig: ServiceAccount = {
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    };

    initializeApp({ credential: cert(adminConfig) });
  }

  return getAuth(getApps()[0]);
}

export { getAdminAuth as adminAuth };

/**
 * Helper to get the admin auth instance.
 * Use this in API routes:
 *
 * ```ts
 * import { adminAuth } from "@/lib/firebase/admin";
 * const auth = adminAuth();
 * ```
 */
