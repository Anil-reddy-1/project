/**
 * Payments API Client
 * Derived from: Phase 3 Implementation Plan §9.4.2
 * 
 * API client functions for payment management:
 * - Retry failed payment
 * - Check payment status
 * - Verify payment callback
 */

import { apiClient } from './client';
import type { PaymentMethod } from '@/types';

// ─── Request/Response Types ───────────────────────────────────────────────────

export interface Payment {
  paymentId: string;
  orderId: string;
  gateway: 'phonepe' | 'cod';
  method: PaymentMethod;
  status: 'pending' | 'paid' | 'failed';
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
  createdAt: Date | string;
  paidAt?: Date | string;
  failedAt?: Date | string;
  errorMessage?: string;
  retryCount: number;
}

export interface RetryPaymentResponse {
  success: boolean;
  message: string;
  data: {
    paymentId: string;
    redirectUrl: string;
  };
}

export interface PaymentStatusResponse {
  success: boolean;
  data: Payment;
}

export interface PaymentCallbackResponse {
  success: boolean;
  data: Payment & {
    order?: any;
  };
}

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * Retry a failed payment
 * Creates a new payment attempt for the same order
 * 
 * @param paymentId - ID of the failed payment
 * @returns New payment with redirect URL
 */
export async function retryPayment(
  paymentId: string
): Promise<RetryPaymentResponse> {
  return apiClient<RetryPaymentResponse>(`/payments/${paymentId}/retry`, {
    method: 'POST',
  });
}

/**
 * Get payment status
 * 
 * @param paymentId - Payment ID
 * @returns Payment details and current status
 */
export async function getPaymentStatus(
  paymentId: string
): Promise<PaymentStatusResponse> {
  return apiClient<PaymentStatusResponse>(`/payments/${paymentId}/status`);
}

/**
 * Verify payment callback from PhonePe
 * Called by frontend after PhonePe redirect
 * 
 * @param merchantTransactionId - PhonePe merchant transaction ID
 * @returns Verified payment and order details
 */
export async function verifyPaymentCallback(
  merchantTransactionId: string
): Promise<PaymentCallbackResponse> {
  return apiClient<PaymentCallbackResponse>('/payments/phonepe/verify', {
    method: 'POST',
    body: { merchantTransactionId },
  });
}
