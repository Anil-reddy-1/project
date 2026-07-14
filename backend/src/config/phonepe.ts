/**
 * PhonePe Payment Gateway Configuration
 * Phase 3: Order Placement & Payments
 * 
 * Official Documentation: https://developer.phonepe.com/v1/docs/payments-overview
 */

import { env } from "./env";

export const phonePeConfig = {
  merchantId: env.PHONEPE_MERCHANT_ID,
  saltKey: env.PHONEPE_SALT_KEY,
  saltIndex: env.PHONEPE_SALT_INDEX,
  apiBaseUrl: env.PHONEPE_API_BASE_URL,
  redirectUrl: env.PHONEPE_REDIRECT_URL,
  webhookUrl: env.PHONEPE_WEBHOOK_URL,
  
  // API endpoints
  endpoints: {
    pay: "/pg/v1/pay",
    status: (merchantId: string, merchantTransactionId: string) =>
      `/pg/v1/status/${merchantId}/${merchantTransactionId}`,
    refund: "/pg/v1/refund", // Future use
  },
  
  // Payment configuration
  paymentConfig: {
    redirectMode: "POST" as const,
    paymentInstrumentType: "PAY_PAGE" as const, // Universal payment page
    expiryMinutes: 30, // Payment link expiry
    maxRetries: 3,
  },
} as const;

/**
 * Validate PhonePe configuration at startup
 */
export function validatePhonePeConfig(): void {
  const required = [
    "merchantId",
    "saltKey",
    "saltIndex",
    "apiBaseUrl",
  ] as const;

  const missing = required.filter((key) => !phonePeConfig[key]);

  if (missing.length > 0) {
    console.warn(
      `[PhonePe] Missing configuration: ${missing.join(", ")}\n` +
        `  → PhonePe payments will not work until these are configured.`
    );
  }
}
