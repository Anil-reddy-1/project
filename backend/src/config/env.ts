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

  // ─── PhonePe Payment Gateway (Phase 3) ─────────────────────────────────────
  PHONEPE_MERCHANT_ID: optionalEnv("PHONEPE_MERCHANT_ID"),
  PHONEPE_SALT_KEY: optionalEnv("PHONEPE_SALT_KEY"),
  PHONEPE_SALT_INDEX: optionalEnv("PHONEPE_SALT_INDEX", "1"),
  PHONEPE_API_BASE_URL: optionalEnv(
    "PHONEPE_API_BASE_URL",
    "https://api-preprod.phonepe.com/apis/pg-sandbox",
  ),
  PHONEPE_REDIRECT_URL: optionalEnv(
    "PHONEPE_REDIRECT_URL",
    "http://localhost:3000/retailer/payment/callback",
  ),
  PHONEPE_WEBHOOK_URL: optionalEnv("PHONEPE_WEBHOOK_URL"),
  PHONEPE_MOCK_MODE: optionalEnv("PHONEPE_MOCK_MODE", "true").toLowerCase() === "true",

  // ─── Order Configuration (Phase 3) ─────────────────────────────────────────
  DEFAULT_TAX_PERCENTAGE: parseFloat(optionalEnv("DEFAULT_TAX_PERCENTAGE", "0")),
  DEFAULT_DELIVERY_CHARGE: parseFloat(optionalEnv("DEFAULT_DELIVERY_CHARGE", "0")),
  ORDER_NUMBER_PREFIX: optionalEnv("ORDER_NUMBER_PREFIX", "ORD"),



  // ─── Brevo (Email Service) ─────────────────────────────────────────────────
  BREVO_API_KEY: optionalEnv("BREVO_API_KEY"),
  BREVO_FROM_EMAIL: optionalEnv("BREVO_FROM_EMAIL", "noreply@wholesalehub.com"),
  BREVO_FROM_NAME: optionalEnv("BREVO_FROM_NAME", "WholesaleHub"),

  // ─── Admin Seed (one-time setup script only) ─────────────────────────────
  // Used by scripts/seed-admin.ts. Never read by the running server.
  ADMIN_EMAIL: optionalEnv("ADMIN_EMAIL"),
  ADMIN_PASSWORD: optionalEnv("ADMIN_PASSWORD"),
  ADMIN_NAME: optionalEnv("ADMIN_NAME", "Platform Admin"),
  ADMIN_PHONE: optionalEnv("ADMIN_PHONE"),
} as const;
