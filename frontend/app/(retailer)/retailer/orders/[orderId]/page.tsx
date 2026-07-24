/**
 * Retailer Order Details Page
 * Phase 4 update — aligned to API Order shape from /lib/api/orders.ts
 */

'use client';

import { useState, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useOrderDetails } from '@/hooks';
import { cancelOrder } from '@/lib/api';
import { OrderStatusBadge } from '@/components/retailer/orders/OrderStatusBadge';
import {
  OrderDetailsSkeleton,
  ErrorDisplay,
  InlineSuccess,
} from '@/components/ui';

function OrderDetailsContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderId = params.orderId as string;
  const showSuccess = searchParams.get('success') === 'true';

  const { order, isLoading, error, refresh } = useOrderDetails(orderId);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

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

  const o = order as any;

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    try {
      setIsCancelling(true);
      setCancelError(null);
      await cancelOrder(orderId, 'Cancelled by retailer');
      refresh();
    } catch (err: any) {
      setCancelError(err?.message || 'Failed to cancel order');
    } finally {
      setIsCancelling(false);
    }
  };

  const subtotal = o.subtotal ?? o.totals?.subtotal ?? 0;
  const taxAmount = o.taxAmount ?? o.totals?.taxAmount ?? 0;
  const deliveryCharge = o.deliveryCharge ?? o.totals?.deliveryCharge ?? 0;
  const discount = o.discount ?? o.totals?.discount ?? 0;
  const grandTotal = o.grandTotal ?? o.totals?.grandTotal ?? 0;
  const da = o.deliveryAddress || {};

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
                Order {o.orderNumber}
              </h1>
              <p className="text-sm text-gray-600">
                Placed on {o.createdAt ? new Date(o.createdAt).toLocaleString() : '—'}
              </p>
            </div>
            <OrderStatusBadge status={o.state} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">

            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Order Items ({(o.items || []).length})
              </h2>
              <div className="space-y-4">
                {(o.items || []).map((item: any, index: number) => {
                  const imageUrl = item.productSnapshot?.imageUrl || item.snapshot?.imageUrl;
                  const name = item.productSnapshot?.name || item.snapshot?.name || item.itemId;
                  const unitPrice = item.priceSnapshot?.unitPrice ?? item.snapshot?.price ?? 0;
                  const qty = item.quantity ?? item.qty ?? 0;
                  const lineTotal = item.itemTotal ?? item.subtotal ?? (unitPrice * qty);
                  return (
                    <div key={index} className="flex gap-4 pb-4 border-b last:border-0">
                      {imageUrl && (
                        <div className="w-20 h-20 flex-shrink-0 rounded-md overflow-hidden bg-gray-100">
                          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{name}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          ₹{unitPrice.toFixed(2)} × {qty}
                        </p>
                        {(item.productSnapshot?.sku || item.snapshot?.sku) && (
                          <p className="text-xs text-gray-500 mt-1">
                            SKU: {item.productSnapshot?.sku || item.snapshot?.sku}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          ₹{lineTotal.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Order Timeline */}
            {o.auditLog && o.auditLog.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Order History</h2>
                <div className="space-y-4">
                  {o.auditLog.map((log: any, index: number) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${index === 0 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        {index < o.auditLog.length - 1 && (
                          <div className="w-0.5 h-12 bg-gray-200 my-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="font-medium text-gray-900 capitalize">
                          {(log.action || '').replace(/_/g, ' ')}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}
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
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Price Details</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900">₹{subtotal.toFixed(2)}</span>
                </div>
                {taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax</span>
                    <span className="text-gray-900">₹{taxAmount.toFixed(2)}</span>
                  </div>
                )}
                {deliveryCharge > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Delivery Charge</span>
                    <span className="text-gray-900">₹{deliveryCharge.toFixed(2)}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">Discount</span>
                    <span className="text-green-600">-₹{discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="pt-3 border-t border-gray-200 flex justify-between">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="text-xl font-bold text-gray-900">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Delivery Address</h2>
              <div className="text-sm text-gray-700 space-y-1">
                {da.label && <p className="font-medium">{da.label}</p>}
                <p>{da.line1 || da.street || '—'}</p>
                {da.line2 && <p>{da.line2}</p>}
                {da.landmark && <p className="text-gray-600">Near: {da.landmark}</p>}
                <p>{da.city}{da.state ? `, ${da.state}` : ''}</p>
                {da.pincode && <p>{da.pincode}</p>}
                {da.phone && <p className="pt-2">Phone: {da.phone}</p>}
              </div>
            </div>

            {/* Payment Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment</h2>
              <p className="text-sm text-gray-700">
                {o.paymentMethod === 'cod' ? 'Cash on Delivery' :
                  o.paymentMethod === 'PHONEPE' ? 'PhonePe (Prepaid)' :
                  o.paymentMethod || '—'}
              </p>
              <div className="mt-2">
                <span className={`text-sm font-medium capitalize ${
                  o.paymentStatus === 'paid' ? 'text-green-600' :
                  o.paymentStatus === 'failed' ? 'text-red-600' : 'text-yellow-600'
                }`}>
                  {o.paymentStatus || 'pending'}
                </span>
              </div>
            </div>

            {/* Rejection Info */}
            {o.state === 'REJECTED' && o.rejectionReason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-medium text-red-800">Order Rejected</p>
                <p className="text-sm text-red-600 mt-1 capitalize">
                  Reason: {(o.rejectionReason || '').replace(/_/g, ' ')}
                </p>
                {o.rejectionNotes && (
                  <p className="text-sm text-red-500 mt-1">{o.rejectionNotes}</p>
                )}
              </div>
            )}

            {/* Cancel Action */}
            {o.state === 'PENDING_APPROVAL' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                {cancelError && (
                  <p className="text-sm text-red-600 mb-3">{cancelError}</p>
                )}
                <button
                  onClick={handleCancel}
                  disabled={isCancelling}
                  className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                >
                  {isCancelling ? 'Cancelling...' : 'Cancel Order'}
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

export default function OrderDetailsPage() {
  return (
    <Suspense fallback={<OrderDetailsSkeleton />}>
      <OrderDetailsContent />
    </Suspense>
  );
}
