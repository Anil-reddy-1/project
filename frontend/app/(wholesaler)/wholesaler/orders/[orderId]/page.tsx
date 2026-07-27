/**
 * Wholesaler Order Detail Page
 * Phase 4 — Wholesaler Approval & Inventory Lock
 *
 * Full order detail view with state-aware action buttons:
 *  - PENDING_APPROVAL: Approve / Reject (with reason modal)
 *  - APPROVED: Mark Packed
 *  - PACKED: Mark Ready for Pickup
 *  - READY_FOR_PICKUP: Display OTP
 */

'use client';

import { useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useOrderDetails } from '@/hooks/useOrderDetails';
import { useOrderActions } from '@/hooks/useOrderActions';
import { OrderStatusBadge } from '@/components/retailer/orders/OrderStatusBadge';
import { OrderDetailsSkeleton, ErrorDisplay } from '@/components/ui';
import type { OrderRejectionReason } from '@/lib/api';

const REJECTION_REASONS: { value: OrderRejectionReason; label: string }[] = [
  { value: 'out_of_stock', label: 'Out of Stock' },
  { value: 'moq_not_met', label: 'Minimum Order Quantity Not Met' },
  { value: 'pricing_error', label: 'Pricing Error' },
  { value: 'suspicious_order', label: 'Suspicious Order' },
  { value: 'wholesaler_unavailable', label: 'Wholesaler Unavailable' },
  { value: 'other', label: 'Other' },
];

export default function WholesalerOrderDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;

  const { order, isLoading, error, refresh } = useOrderDetails(orderId);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState<OrderRejectionReason>('out_of_stock');
  const [rejectNotes, setRejectNotes] = useState('');
  const [pickupOTP, setPickupOTP] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showFeedback = useCallback((type: 'success' | 'error', message: string) => {
    setActionFeedback({ type, message });
    setTimeout(() => setActionFeedback(null), 4000);
  }, []);

  const {
    isLoading: isActing,
    approveOrder,
    rejectOrder,
    markPacked,
    markReadyForPickup,
  } = useOrderActions(
    useCallback(
      (action: string) => {
        const labels: Record<string, string> = {
          approve: 'Order approved — inventory locked ✅',
          reject: 'Order rejected ❌',
          pack: 'Order marked as packed 📦',
          ready: 'Order ready for pickup — OTP generated 🚚',
        };
        showFeedback('success', labels[action] || 'Action completed');
        refresh();
      },
      [refresh, showFeedback]
    )
  );

  const handleApprove = async () => {
    try {
      await approveOrder(orderId);
    } catch {
      showFeedback('error', 'Failed to approve order');
    }
  };

  const handleReject = async () => {
    try {
      await rejectOrder(orderId, rejectReason, rejectNotes || undefined);
      setShowRejectModal(false);
      setRejectNotes('');
    } catch {
      showFeedback('error', 'Failed to reject order');
    }
  };

  const handleMarkPacked = async () => {
    try {
      await markPacked(orderId);
    } catch {
      showFeedback('error', 'Failed to mark as packed');
    }
  };

  const handleMarkReady = async () => {
    try {
      const result = await markReadyForPickup(orderId);
      if (result?.pickupOTP) {
        setPickupOTP(result.pickupOTP);
      }
    } catch {
      showFeedback('error', 'Failed to mark ready for pickup');
    }
  };

  if (isLoading) {
    return <OrderDetailsSkeleton />;
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <ErrorDisplay
            title="Order Not Found"
            message={error || 'Unable to load order details'}
            onRetry={refresh}
          />
        </div>
      </div>
    );
  }

  // Use whichever data shape the API returns
  const orderData = order as any;
  const items = orderData.items || [];
  const subtotal = orderData.subtotal ?? orderData.totals?.subtotal ?? 0;
  const taxAmount = orderData.taxAmount ?? orderData.totals?.taxAmount ?? 0;
  const taxPercentage = orderData.taxPercentage ?? orderData.totals?.taxPercentage ?? 0;
  const deliveryCharge = orderData.deliveryCharge ?? orderData.totals?.deliveryCharge ?? 0;
  const discount = orderData.discount ?? orderData.totals?.discount ?? 0;
  const grandTotal = orderData.grandTotal ?? orderData.totals?.grandTotal ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Navigation */}
        <button
          onClick={() => router.push('/wholesaler/orders')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6 text-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6" />
          </svg>
          <span className="ml-1">Back to Orders</span>
        </button>

        {/* Action Feedback */}
        {actionFeedback && (
          <div
            className={`mb-4 p-4 rounded-lg text-sm font-medium ${
              actionFeedback.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {actionFeedback.message}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Order {orderData.orderNumber}
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              {new Date(orderData.createdAt).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <OrderStatusBadge status={orderData.state} />
        </div>

        {/* Pickup OTP Display */}
        {(pickupOTP || orderData.pickupOTP) && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6 text-center">
            <p className="text-sm text-purple-600 font-medium mb-2">Pickup OTP</p>
            <p className="text-4xl font-bold tracking-[8px] text-purple-900 font-mono">
              {pickupOTP || orderData.pickupOTP}
            </p>
            <p className="text-xs text-purple-500 mt-2">Share this with the delivery partner for pickup verification</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>

          {orderData.state === 'PENDING_APPROVAL' && (
            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                disabled={isActing}
                className="flex-1 px-4 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                {isActing ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  '✓'
                )}
                Approve Order
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={isActing}
                className="flex-1 px-4 py-3 bg-white text-red-600 font-semibold rounded-lg border-2 border-red-200 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                ✕ Reject Order
              </button>
            </div>
          )}

          {orderData.state === 'APPROVED' && (
            <button
              onClick={handleMarkPacked}
              disabled={isActing}
              className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              📦 Mark as Packed
            </button>
          )}

          {orderData.state === 'PACKED' && (
            <button
              onClick={handleMarkReady}
              disabled={isActing}
              className="w-full px-4 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              🚚 Mark Ready for Pickup
            </button>
          )}

          {orderData.state === 'READY_FOR_PICKUP' && (
            <button
              onClick={async () => {
                try {
                  const response = await fetch(`http://localhost:3001/api/delivery-assignments/assign`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${await (await import('@/lib/firebase/client')).auth.currentUser?.getIdToken()}`,
                    },
                    body: JSON.stringify({
                      orderId: orderData.orderId,
                      slaDurationSeconds: 60,
                    }),
                  });

                  if (response.ok) {
                    const data = await response.json();
                    showFeedback('success', `Delivery partner assigned! Assignment ID: ${data.assignment.assignmentId.slice(0, 8)}...`);
                    refresh();
                  } else {
                    const error = await response.json();
                    showFeedback('error', error.error || 'Failed to assign delivery partner');
                  }
                } catch (err) {
                  showFeedback('error', 'Failed to assign delivery partner');
                  console.error('Assignment error:', err);
                }
              }}
              disabled={isActing}
              className="w-full px-4 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              🚴 Assign Delivery Partner
            </button>
          )}

          {orderData.state === 'REJECTED' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-medium text-red-800">Order was rejected</p>
              {orderData.rejectionReason && (
                <p className="text-sm text-red-600 mt-1">
                  Reason: {REJECTION_REASONS.find((r) => r.value === orderData.rejectionReason)?.label || orderData.rejectionReason}
                </p>
              )}
              {orderData.rejectionNotes && (
                <p className="text-sm text-red-500 mt-1">Notes: {orderData.rejectionNotes}</p>
              )}
            </div>
          )}

          {orderData.state === 'CANCELLED' && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">This order was cancelled by the retailer.</p>
            </div>
          )}
        </div>

        {/* Customer Info */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="text-gray-900 font-medium">{orderData.retailerSnapshot?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="text-gray-900">{orderData.retailerSnapshot?.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="text-gray-900">{orderData.retailerSnapshot?.phone || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Delivery Address</p>
              <p className="text-gray-900">
                {orderData.deliveryAddress
                  ? `${orderData.deliveryAddress.line1}${orderData.deliveryAddress.line2 ? ', ' + orderData.deliveryAddress.line2 : ''}, ${orderData.deliveryAddress.city}, ${orderData.deliveryAddress.state} ${orderData.deliveryAddress.pincode}`
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Items ({items.length})
          </h2>
          <div className="divide-y divide-gray-100">
            {items.map((item: any, index: number) => (
              <div key={item.itemId || index} className="py-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  {item.productSnapshot?.imageUrl && (
                    <img
                      src={item.productSnapshot.imageUrl}
                      alt={item.productSnapshot?.name}
                      className="w-12 h-12 rounded-lg object-cover bg-gray-100"
                    />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{item.productSnapshot?.name || item.itemId}</p>
                    <p className="text-sm text-gray-500">
                      ₹{(item.priceSnapshot?.unitPrice ?? item.price ?? 0).toFixed(2)} × {item.quantity ?? item.qty}
                    </p>
                  </div>
                </div>
                <p className="font-semibold text-gray-900">
                  ₹{(item.itemTotal ?? (item.price || 0) * (item.qty || 0)).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-gray-200 mt-4 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="text-gray-900">₹{subtotal.toFixed(2)}</span>
            </div>
            {taxAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax ({taxPercentage}%)</span>
                <span className="text-gray-900">₹{taxAmount.toFixed(2)}</span>
              </div>
            )}
            {deliveryCharge > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Delivery</span>
                <span className="text-gray-900">₹{deliveryCharge.toFixed(2)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Discount</span>
                <span className="text-green-600">-₹{discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t border-gray-200 pt-2">
              <span>Grand Total</span>
              <span className="text-green-600">₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Info */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Method</p>
              <p className="text-gray-900 font-medium capitalize">
                {orderData.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Prepaid'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="text-gray-900 font-medium capitalize">{orderData.paymentStatus}</p>
            </div>
          </div>
        </div>

        {/* Audit Log */}
        {orderData.auditLog && orderData.auditLog.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Timeline</h2>
            <div className="space-y-4">
              {orderData.auditLog.map((entry: any, i: number) => (
                <div key={entry.logId || i} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {entry.action?.replace(/_/g, ' ')}
                    </p>
                    {entry.beforeState && entry.afterState && (
                      <p className="text-xs text-gray-500">
                        {entry.beforeState} → {entry.afterState}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      {new Date(entry.timestamp).toLocaleString('en-IN')} · {entry.actorRole}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject Order</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please select a reason for rejecting order <strong>{orderData.orderNumber}</strong>.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value as OrderRejectionReason)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  {REJECTION_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes {rejectReason === 'other' ? '*' : '(optional)'}
                </label>
                <textarea
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  placeholder="Add any additional details..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectNotes('');
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={isActing || (rejectReason === 'other' && !rejectNotes.trim())}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isActing ? 'Rejecting...' : 'Reject Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
