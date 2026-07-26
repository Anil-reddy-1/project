/**
 * Client-side Firebase initialization.
 * Derived from: tech-spec.md §1, §3.1, §4
 *
 * Exports initialized instances of:
 * - Firebase Auth (all roles)
 * - Firestore (real-time listeners for orders, shops, live locations, etc.)
 *
 * IMPORTANT (tech-spec.md §1.1):
 * - Frontend clients subscribe directly to Firestore for READ-ONLY real-time
 *   listeners (onSnapshot), including live_locations/{partnerUid}.
 * - All WRITES go through Express API — never direct client writes.
 *
 * NOTE: Firebase Realtime Database is NOT used.
 * Live delivery partner location tracking uses Firestore onSnapshot
 * on the live_locations/{partnerUid} collection instead of RTDB onValue.
 *
 * NOTE: Firebase Storage is intentionally NOT initialized here.
 * All file uploads go through Express → Cloudinary.
 *
 * Initialization is guarded to prevent build-time errors when
 * NEXT_PUBLIC_FIREBASE_* env vars are not yet configured.
 */

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { firebaseConfig } from "./config";

/**
 * Check if Firebase config is available.
 * Returns false during build time when env vars aren't set.
 */
function isConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

/** Initialize Firebase app — singleton pattern, guarded */
function getApp(): FirebaseApp | null {
  if (!isConfigured()) return null;
  return getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
}

/**
 * Get Firebase Auth instance.
 * Returns null if Firebase is not configured (build time).
 */
export function getFirebaseAuth(): Auth | null {
  const app = getApp();
  return app ? getAuth(app) : null;
}

/**
 * Get Firestore instance.
 * Client-side: read-only real-time listeners (onSnapshot) only.
 * This includes live_locations/{partnerUid} for delivery partner tracking.
 * All writes go through Express API (tech-spec.md §1.1).
 */
export function getFirebaseDb(): Firestore | null {
  const app = getApp();
  return app ? getFirestore(app) : null;
}

/**
 * Convenience exports.
 * These will be null during build/SSR when env vars aren't set.
 * Use the getter functions above for null-safe access.
 */
export const app = getApp();
export const auth = getFirebaseAuth() as import('firebase/auth').Auth;
export const db = getFirebaseDb() as import('firebase/firestore').Firestore;
