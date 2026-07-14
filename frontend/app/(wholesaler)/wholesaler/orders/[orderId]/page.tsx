/**
 * Wholesaler Order Details Page
 * Task #21: Wholesaler order view pages
 * 
 * Display detailed order information for wholesaler
 * Note: Approval/rejection actions disabled - Phase 4 functionality
 */

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useOrderDetails } from '@/hooks';
import { OrderStatusBadge } from '@/components/retailer/orders/OrderStatusBadge';
import {
  OrderDetailsSkeleton,
  ErrorDisplay,
  InlineWarning,
} from '@/components/ui';

export default function WholesalerOrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  
  const orderId = params.orderId as string;
  const { order, isLoading, error, refresh } = useOrderDetails(orderId);

  if (isLoading) {
    return <OrderDetailsSkeleton />;
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Phase 4 Notice */}
        <div className="mb-6">
          <InlineWarning message="Order approval and management features are coming in Phase 4. Viewing in read-only mode." />
        </div>

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
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

          {/* Action Buttons (Disabled for Phase 3) */}
          {order.state === 'PENDING_APPROVAL' && (
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                disabled
                className="flex-1 bg-gray-200 text-gray-400 py-2 px-4 rounded-lg font-semibold cursor-not-allowed"
              >
                Approve Order (Phase 4)
              </button>
              <button
                disabled
                className="flex-1 bg-gray-200 text-gray-400 py-2 px-4 rounded-lg font-semibold cursor-not-allowed"
              >
                Reject Order (Phase 4)
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Customer Information
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Retailer ID</span>
                  <span className="text-gray-900 font-medium">
                    {order.retailer.uid}
                  </span>
                </div>
                {order.retailer.email && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Email</span>
                    <span className="text-gray-900">{order.retailer.email}</span>
                  </div>
                )}
                {order.retailer.phone && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Phone</span>
                    <span className="text-gray-900">{order.retailer.phone}</span>
                  </div>
                )}
              </div>
            </div>

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
                      <p className="text-xs text-gray-500 mt-1">
                        Qty: {item.quantity}
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
                        {log.actorId && (
                          <p className="text-xs text-gray-500 mt-1">
                            By: {log.actorId}
                          </p>
                        )}
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
                Payment Information
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Method</span>
                  <span className="text-gray-900 font-medium">
                    {order.paymentMethod === 'PHONEPE' ? 'PhonePe (Prepaid)' : 'Cash on Delivery'}
                  </span>
                </div>
                
                {order.payment && (
                  <>
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
                    
                    {order.payment.phonepeMerchantTransactionId && (
                      <div className="pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-500">Transaction ID</p>
                        <p className="text-xs text-gray-900 font-mono mt-1 break-all">
                          {order.payment.phonepeMerchantTransactionId}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Notes Section (for future use) */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Internal Notes
              </h2>
              <p className="text-sm text-gray-500 italic">
                Note-taking feature coming in Phase 4
              </p>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-6">
          <button
            onClick={() => router.push('/wholesaler/orders')}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Orders
          </button>
        </div>
      </div>
    </div>
  );
}
