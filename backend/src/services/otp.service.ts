/**
 * OTP Service
 * Phase 4 — Wholesaler Approval & Inventory Lock
 *
 * Generates and validates 6-digit numeric pickup OTPs.
 * OTPs are stored directly on the order document — no separate collection.
 * No expiry, single-use (verified in Phase 6 pickup handoff).
 */

import * as crypto from 'crypto';
import { adminDb } from '../config/firebase';

class OTPService {
  /**
   * Generate a cryptographically random 6-digit numeric OTP
   * and store it on the order document.
   *
   * @returns The generated OTP string
   */
  async generatePickupOTP(orderId: string): Promise<string> {
    const otp = this.generateSecureOTP(6);

    const db = adminDb();
    const orderRef = db.collection('orders').doc(orderId);

    await orderRef.update({
      pickupOTP: otp,
      pickupOTPGeneratedAt: new Date(),
    });

    console.log(`[OTP] Pickup OTP generated for order ${orderId}`);
    return otp;
  }

  /**
   * Validate a pickup OTP against the stored value.
   * Returns true if OTP matches, false otherwise.
   */
  async validatePickupOTP(orderId: string, otp: string): Promise<boolean> {
    const db = adminDb();
    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      throw new Error('Order not found');
    }

    const storedOTP = orderDoc.data()?.pickupOTP;

    if (!storedOTP) {
      throw new Error('No pickup OTP has been generated for this order');
    }

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(otp.padEnd(6)),
      Buffer.from(storedOTP.padEnd(6))
    );
  }

  /**
   * Get the stored OTP for an order (admin/wholesaler use).
   */
  async getPickupOTP(orderId: string): Promise<string | null> {
    const db = adminDb();
    const orderDoc = await db.collection('orders').doc(orderId).get();

    if (!orderDoc.exists) return null;
    return orderDoc.data()?.pickupOTP || null;
  }

  /**
   * Generate a cryptographically secure N-digit numeric OTP.
   */
  private generateSecureOTP(digits: number): string {
    const max = Math.pow(10, digits);
    const min = Math.pow(10, digits - 1);
    const range = max - min;

    // Generate random bytes and convert to a number in range
    const randomBytes = crypto.randomBytes(4);
    const randomNumber = randomBytes.readUInt32BE(0);
    const otp = min + (randomNumber % range);

    return otp.toString();
  }
}

export const otpService = new OTPService();
