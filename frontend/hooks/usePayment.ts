/**
 * usePayment Hook
 * Task #20: State management hooks
 *
 * Payment status checking and retry logic
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { getPaymentStatus, retryPayment as apiRetryPayment } from '@/lib/api';
import type { Payment } from '@/lib/types';

export function usePayment(paymentId: string | null) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    if (!paymentId) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await getPaymentStatus(paymentId);
      // API returns { success, data: Payment }
      const p = (response as any).data ?? null;
      setPayment(p);
      return p;
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

  const retryPayment = useCallback(async () => {
    if (!paymentId) return;

    try {
      setIsRetrying(true);
      setError(null);

      const response = await apiRetryPayment(paymentId);
      // Redirect to PhonePe if URL provided
      const redirectUrl =
        (response as any).data?.redirectUrl ??
        (response as any).data?.phonepeRedirectUrl;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
      return response;
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

  // Poll every 5 s while payment is pending
  useEffect(() => {
    if (!payment || (payment as any).status !== 'PENDING') return;

    const interval = setInterval(() => {
      checkStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [(payment as any)?.status, checkStatus]);

  return {
    payment,
    isLoading,
    isRetrying,
    error,
    checkStatus,
    retryPayment,
  };
}
