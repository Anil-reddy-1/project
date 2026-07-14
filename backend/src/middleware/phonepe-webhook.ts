/**
 * PhonePe Webhook Signature Verification Middleware
 * Derived from: Phase 3 Implementation Plan §8.5.1
 * 
 * Verifies PhonePe webhook signatures before processing.
 * Prevents unauthorized webhook calls and tampering.
 */

import type { Request, Response, NextFunction } from 'express';
import { verifyPhonePeSignature } from '../config/phonepe';

/**
 * Verify PhonePe webhook signature
 * 
 * Extracts X-VERIFY header and validates signature against request body.
 * Rejects requests with invalid or missing signatures.
 */
export function verifyPhonePeWebhook(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const signature = req.headers['x-verify'] as string;

    if (!signature) {
      console.error('[PhonePe Webhook] Missing X-VERIFY signature');
      res.status(401).json({
        success: false,
        message: 'Missing signature',
      });
      return;
    }

    // Convert request body to base64 for verification
    const responseBase64 = Buffer.from(JSON.stringify(req.body)).toString('base64');

    // Verify signature
    const isValid = verifyPhonePeSignature(responseBase64, signature, '/webhook');

    if (!isValid) {
      console.error('[PhonePe Webhook] Invalid signature');
      res.status(401).json({
        success: false,
        message: 'Invalid signature',
      });
      return;
    }

    // Signature valid, proceed to route handler
    console.log('[PhonePe Webhook] Signature verified successfully');
    next();
  } catch (error) {
    console.error('[PhonePe Webhook] Signature verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Signature verification failed',
    });
  }
}
