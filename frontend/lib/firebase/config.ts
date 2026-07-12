/**
 * Firebase configuration — loaded from environment variables.
 * Derived from: tech-spec.md §1, §15
 *
 * Environment variables are prefixed with NEXT_PUBLIC_ for client-side access.
 * Secrets (Admin SDK keys) are server-side only and never client-exposed.
 *
 * NOTE: storageBucket is intentionally omitted — the frontend does not use
 * Firebase Storage. All file uploads go through Express → Cloudinary.
 */

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  // NOTE: No databaseURL — RTDB is not used. Live location tracking uses
  // Firestore (live_locations/{partnerUid}) with onSnapshot listeners.
};

/**
 * Express API base URL.
 * All write operations go through Express — tech-spec.md §1.1
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL!;
