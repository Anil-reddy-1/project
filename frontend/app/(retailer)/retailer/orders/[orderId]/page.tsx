/**
 * Order Details Page
 * Task #18: Order management pages
 * 
 * Display detailed information about a specific order
 */

'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useOrderDetails } from '@/hooks';
import { OrderStatusBadge } from '@/components/retailer/orders/OrderStatusBadge';
import {
  OrderDetailsSkeleton,
  ErrorDisplay,
  InlineSuccess,
} from '@/components/ui';

export default function OrderDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const orderId = params.orderId as string;
  const showSuccess = searchParams.get('success') === 'true';
  
  const { order, isLoading, error, refresh } = useOrderDetails(orderId);

  if (isLoading) {
    return <OrderDetailsSkeleton />;
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <ErrorDisplay
            title="Failed to Load Order"
            message={error || 'Order not found'}
            onRetry={refresh}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Success Message */}
        {showSuccess && (
          <div className="mb-6">
            <InlineSuccess message="Order placed successfully! The wholesaler will review your order soon." />
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Order {order.orderNumber}
              </h1>
              <p className="text-sm text-gray-600">
                Placed on {new Date(order.createdAt).toLocaleString()}
              </p>
            </div>
            <OrderStatusBadge status={order.state} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Order Items ({order.items.length})
              </h2>
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div key={index} className="flex gap-4 pb-4 border-b last:border-0">
                    {item.snapshot.imageUrl && (
                      <div className="w-20 h-20 flex-shrink-0 rounded-md overflow-hidden bg-gray-100">
                        <img
                          src={item.snapshot.imageUrl}
                          alt={item.snapshot.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">
                        {item.snapshot.name}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        ₹{item.snapshot.price.toFixed(2)} × {item.quantity}
                      </p>
                      {item.snapshot.sku && (
                        <p className="text-xs text-gray-500 mt-1">
                          SKU: {item.snapshot.sku}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        ₹{item.subtotal.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Timeline */}
            {order.auditLog && order.auditLog.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Order History
                </h2>
                <div className="space-y-4">
                  {order.auditLog.map((log, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            index === 0
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          <svg
                            className="w-4 h-4"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        {index < order.auditLog!.length - 1 && (
                          <div className="w-0.5 h-12 bg-gray-200 my-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="font-medium text-gray-900">
                          {log.action.replace(/_/g, ' ')}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {new Date(log.timestamp).toLocaleString()}
                        </p>
                        {log.notes && (
                          <p className="text-sm text-gray-500 mt-1">{log.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Price Breakdown */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Price Details
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900">
                    ₹{order.totals.subtotal.toFixed(2)}
                  </span>
                </div>
                
                {order.totals.taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax</span>
                    <span className="text-gray-900">
                      ₹{order.totals.taxAmount.toFixed(2)}
                    </span>
                  </div>
                )}

                {order.totals.deliveryCharge > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Delivery Charge</span>
                    <span className="text-gray-900">
                      ₹{order.totals.deliveryCharge.toFixed(2)}
                    </span>
                  </div>
                )}

                {order.totals.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">Discount</span>
                    <span className="text-green-600">
                      -₹{order.totals.discount.toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="pt-3 border-t border-gray-200 flex justify-between">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="text-xl font-bold text-gray-900">
                    ₹{order.totals.grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Delivery Address
              </h2>
              <div className="text-sm text-gray-700 space-y-1">
                {order.deliveryAddress.label && (
                  <p className="font-medium">{order.deliveryAddress.label}</p>
                )}
                <p>{order.deliveryAddress.street}</p>
                {order.deliveryAddress.landmark && (
                  <p className="text-gray-600">
                    Near: {order.deliveryAddress.landmark}
                  </p>
                )}
                <p>
                  {order.deliveryAddress.city}, {order.deliveryAddress.state}
                </p>
                <p>{order.deliveryAddress.pincode}</p>
                <p className="pt-2">Phone: {order.deliveryAddress.phone}</p>
              </div>
            </div>

            {/* Payment Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Payment Method
              </h2>
              <p className="text-sm text-gray-700">
                {order.paymentMethod === 'PHONEPE' ? 'PhonePe (Prepaid)' : 'Cash on Delivery'}
              </p>
              {order.payment && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Payment Status</span>
                    <span
                      className={`font-medium ${
                        order.payment.status === 'SUCCESS'
                          ? 'text-green-600'
                          : order.payment.status === 'FAILED'
                          ? 'text-red-600'
                          : 'text-yellow-600'
                      }`}
                    >
                      {order.payment.status}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            {order.state === 'PENDING_APPROVAL' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to cancel this order?')) {
                      // TODO: Implement cancel order
                      alert('Cancel order functionality to be implemented');
                    }
                  }}
                  className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition"
                >
                  Cancel Order
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-6">
          <button
            onClick={() => router.push('/retailer/orders')}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Orders
          </button>
        </div>
      </div>
    </div>
  );
}
