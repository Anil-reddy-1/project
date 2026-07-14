/**
 * usePayment Hook
 * Derived from: Phase 3 Implementation Plan §9.5.3
 * 
 * Handles payment retry and status checking:
 * - Check payment status
 * - Retry failed payments
 * - Poll for payment updates
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getPaymentStatus,
  retryPayment,
  type Payment,
} from '@/lib/api/payments';

export function usePayment(paymentId: string | null) {
  const router = useRouter();
  
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // Check payment status
  const checkStatus = useCallback(async () => {
    if (!paymentId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await getPaymentStatus(paymentId);

      if (!response.success) {
        throw new Error('Failed to get payment status');
      }

      setPayment(response.data);
    } catch (err: any) {
      console.error('[usePayment] Status check error:', err);
      setError(err.message || 'Failed to check payment status');
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  // Retry payment
  const retry = useCallback(async () => {
    if (!paymentId) return;

    setIsRetrying(true);
    setError(null);

    try {
      const response = await retryPayment(paymentId);

      if (!response.success) {
        throw new Error(response.message || 'Failed to retry payment');
      }

      // Redirect to PhonePe payment page
      if (response.data.redirectUrl) {
        window.location.href = response.data.redirectUrl;
      }
    } catch (err: any) {
      console.error('[usePayment] Retry error:', err);
      setError(err.message || 'Failed to retry payment');
      setIsRetrying(false);
    }
  }, [paymentId]);

  // Poll for payment status updates (useful for pending payments)
  const startPolling = useCallback((intervalMs: number = 5000, maxAttempts: number = 24) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;

      if (attempts >= maxAttempts) {
        clearInterval(interval);
        return;
      }

      try {
        if (!paymentId) {
          clearInterval(interval);
          return;
        }

        const response = await getPaymentStatus(paymentId);

        if (response.success) {
          setPayment(response.data);

          // Stop polling if payment is in terminal state
          if (response.data.status === 'paid' || response.data.status === 'failed') {
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error('[usePayment] Polling error:', err);
        // Continue polling despite errors
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [paymentId]);

  // Fetch payment status on mount
  useEffect(() => {
    if (paymentId) {
      checkStatus();
    }
  }, [paymentId, checkStatus]);

  return {
    payment,
    loading,
    error,
    isRetrying,
    checkStatus,
    retry,
    startPolling,
  };
}
