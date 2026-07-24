/**
 * Payment Callback Page
 * Task #17: Payment flow pages
 * 
 * Handles PhonePe redirect after payment attempt
 */

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { verifyPaymentCallback } from '@/lib/api/payments';
import { PaymentProcessingSkeleton } from '@/components/ui';

function PaymentCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'processing' | 'success' | 'failed'>('processing');
  const [message, setMessage] = useState('Verifying your payment...');

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Get payment ID from URL
        const paymentId = searchParams.get('paymentId');
        const merchantTransactionId = searchParams.get('merchantTransactionId');

        if (!paymentId && !merchantTransactionId) {
          throw new Error('Payment information missing');
        }

        // Small delay for better UX
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Verify payment status
        const response = await verifyPaymentCallback(
          merchantTransactionId!
        );

        // API returns { success, data: { orderId, status, paymentId } }
        const payment = (response as any).data;

        if (payment.status === 'paid') {
          setStatus('success');
          setMessage('Payment successful! Redirecting...');
          
          // Redirect to order details with success message
          setTimeout(() => {
            router.push(`/retailer/orders/${payment.orderId}?success=true`);
          }, 2000);
        } else if (payment.status === 'failed') {
          setStatus('failed');
          setMessage('Payment failed. Redirecting...');
          
          // Redirect to failure page
          setTimeout(() => {
            router.push(
              `/retailer/payment/failure?paymentId=${payment.paymentId}&orderId=${payment.orderId}`
            );
          }, 2000);
        } else {
          // Still pending
          setMessage('Payment is being processed. Please wait...');
          
          // Poll again after 3 seconds
          setTimeout(() => {
            window.location.reload();
          }, 3000);
        }
      } catch (error: any) {
        console.error('Payment verification error:', error);
        setStatus('failed');
        setMessage('Failed to verify payment. Redirecting...');
        
        setTimeout(() => {
          router.push('/retailer/payment/failure');
        }, 2000);
      }
    };

    verifyPayment();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        {status === 'processing' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Processing Payment
            </h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto mb-4 flex justify-center">
              <svg
                className="w-16 h-16 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Payment Successful!
            </h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="mx-auto mb-4 flex justify-center">
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
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Payment Failed
            </h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={<PaymentProcessingSkeleton />}>
      <PaymentCallbackContent />
    </Suspense>
  );
}
