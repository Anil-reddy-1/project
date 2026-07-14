/**
 * usePayment Hook
 * Task #20: State management hooks
 * 
 * Payment status checking and retry logic
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { paymentsApi } from '@/lib/api';
import type { Payment, PaymentStatus } from '@/lib/types';

export function usePayment(paymentId: string | null) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check payment status
  const checkStatus = useCallback(async () => {
    if (!paymentId) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await paymentsApi.checkPaymentStatus(paymentId);
      setPayment(response.data);
      
      return response.data;
    } catch (err: any) {
      console.error('Failed to check payment status:', err);
      setError(
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to check payment status'
      );
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [paymentId]);

  // Retry payment
  const retryPayment = useCallback(async () => {
    if (!paymentId) return;

    try {
      setIsRetrying(true);
      setError(null);

      const response = await paymentsApi.retryPayment(paymentId);
      
      // Redirect to PhonePe if URL provided
      if (response.data.phonepeRedirectUrl) {
        window.location.href = response.data.phonepeRedirectUrl;
      }

      return response.data;
    } catch (err: any) {
      console.error('Failed to retry payment:', err);
      setError(
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to retry payment'
      );
      throw err;
    } finally {
      setIsRetrying(false);
    }
  }, [paymentId]);

  // Auto-fetch on mount
  useEffect(() => {
    if (paymentId) {
      checkStatus();
    }
  }, [paymentId, checkStatus]);

  // Poll for payment status (for pending payments)
  useEffect(() => {
    if (!payment || payment.status !== 'PENDING') return;

    const interval = setInterval(() => {
      checkStatus();
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [payment?.status, checkStatus]);

  return {
    payment,
    isLoading,
    isRetrying,
    error,
    checkStatus,
    retryPayment,
  };
}
