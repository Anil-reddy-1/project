/**
 * Firebase Admin SDK initialization — lazy singleton.
 * Derived from: tech-spec.md §3.1, §3.3
 *
 * Provides:
 * - adminAuth()       → Firebase Admin Auth
 * - adminDb()         → Firestore (all persistent data including live_locations)
 * - adminMessaging()  → Firebase Cloud Messaging
 *
 * NOTE: Realtime Database is NOT used. Live delivery partner location
 * tracking is stored in Firestore (live_locations/{partnerUid}) using
 * Firestore real-time listeners (onSnapshot) instead of RTDB onValue.
 *
 * All initialized from env vars via env.ts — never from a JSON key file.
 */

import * as admin from "firebase-admin";
import { env } from "./env";

let firebaseApp: admin.app.App | null = null;

export function initializeFirebase(): admin.app.App {
  if (firebaseApp) {
    return firebaseApp;
  }

  if (admin.apps.length > 0) {
    firebaseApp = admin.app();
    return firebaseApp;
  }

  try {
    const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = env;

    const hasValidPrivateKey = FIREBASE_PRIVATE_KEY &&
      FIREBASE_PRIVATE_KEY.includes('-----BEGIN PRIVATE KEY-----') &&
      !FIREBASE_PRIVATE_KEY.includes('YOUR_PRIVATE_KEY_HERE');

    if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !hasValidPrivateKey) {
      throw new Error('Firebase credentials are required');
    }

    const serviceAccount = {
      type: 'service_account',
      project_id: FIREBASE_PROJECT_ID,
      private_key: FIREBASE_PRIVATE_KEY,
      client_email: FIREBASE_CLIENT_EMAIL,
    } as admin.ServiceAccount;

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log('Firebase Admin SDK initialized successfully');
    return firebaseApp;
  } catch (error: any) {
    console.error('Failed to initialize Firebase Admin SDK', { error: error.message });
    throw error;
  }
}

/**
 * Firebase Admin Auth instance.
 */
export function adminAuth(): admin.auth.Auth {
  if (!firebaseApp) {
    initializeFirebase();
  }
  return admin.auth();
}

/**
 * Firestore instance.
 */
export function adminDb(): admin.firestore.Firestore {
  if (!firebaseApp) {
    initializeFirebase();
  }
  return admin.firestore();
}

/**
 * Firebase Cloud Messaging instance.
 */
export function adminMessaging(): admin.messaging.Messaging {
  if (!firebaseApp) {
    initializeFirebase();
  }
  return admin.messaging();
}

/**
 * Get FieldValue types from admin.
 */
export function getFieldValue(): typeof admin.firestore.FieldValue {
  if (!firebaseApp) {
    initializeFirebase();
  }
  return admin.firestore.FieldValue;
}
