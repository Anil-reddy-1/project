/**
 * PhonePe Utility Functions
 * Phase 3: Order Placement & Payments
 */

import crypto from "crypto";
import { phonePeConfig } from "../config/phonepe";

/**
 * Generate unique merchant transaction ID
 * Format: MT-{timestamp}-{random}
 */
export function generateMerchantTransactionId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9).toUpperCase();
  return `MT-${timestamp}-${random}`;
}

/**
 * Convert rupees to paise (PhonePe requires amount in paise)
 * @param rupees - Amount in rupees
 * @returns Amount in paise
 */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Convert paise to rupees
 * @param paise - Amount in paise
 * @returns Amount in rupees
 */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/**
 * Generate SHA256 checksum for PhonePe API
 * Format: SHA256(base64Payload + endpoint + saltKey) + "###" + saltIndex
 * 
 * @param base64Payload - Base64 encoded payload
 * @param endpoint - API endpoint (e.g., "/pg/v1/pay")
 * @returns X-VERIFY header value
 */
export function generateChecksum(base64Payload: string, endpoint: string): string {
  const { saltKey, saltIndex } = phonePeConfig;
  
  if (!saltKey) {
    throw new Error("PhonePe Salt Key not configured");
  }
  
  const checksumString = base64Payload + endpoint + saltKey;
  const checksum = crypto
    .createHash("sha256")
    .update(checksumString)
    .digest("hex");
  
  return `${checksum}###${saltIndex}`;
}

/**
 * Verify PhonePe webhook signature
 * @param base64Payload - Base64 encoded payload from webhook
 * @param receivedChecksum - X-VERIFY header from webhook
 * @returns true if signature is valid
 */
export function verifyWebhookSignature(
  base64Payload: string,
  receivedChecksum: string
): boolean {
  try {
    const { saltKey, saltIndex } = phonePeConfig;
    
    if (!saltKey) {
      throw new Error("PhonePe Salt Key not configured");
    }
    
    // Extract checksum (remove salt index part)
    const [receivedHash] = receivedChecksum.split("###");
    
    // Calculate expected checksum
    const checksumString = base64Payload + "/pg/v1/callback" + saltKey;
    const expectedHash = crypto
      .createHash("sha256")
      .update(checksumString)
      .digest("hex");
    
    return receivedHash === expectedHash;
  } catch (error) {
    console.error("[PhonePe] Webhook signature verification failed:", error);
    return false;
  }
}

/**
 * Parse PhonePe response code to user-friendly message
 */
export function parsePhonePeResponseCode(code: string): string {
  const messages: Record<string, string> = {
    PAYMENT_SUCCESS: "Payment completed successfully",
    PAYMENT_ERROR: "Payment failed",
    PAYMENT_PENDING: "Payment is being processed",
    PAYMENT_DECLINED: "Payment was declined by your bank",
    BAD_REQUEST: "Invalid payment request",
    AUTHORIZATION_FAILED: "Payment authorization failed",
    INTERNAL_SERVER_ERROR: "Payment gateway error. Please try again",
    TRANSACTION_NOT_FOUND: "Transaction not found",
    PAYMENT_CANCELLED: "Payment was cancelled",
    TIMED_OUT: "Payment session expired",
  };
  
  return messages[code] || "Unknown payment status";
}

/**
 * Map PhonePe payment state to our PaymentStatus
 */
export function mapPhonePeStateToStatus(state: string): string {
  const stateMap: Record<string, string> = {
    COMPLETED: "paid",
    FAILED: "failed",
    PENDING: "pending",
    EXPIRED: "failed",
  };
  
  return stateMap[state] || "pending";
}

/**
 * Calculate payment expiry time
 * @param expiryMinutes - Minutes until expiry
 * @returns ISO timestamp
 */
export function calculatePaymentExpiry(expiryMinutes: number): Date {
  const now = new Date();
  now.setMinutes(now.getMinutes() + expiryMinutes);
  return now;
}
