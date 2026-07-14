/**
 * Payment Success Page
 * Task #17: Payment flow pages
 * 
 * Display success message after successful payment
 */

'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const orderId = searchParams.get('orderId');
  const orderNumber = searchParams.get('orderNumber');

  useEffect(() => {
    // Auto-redirect after 10 seconds
    const timer = setTimeout(() => {
      if (orderId) {
        router.push(`/retailer/orders/${orderId}`);
      } else {
        router.push('/retailer/orders');
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [orderId, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        {/* Success Icon */}
        <div className="mx-auto mb-6 flex justify-center">
          <div className="rounded-full bg-green-100 p-3">
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
        </div>

        {/* Success Message */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Successful!
        </h1>
        <p className="text-gray-600 mb-6">
          Your payment has been processed successfully.
          {orderNumber && (
            <>
              <br />
              Order Number: <span className="font-semibold">{orderNumber}</span>
            </>
          )}
        </p>

        {/* Order Status Info */}
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
                What's Next?
              </p>
              <p className="text-sm text-blue-700">
                Your order is pending approval from the wholesaler. You'll receive a
                notification once it's approved and ready for delivery.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {orderId ? (
            <Link
              href={`/retailer/orders/${orderId}`}
              className="block w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              View Order Details
            </Link>
          ) : (
            <Link
              href="/retailer/orders"
              className="block w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              View All Orders
            </Link>
          )}
          
          <Link
            href="/retailer/shops"
            className="block w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 transition"
          >
            Continue Shopping
          </Link>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          You will be automatically redirected in 10 seconds...
        </p>
      </div>
    </div>
  );
}
