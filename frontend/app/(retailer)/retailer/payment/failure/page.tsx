/**
 * Payment Failure Page
 */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { retryPayment } from '@/lib/api/payments';

export default function PaymentFailurePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentId = searchParams.get('paymentId');
  const reason = searchParams.get('reason');
  
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRetry = async () => {
    if (!paymentId) {
      setError('Payment ID not found');
      return;
    }

    setIsRetrying(true);
    setError(null);

    try {
      const result = await retryPayment(paymentId);
      
      if (result.data.redirectUrl) {
        window.location.href = result.data.redirectUrl;
      } else {
        setError('Could not initiate payment retry');
        setIsRetrying(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retry payment');
      setIsRetrying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h1>
        <p className="text-gray-600 mb-6">
          {reason || 'Your payment could not be processed. Please try again.'}
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {paymentId && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              {isRetrying ? 'Retrying...' : 'Retry Payment'}
            </button>
          )}
          
          <button
            onClick={() => router.push('/retailer/orders')}
            className="w-full border border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-50 transition"
          >
            View My Orders
          </button>
          
          <button
            onClick={() => router.push('/retailer')}
            className="w-full text-blue-600 py-2 hover:underline"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}
