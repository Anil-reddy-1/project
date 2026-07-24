/**
 * Payment Pending Page
 * Task #17: Payment flow pages
 * 
 * Display when payment is still being processed
 */

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { usePayment } from '@/hooks';
import { LoadingSpinner, InlineWarning } from '@/components/ui';
import Link from 'next/link';

function PaymentPendingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const paymentId = searchParams.get('paymentId');
  const orderId = searchParams.get('orderId');

  const { payment, checkStatus } = usePayment(paymentId);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Track elapsed time
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Redirect based on payment status
  useEffect(() => {
    if (!payment) return;

    if (payment.status === 'SUCCESS') {
      router.push(`/retailer/payment/success?orderId=${orderId}&orderNumber=${payment.orderId}`);
    } else if (payment.status === 'FAILED') {
      router.push(`/retailer/payment/failure?paymentId=${paymentId}&orderId=${orderId}`);
    }
  }, [payment, orderId, paymentId, router]);

  // Timeout after 5 minutes
  useEffect(() => {
    if (elapsedTime > 300) {
      router.push(
        `/retailer/payment/failure?paymentId=${paymentId}&orderId=${orderId}&reason=Payment verification timeout. Please check your order status.`
      );
    }
  }, [elapsedTime, paymentId, orderId, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        {/* Loading Icon */}
        <div className="mx-auto mb-6 flex justify-center">
          <LoadingSpinner size="lg" />
        </div>

        {/* Processing Message */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Processing
        </h1>
        <p className="text-gray-600 mb-6">
          Your payment is being verified. This usually takes a few seconds.
        </p>

        {/* Time Indicator */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 text-sm text-gray-500">
            <LoadingSpinner size="sm" />
            <span>Checking status... ({elapsedTime}s)</span>
          </div>
        </div>

        {/* Warning after 30 seconds */}
        {elapsedTime > 30 && (
          <div className="mb-6">
            <InlineWarning message="Payment verification is taking longer than usual. Please wait..." />
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-900 mb-1">
                Please wait
              </p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Do not close this page</li>
                <li>• Do not press the back button</li>
                <li>• Do not refresh the page</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => checkStatus()}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Check Status Now
          </button>

          {orderId && (
            <Link
              href={`/retailer/orders/${orderId}`}
              className="block w-full text-blue-600 py-2 hover:text-blue-700 transition"
            >
              Go to Order Details
            </Link>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Payment taking too long?{' '}
            <Link href="/contact" className="text-blue-600 hover:text-blue-700">
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PaymentPendingPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <PaymentPendingContent />
    </Suspense>
  );
}
