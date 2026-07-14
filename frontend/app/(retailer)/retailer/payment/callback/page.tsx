/**
 * Payment Callback Page
 * Handles PhonePe redirect after payment
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { verifyPaymentCallback } from '@/lib/api/payments';

export default function PaymentCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [message, setMessage] = useState('Verifying your payment...');

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Get parameters from URL
        const merchantTransactionId = searchParams.get('merchantTransactionId');
        const transactionId = searchParams.get('transactionId');
        
        if (!merchantTransactionId) {
          setStatus('failed');
          setMessage('Invalid payment callback');
          setTimeout(() => router.push('/retailer/orders'), 3000);
          return;
        }

        // Verify payment with backend
        const result = await verifyPaymentCallback(merchantTransactionId);

        if (result.data.status === 'paid') {
          setStatus('success');
          setMessage('Payment successful! Redirecting...');
          setTimeout(() => router.push(`/retailer/orders/${result.data.orderId}`), 2000);
        } else {
          setStatus('failed');
          setMessage(result.data.errorMessage || 'Payment failed');
          setTimeout(() => router.push('/retailer/payment/failure'), 3000);
        }
      } catch (error: any) {
        setStatus('failed');
        setMessage(error.message || 'Payment verification failed');
        setTimeout(() => router.push('/retailer/payment/failure'), 3000);
      }
    };

    verifyPayment();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {status === 'verifying' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Verifying Payment</h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Payment Failed</h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}
      </div>
    </div>
  );
}
