/**
 * OTP Service
 * Phase 4 — Wholesaler Approval & Inventory Lock
 * Phase 5B — Delivery Verification
 *
 * Generates and validates 6-digit numeric OTPs for:
 * - Pickup verification (wholesaler → delivery partner)
 * - Delivery verification (delivery partner → retailer)
 * 
 * OTPs are stored directly on the order document.
 * 30-minute expiry for security.
 */

import * as crypto from 'crypto';
import { adminDb } from '../config/firebase';

class OTPService {
  private readonly OTP_EXPIRY_MINUTES = 30;

  /**
   * Generate a cryptographically random 6-digit numeric pickup OTP
   * and store it on the order document.
   *
   * @returns The generated OTP string
   */
  async generatePickupOTP(orderId: string): Promise<string> {
    const otp = this.generateSecureOTP(6);
    const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

    const db = adminDb();
    const orderRef = db.collection('orders').doc(orderId);

    await orderRef.update({
      pickupOTP: otp,
      pickupOTPGeneratedAt: new Date(),
      pickupOTPExpiresAt: expiresAt,
      pickupOTPVerified: false,
    });

    console.log(`[OTP] Pickup OTP generated for order ${orderId} (expires in ${this.OTP_EXPIRY_MINUTES} min)`);
    return otp;
  }

  /**
   * Generate a delivery OTP for retailer verification
   * Generated when delivery partner picks up the order
   */
  async generateDeliveryOTP(orderId: string): Promise<string> {
    const otp = this.generateSecureOTP(6);
    const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

    const db = adminDb();
    const orderRef = db.collection('orders').doc(orderId);

    await orderRef.update({
      deliveryOTP: otp,
      deliveryOTPGeneratedAt: new Date(),
      deliveryOTPExpiresAt: expiresAt,
      deliveryOTPVerified: false,
    });

    console.log(`[OTP] Delivery OTP generated for order ${orderId} (expires in ${this.OTP_EXPIRY_MINUTES} min)`);
    return otp;
  }

  /**
   * Validate a pickup OTP against the stored value.
   * Returns true if OTP matches and hasn't expired, false otherwise.
   */
  async validatePickupOTP(orderId: string, otp: string): Promise<{ valid: boolean; message?: string }> {
    const db = adminDb();
    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return { valid: false, message: 'Order not found' };
    }

    const orderData = orderDoc.data();
    const storedOTP = orderData?.pickupOTP;
    const expiresAt = orderData?.pickupOTPExpiresAt;
    const verified = orderData?.pickupOTPVerified;

    if (!storedOTP) {
      return { valid: false, message: 'No pickup OTP has been generated for this order' };
    }

    if (verified) {
      return { valid: false, message: 'Pickup OTP already verified' };
    }

    // Check expiry
    if (expiresAt && new Date() > expiresAt.toDate()) {
      return { valid: false, message: 'Pickup OTP has expired' };
    }

    // Constant-time comparison to prevent timing attacks
    try {
      const isValid = crypto.timingSafeEqual(
        Buffer.from(otp.padEnd(6)),
        Buffer.from(storedOTP.padEnd(6))
      );

      if (isValid) {
        // Mark as verified
        await orderRef.update({
          pickupOTPVerified: true,
          pickupOTPVerifiedAt: new Date(),
        });
      }

      return { valid: isValid, message: isValid ? 'OTP verified' : 'Invalid OTP' };
    } catch (error) {
      return { valid: false, message: 'Invalid OTP format' };
    }
  }

  /**
   * Validate a delivery OTP against the stored value.
   */
  async validateDeliveryOTP(orderId: string, otp: string): Promise<{ valid: boolean; message?: string }> {
    const db = adminDb();
    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return { valid: false, message: 'Order not found' };
    }

    const orderData = orderDoc.data();
    const storedOTP = orderData?.deliveryOTP;
    const expiresAt = orderData?.deliveryOTPExpiresAt;
    const verified = orderData?.deliveryOTPVerified;

    if (!storedOTP) {
      return { valid: false, message: 'No delivery OTP has been generated for this order' };
    }

    if (verified) {
      return { valid: false, message: 'Delivery OTP already verified' };
    }

    // Check expiry
    if (expiresAt && new Date() > expiresAt.toDate()) {
      return { valid: false, message: 'Delivery OTP has expired' };
    }

    // Constant-time comparison
    try {
      const isValid = crypto.timingSafeEqual(
        Buffer.from(otp.padEnd(6)),
        Buffer.from(storedOTP.padEnd(6))
      );

      if (isValid) {
        // Mark as verified
        await orderRef.update({
          deliveryOTPVerified: true,
          deliveryOTPVerifiedAt: new Date(),
        });
      }

      return { valid: isValid, message: isValid ? 'OTP verified' : 'Invalid OTP' };
    } catch (error) {
      return { valid: false, message: 'Invalid OTP format' };
    }
  }

  /**
   * Get the stored pickup OTP for an order (admin/wholesaler use).
   */
  async getPickupOTP(orderId: string): Promise<string | null> {
    const db = adminDb();
    const orderDoc = await db.collection('orders').doc(orderId).get();

    if (!orderDoc.exists) return null;
    return orderDoc.data()?.pickupOTP || null;
  }

  /**
   * Get the stored delivery OTP for an order (retailer use).
   */
  async getDeliveryOTP(orderId: string): Promise<string | null> {
    const db = adminDb();
    const orderDoc = await db.collection('orders').doc(orderId).get();

    if (!orderDoc.exists) return null;
    return orderDoc.data()?.deliveryOTP || null;
  }

  /**
   * Check if pickup OTP is still valid (not expired, not verified)
   */
  async isPickupOTPValid(orderId: string): Promise<boolean> {
    const db = adminDb();
    const orderDoc = await db.collection('orders').doc(orderId).get();

    if (!orderDoc.exists) return false;

    const orderData = orderDoc.data();
    const verified = orderData?.pickupOTPVerified;
    const expiresAt = orderData?.pickupOTPExpiresAt;

    if (verified) return false;
    if (expiresAt && new Date() > expiresAt.toDate()) return false;

    return !!orderData?.pickupOTP;
  }

  /**
   * Check if delivery OTP is still valid
   */
  async isDeliveryOTPValid(orderId: string): Promise<boolean> {
    const db = adminDb();
    const orderDoc = await db.collection('orders').doc(orderId).get();

    if (!orderDoc.exists) return false;

    const orderData = orderDoc.data();
    const verified = orderData?.deliveryOTPVerified;
    const expiresAt = orderData?.deliveryOTPExpiresAt;

    if (verified) return false;
    if (expiresAt && new Date() > expiresAt.toDate()) return false;

    return !!orderData?.deliveryOTP;
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
