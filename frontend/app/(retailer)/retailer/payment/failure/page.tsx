/**
 * Payment Failure Page
 * Task #17: Payment flow pages
 * 
 * Display failure message and retry option
 */

'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { usePayment } from '@/hooks';
import { InlineError, LoadingSpinner } from '@/components/ui';
import Link from 'next/link';

export default function PaymentFailurePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const paymentId = searchParams.get('paymentId');
  const orderId = searchParams.get('orderId');
  const reason = searchParams.get('reason');

  const { isRetrying, retryPayment } = usePayment(paymentId);
  const [error, setError] = useState<string | null>(null);

  const handleRetry = async () => {
    if (!paymentId) return;

    try {
      setError(null);
      await retryPayment();
      // retryPayment will redirect to PhonePe
    } catch (err: any) {
      setError(err.message || 'Failed to retry payment');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        {/* Failure Icon */}
        <div className="mx-auto mb-6 flex justify-center">
          <div className="rounded-full bg-red-100 p-3">
            <svg
              className="w-16 h-16 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        {/* Failure Message */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Failed
        </h1>
        <p className="text-gray-600 mb-6">
          {reason || 'Your payment could not be processed. Please try again.'}
        </p>

        {/* Error Display */}
        {error && (
          <div className="mb-6">
            <InlineError message={error} />
          </div>
        )}

        {/* Common Reasons */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-left">
          <p className="text-sm font-medium text-gray-900 mb-2">
            Common reasons for payment failure:
          </p>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>Insufficient balance</li>
            <li>Incorrect payment details</li>
            <li>Network connectivity issues</li>
            <li>Payment gateway timeout</li>
            <li>Bank authorization declined</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {paymentId && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {isRetrying ? (
                <>
                  <LoadingSpinner size="sm" />
                  Retrying...
                </>
              ) : (
                'Retry Payment'
              )}
            </button>
          )}

          {orderId && (
            <Link
              href={`/retailer/orders/${orderId}`}
              className="block w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 transition"
            >
              View Order Details
            </Link>
          )}

          <Link
            href="/retailer/orders"
            className="block w-full border border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-50 transition"
          >
            Go to Orders
          </Link>

          <Link
            href="/retailer/shops"
            className="block w-full text-blue-600 py-2 hover:text-blue-700 transition"
          >
            Continue Shopping
          </Link>
        </div>

        {/* Help Text */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Need help?{' '}
            <Link href="/contact" className="text-blue-600 hover:text-blue-700">
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
