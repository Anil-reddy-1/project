/**
 * Payment Service
 * Derived from: Phase 3 Implementation Plan §8.3.2
 * 
 * Manages payment records and payment gateway integration:
 * - Create payment records
 * - Initiate PhonePe payments
 * - Verify payment status
 * - Handle callbacks and webhooks
 * - Retry failed payments
 * - Idempotency checks
 */

import { adminDb } from '../config/firebase';
import { phonePeService } from './phonepe.service';
import { phonePeConfig } from '../config/phonepe';
import { rupeesToPaise } from '../utils/pricing';
import type { PaymentMethod, PaymentStatus } from '../types';

export interface Payment {
  paymentId: string;
  orderId: string;
  gateway: 'phonepe' | 'cod';
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  currency: string;
  phonepeTransactionId?: string;
  phonepeMerchantTransactionId?: string;
  phonepePaymentInstrument?: {
    type: string;
    cardNetwork?: string;
    cardType?: string;
    upiId?: string;
  };
  callbackData?: any;
  webhookData?: any;
  signatureVerified: boolean;
  verifiedAt?: Date;
  retryCount: number;
  lastRetryAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date;
  failedAt?: Date;
  errorCode?: string;
  errorMessage?: string;
  idempotencyKey: string;
}

export class PaymentService {
  /**
   * Initiate PhonePe payment
   * Creates payment record and returns PhonePe redirect URL
   */
  async initiatePhonePePayment(
    orderId: string,
    amount: number,
    retailerId: string
  ): Promise<{ payment: Payment; redirectUrl: string }> {
    try {
      // Generate unique merchant transaction ID
      const merchantTransactionId = phonePeService.generateMerchantTransactionId(orderId);

      // Generate idempotency key
      const idempotencyKey = `${orderId}_${Date.now()}`;

      // Check if payment already exists for this order
      const existingPayment = await this.checkIdempotency(idempotencyKey);
      if (existingPayment) {
        console.log('[Payment] Using existing payment:', existingPayment.paymentId);
        
        // If payment is already paid, return it
        if (existingPayment.status === 'paid') {
          throw new Error('Payment already completed for this order');
        }

        // If payment is pending, check status
        if (existingPayment.status === 'pending' && existingPayment.phonepeMerchantTransactionId) {
          const statusResponse = await phonePeService.checkPaymentStatus(
            existingPayment.phonepeMerchantTransactionId
          );

          if (statusResponse.success && statusResponse.data) {
            // Update payment status based on current state
            await this.updatePaymentFromPhonePeResponse(
              existingPayment.paymentId,
              statusResponse
            );
          }
        }
      }

      // Convert amount to paise
      const amountInPaise = rupeesToPaise(amount);

      // Initiate payment with PhonePe
      const phonePeResponse = await phonePeService.initiatePayment({
        merchantTransactionId,
        amount: amountInPaise,
        merchantUserId: retailerId,
        redirectUrl: phonePeConfig.redirectUrl,
        callbackUrl: phonePeConfig.webhookUrl,
      });

      if (!phonePeResponse.success) {
        throw new Error(phonePeResponse.message || 'Failed to initiate PhonePe payment');
      }

      // Extract redirect URL
      const redirectUrl = phonePeResponse.data?.instrumentResponse?.redirectInfo?.url;
      if (!redirectUrl) {
        throw new Error('No redirect URL received from PhonePe');
      }

      // Create payment record
      const db = adminDb();
      const paymentRef = db.collection('payments').doc();
      const payment: Payment = {
        paymentId: paymentRef.id,
        orderId,
        gateway: 'phonepe',
        method: 'prepaid',
        status: 'pending',
        amount,
        currency: 'INR',
        phonepeMerchantTransactionId: merchantTransactionId,
        signatureVerified: false,
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        idempotencyKey,
      };

      await paymentRef.set(payment);

      console.log('[Payment] PhonePe payment initiated:', {
        paymentId: payment.paymentId,
        merchantTransactionId,
        amount,
      });

      return { payment, redirectUrl };
    } catch (error) {
      console.error('[Payment] Failed to initiate PhonePe payment:', error);
      throw error;
    }
  }

  /**
   * Verify PhonePe payment via status API
   */
  async verifyPhonePePayment(merchantTransactionId: string): Promise<Payment> {
    try {
      const db = adminDb();
      // Fetch payment record
      const paymentsSnapshot = await db
        .collection('payments')
        .where('phonepeMerchantTransactionId', '==', merchantTransactionId)
        .limit(1)
        .get();

      if (paymentsSnapshot.empty) {
        throw new Error('Payment not found');
      }

      const paymentDoc = paymentsSnapshot.docs[0];
      const payment = paymentDoc.data() as Payment;

      // Check payment status from PhonePe
      const statusResponse = await phonePeService.checkPaymentStatus(merchantTransactionId);

      // Update payment record with response
      await this.updatePaymentFromPhonePeResponse(payment.paymentId, statusResponse);

      // Fetch updated payment
      const updatedDoc = await paymentDoc.ref.get();
      return updatedDoc.data() as Payment;
    } catch (error) {
      console.error('[Payment] Failed to verify PhonePe payment:', error);
      throw error;
    }
  }

  /**
   * Handle PhonePe callback
   * Called when user is redirected back from PhonePe
   */
  async handlePhonePeCallback(merchantTransactionId: string): Promise<Payment> {
    try {
      console.log('[Payment] Handling PhonePe callback:', merchantTransactionId);

      // Verify payment status
      const payment = await this.verifyPhonePePayment(merchantTransactionId);

      return payment;
    } catch (error) {
      console.error('[Payment] Failed to handle PhonePe callback:', error);
      throw error;
    }
  }

  /**
   * Handle PhonePe webhook
   * Called asynchronously by PhonePe when payment status changes
   */
  async handlePhonePeWebhook(payload: any, signature: string): Promise<void> {
    try {
      const db = adminDb();
      console.log('[Payment] Handling PhonePe webhook');

      // Verify signature
      const responseBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
      const isValidSignature = phonePeService.verifySignature(responseBase64, signature);

      if (!isValidSignature) {
        console.error('[Payment] Invalid webhook signature');
        throw new Error('Invalid webhook signature');
      }

      // Extract merchant transaction ID
      const merchantTransactionId = payload.data?.merchantTransactionId;
      if (!merchantTransactionId) {
        throw new Error('No merchant transaction ID in webhook payload');
      }

      // Fetch payment record
      const paymentsSnapshot = await db
        .collection('payments')
        .where('phonepeMerchantTransactionId', '==', merchantTransactionId)
        .limit(1)
        .get();

      if (paymentsSnapshot.empty) {
        console.warn('[Payment] Payment not found for webhook:', merchantTransactionId);
        return;
      }

      const paymentDoc = paymentsSnapshot.docs[0];
      const payment = paymentDoc.data() as Payment;

      // Check idempotency - prevent duplicate processing
      if (payment.webhookData) {
        console.log('[Payment] Webhook already processed for:', merchantTransactionId);
        return;
      }

      // Update payment with webhook data
      await paymentDoc.ref.update({
        webhookData: payload,
        signatureVerified: true,
        verifiedAt: new Date(),
        updatedAt: new Date(),
      });

      // Update payment status based on webhook data
      await this.updatePaymentFromPhonePeResponse(payment.paymentId, {
        success: payload.success,
        code: payload.code,
        message: payload.message,
        data: payload.data,
      });

      console.log('[Payment] Webhook processed successfully:', merchantTransactionId);
    } catch (error) {
      console.error('[Payment] Failed to handle PhonePe webhook:', error);
      throw error;
    }
  }

  /**
   * Create COD payment record
   */
  async createCODPayment(orderId: string, amount: number): Promise<Payment> {
    try {
      const db = adminDb();
      const paymentRef = db.collection('payments').doc();
      const payment: Payment = {
        paymentId: paymentRef.id,
        orderId,
        gateway: 'cod',
        method: 'cod',
        status: 'pending',
        amount,
        currency: 'INR',
        signatureVerified: true, // COD doesn't need signature verification
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        idempotencyKey: `${orderId}_COD_${Date.now()}`,
      };

      await paymentRef.set(payment);

      console.log('[Payment] COD payment created:', payment.paymentId);

      return payment;
    } catch (error) {
      console.error('[Payment] Failed to create COD payment:', error);
      throw error;
    }
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(
    paymentId: string,
    status: PaymentStatus,
    metadata?: any
  ): Promise<Payment> {
    try {
      const db = adminDb();
      const paymentRef = db.collection('payments').doc(paymentId);
      const updates: any = {
        status,
        updatedAt: new Date(),
      };

      if (status === 'paid') {
        updates.paidAt = new Date();
      } else if (status === 'failed') {
        updates.failedAt = new Date();
      }

      if (metadata) {
        Object.assign(updates, metadata);
      }

      await paymentRef.update(updates);

      const doc = await paymentRef.get();
      return doc.data() as Payment;
    } catch (error) {
      console.error('[Payment] Failed to update payment status:', error);
      throw error;
    }
  }

  /**
   * Retry failed payment
   */
  async retryPayment(
    paymentId: string
  ): Promise<{ payment: Payment; redirectUrl: string }> {
    try {
      const db = adminDb();
      // Fetch existing payment
      const paymentRef = db.collection('payments').doc(paymentId);
      const paymentDoc = await paymentRef.get();

      if (!paymentDoc.exists) {
        throw new Error('Payment not found');
      }

      const payment = paymentDoc.data() as Payment;

      // Check if payment can be retried
      if (payment.status === 'paid') {
        throw new Error('Payment already completed');
      }

      if (payment.retryCount >= 3) {
        throw new Error('Maximum retry attempts exceeded');
      }

      // Update retry count
      await paymentRef.update({
        retryCount: payment.retryCount + 1,
        lastRetryAt: new Date(),
      });

      // Fetch order to get retailer ID
      const orderRef = db.collection('orders').doc(payment.orderId);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        throw new Error('Order not found');
      }

      const order = orderDoc.data()!;

      // Initiate new payment
      return await this.initiatePhonePePayment(
        payment.orderId,
        payment.amount,
        order.retailerId
      );
    } catch (error) {
      console.error('[Payment] Failed to retry payment:', error);
      throw error;
    }
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(paymentId: string): Promise<Payment | null> {
    try {
      const db = adminDb();
      const paymentRef = db.collection('payments').doc(paymentId);
      const paymentDoc = await paymentRef.get();

      if (!paymentDoc.exists) {
        return null;
      }

      return paymentDoc.data() as Payment;
    } catch (error) {
      console.error('[Payment] Failed to get payment:', error);
      throw error;
    }
  }

  /**
   * Check if payment already processed (idempotency)
   */
  async checkIdempotency(idempotencyKey: string): Promise<Payment | null> {
    try {
      const db = adminDb();
      const paymentsSnapshot = await db
        .collection('payments')
        .where('idempotencyKey', '==', idempotencyKey)
        .limit(1)
        .get();

      if (paymentsSnapshot.empty) {
        return null;
      }

      return paymentsSnapshot.docs[0].data() as Payment;
    } catch (error) {
      console.error('[Payment] Failed to check idempotency:', error);
      return null;
    }
  }

  /**
   * Update payment from PhonePe response
   * Internal helper to update payment status based on PhonePe API response
   */
  private async updatePaymentFromPhonePeResponse(
    paymentId: string,
    response: any
  ): Promise<void> {
    const db = adminDb();
    const paymentRef = db.collection('payments').doc(paymentId);
    const updates: any = {
      updatedAt: new Date(),
    };

    if (response.success && response.data) {
      const data = response.data;

      // Update transaction ID
      if (data.transactionId) {
        updates.phonepeTransactionId = data.transactionId;
      }

      // Update payment instrument
      if (data.paymentInstrument) {
        updates.phonepePaymentInstrument = phonePeService.extractPaymentInstrument(response);
      }

      // Update status based on state
      if (data.state === 'COMPLETED' && data.responseCode === 'SUCCESS') {
        updates.status = 'paid';
        updates.paidAt = new Date();
      } else if (data.state === 'FAILED' || data.responseCode === 'PAYMENT_ERROR') {
        updates.status = 'failed';
        updates.failedAt = new Date();
        updates.errorCode = data.responseCode;
        updates.errorMessage = response.message;
      } else if (data.state === 'PENDING') {
        updates.status = 'pending';
      }

      // Store callback data
      updates.callbackData = data;
    } else {
      // Payment failed
      updates.status = 'failed';
      updates.failedAt = new Date();
      updates.errorCode = response.code;
      updates.errorMessage = response.message;
    }

    await paymentRef.update(updates);
  }
}

// Export singleton instance
export const paymentService = new PaymentService();
