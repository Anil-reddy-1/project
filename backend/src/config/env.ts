/**
 * Environment variable loader — typed & validated.
 * Derived from: tech-spec.md §15
 *
 * Throws at startup if any required variable is missing,
 * so failures are loud and immediate rather than silent runtime errors.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[config] Missing required environment variable: ${name}\n` +
        `  → Copy .env.example to .env and fill in the value.`,
    );
  }
  return value;
}

function optionalEnv(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const env = {
  // ─── Server ────────────────────────────────────────────────────────────────
  PORT: parseInt(optionalEnv("PORT", "3001"), 10),
  NODE_ENV: optionalEnv("NODE_ENV", "development"),
  IS_PRODUCTION: process.env.NODE_ENV === "production",

  // ─── CORS ──────────────────────────────────────────────────────────────────
  /** Comma-separated list of allowed origins */
  CORS_ORIGIN: optionalEnv("CORS_ORIGIN", "http://localhost:3000"),

  // ─── Firebase Admin SDK ────────────────────────────────────────────────────
  FIREBASE_PROJECT_ID: requireEnv("FIREBASE_PROJECT_ID"),
  FIREBASE_CLIENT_EMAIL: requireEnv("FIREBASE_CLIENT_EMAIL"),
  /** Private key with \n escapes normalized to real newlines */
  FIREBASE_PRIVATE_KEY: requireEnv("FIREBASE_PRIVATE_KEY").replace(
    /\\n/g,
    "\n",
  ),
  // NOTE: No FIREBASE_DATABASE_URL — live location tracking uses Firestore, not RTDB.

  // ─── Cloudinary ────────────────────────────────────────────────────────────
  CLOUDINARY_CLOUD_NAME: requireEnv("CLOUDINARY_CLOUD_NAME"),
  CLOUDINARY_API_KEY: requireEnv("CLOUDINARY_API_KEY"),
  CLOUDINARY_API_SECRET: requireEnv("CLOUDINARY_API_SECRET"),

  // ─── Razorpay (Phase 3+) ───────────────────────────────────────────────────
  RAZORPAY_KEY_ID: optionalEnv("RAZORPAY_KEY_ID"),
  RAZORPAY_KEY_SECRET: optionalEnv("RAZORPAY_KEY_SECRET"),
  RAZORPAY_WEBHOOK_SECRET: optionalEnv("RAZORPAY_WEBHOOK_SECRET"),

  // ─── Firebase Cloud Messaging (Phase 1+) ───────────────────────────────────
  FCM_SERVER_KEY: optionalEnv("FCM_SERVER_KEY"),

  // ─── Admin Seed (one-time setup script only) ─────────────────────────────
  // Used by scripts/seed-admin.ts. Never read by the running server.
  ADMIN_EMAIL: optionalEnv("ADMIN_EMAIL"),
  ADMIN_PASSWORD: optionalEnv("ADMIN_PASSWORD"),
  ADMIN_NAME: optionalEnv("ADMIN_NAME", "Platform Admin"),
  ADMIN_PHONE: optionalEnv("ADMIN_PHONE"),
} as const;
