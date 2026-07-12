/**
 * Admin Account Seed Script — one-time idempotent setup.
 * Derived from: tech-spec.md §3.1, rules.md §1, schema.md §1
 *
 * Usage:
 *   npm run seed:admin
 *   (requires ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, ADMIN_PHONE in .env)
 *
 * Idempotent: safe to re-run. If admin already exists it will:
 *   - Verify claims are set correctly and fix them if not.
 *   - NOT create a duplicate user or Firestore document.
 *
 * After running:
 *   - Clear ADMIN_EMAIL / ADMIN_PASSWORD from .env (do not leave in production).
 *   - The admin user is the only one who can log in and begin Phase 1 work.
 */

import * as dotenv from "dotenv";
import * as path from "path";

// Load .env before anything else
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { UserRole, UserStatus } from "../src/types";

// ─── Validate required seed vars ─────────────────────────────────────────────

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_NAME = process.env.ADMIN_NAME ?? "Platform Admin";
const ADMIN_PHONE = process.env.ADMIN_PHONE ?? "";

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error(
    "\n[seed-admin] ERROR: ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env\n" +
    "  Edit backend/.env and fill in the Admin Seed section, then re-run.\n"
  );
  process.exit(1);
}

// ─── Initialize Firebase Admin ────────────────────────────────────────────────

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
  console.error(
    "\n[seed-admin] ERROR: Firebase Admin SDK credentials missing in .env\n" +
    "  Ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY are set.\n"
  );
  process.exit(1);
}

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY,
    }),
  });
}

const auth = admin.auth();
const db = admin.firestore();

// ─── Main seed function ───────────────────────────────────────────────────────

async function seedAdmin(): Promise<void> {
  console.log("\n[seed-admin] Starting admin account seed...\n");

  const role: UserRole = "admin";
  const status: UserStatus = "active";
  const claims = { role, status };

  let uid: string;
  let created = false;

  // 1. Check if Firebase Auth user already exists by email
  try {
    const existing = await auth.getUserByEmail(ADMIN_EMAIL!);
    uid = existing.uid;
    console.log(`[seed-admin] Firebase Auth user already exists: ${uid}`);
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code !== "auth/user-not-found") {
      throw err;
    }

    // 2. Create new Firebase Auth user
    const newUser = await auth.createUser({
      email: ADMIN_EMAIL!,
      password: ADMIN_PASSWORD!,
      displayName: ADMIN_NAME,
      emailVerified: true, // admin is internally created — no verification needed
    });

    uid = newUser.uid;
    created = true;
    console.log(`[seed-admin] Created Firebase Auth user: ${uid}`);
  }

  // 3. Set custom claims (idempotent — safe to overwrite)
  await auth.setCustomUserClaims(uid, claims);
  console.log(`[seed-admin] Custom claims set: ${JSON.stringify(claims)}`);

  // 4. Ensure Firebase Auth user is enabled
  await auth.updateUser(uid, { disabled: false });

  // 5. Upsert Firestore users/{uid} document
  //    Using set({ merge: true }) so re-runs don't overwrite createdAt.
  const userDocRef = db.collection("users").doc(uid);
  const now = FieldValue.serverTimestamp();

  await userDocRef.set(
    {
      uid,
      role,
      status,
      name: ADMIN_NAME,
      phone: ADMIN_PHONE,
      email: ADMIN_EMAIL,
      updatedAt: now,
      // createdAt is only set on first write (merge: true preserves existing value)
      ...(created ? { createdAt: now } : {}),
    },
    { merge: true }
  );

  console.log(`[seed-admin] Firestore users/${uid} upserted`);

  // 6. Verification read-back
  const verifyUser = await auth.getUser(uid);
  const verifyDoc = await userDocRef.get();
  const actualClaims = verifyUser.customClaims;

  console.log("\n[seed-admin] ── Verification ──────────────────────────────────");
  console.log(`  uid:          ${uid}`);
  console.log(`  email:        ${verifyUser.email}`);
  console.log(`  disabled:     ${verifyUser.disabled}`);
  console.log(`  customClaims: ${JSON.stringify(actualClaims)}`);
  console.log(`  Firestore doc exists: ${verifyDoc.exists}`);
  console.log(`  Firestore role: ${verifyDoc.data()?.role}`);
  console.log(`  Firestore status: ${verifyDoc.data()?.status}`);

  if (
    actualClaims?.role !== "admin" ||
    actualClaims?.status !== "active" ||
    !verifyDoc.exists ||
    verifyDoc.data()?.role !== "admin"
  ) {
    console.error("\n[seed-admin] VERIFICATION FAILED — check output above.\n");
    process.exit(1);
  }

  console.log("\n[seed-admin] ✓ Admin account seeded and verified successfully.");
  console.log(
    "\n⚠  Next steps:\n" +
    "   1. Clear ADMIN_EMAIL and ADMIN_PASSWORD from backend/.env\n" +
    "   2. Log in at the frontend with the email/password above\n"
  );
}

// ─── Run ──────────────────────────────────────────────────────────────────────

seedAdmin()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n[seed-admin] FATAL ERROR:", err);
    process.exit(1);
  });
