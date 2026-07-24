/**
 * Wholesaler Orders List Page
 * Phase 4 — Wholesaler Approval & Inventory Lock
 *
 * Full order management: view, filter, approve/reject, pack, ready for pickup
 */

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useOrders } from '@/hooks';
import { useOrderActions } from '@/hooks/useOrderActions';
import { OrderCard } from '@/components/retailer/orders/OrderCard';
import { OrderListSkeleton, EmptyOrders, ErrorDisplay } from '@/components/ui';
import type { OrderState } from '@/lib/types';

export default function WholesalerOrdersPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<OrderState | undefined>('PENDING_APPROVAL');
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { orders, isLoading, error, refresh } = useOrders({
    status: statusFilter,
  });

  const { isLoading: isActing, approveOrder, markPacked, markReadyForPickup } = useOrderActions(
    useCallback(
      (action: string) => {
        const labels: Record<string, string> = {
          approve: 'Order approved — inventory locked',
          pack: 'Order marked as packed',
          ready: 'Order ready for pickup — OTP generated',
        };
        setActionFeedback({ type: 'success', message: labels[action] || 'Action completed' });
        setTimeout(() => setActionFeedback(null), 3000);
        refresh();
      },
      [refresh]
    )
  );

  const statusOptions: { value: OrderState | undefined; label: string }[] = [
    { value: 'PENDING_APPROVAL', label: '⏳ Pending' },
    { value: 'APPROVED', label: '✅ Approved' },
    { value: 'PACKED', label: '📦 Packed' },
    { value: 'READY_FOR_PICKUP', label: '🚚 Ready' },
    { value: 'REJECTED', label: '❌ Rejected' },
    { value: undefined, label: 'All Orders' },
  ];

  const getActionButton = (order: any) => {
    if (isActing) return null;

    switch (order.state) {
      case 'PENDING_APPROVAL':
        return (
          <div className="flex gap-2 mt-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                approveOrder(order.orderId || order.id).catch(() => {
                  setActionFeedback({ type: 'error', message: 'Failed to approve' });
                  setTimeout(() => setActionFeedback(null), 3000);
                });
              }}
              className="flex-1 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition"
            >
              ✓ Approve
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/wholesaler/orders/${order.orderId || order.id}`);
              }}
              className="flex-1 px-3 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 border border-red-200 transition"
            >
              ✕ Reject
            </button>
          </div>
        );
      case 'APPROVED':
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              markPacked(order.orderId || order.id).catch(() => {
                setActionFeedback({ type: 'error', message: 'Failed to mark packed' });
                setTimeout(() => setActionFeedback(null), 3000);
              });
            }}
            className="mt-3 w-full px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
          >
            📦 Mark Packed
          </button>
        );
      case 'PACKED':
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              markReadyForPickup(order.orderId || order.id).catch(() => {
                setActionFeedback({ type: 'error', message: 'Failed to mark ready' });
                setTimeout(() => setActionFeedback(null), 3000);
              });
            }}
            className="mt-3 w-full px-3 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition"
          >
            🚚 Ready for Pickup
          </button>
        );
      default:
        return null;
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <ErrorDisplay title="Failed to Load Orders" message={error} onRetry={refresh} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
          <p className="text-gray-600 mt-1">Review and manage customer orders</p>
        </div>

        {/* Action Feedback Toast */}
        {actionFeedback && (
          <div
            className={`mb-4 p-4 rounded-lg text-sm font-medium transition-all ${
              actionFeedback.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {actionFeedback.message}
          </div>
        )}

        {/* Processing Indicator */}
        {isActing && (
          <div className="mb-4 p-4 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-sm font-medium flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Processing order action...
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((option) => (
              <button
                key={option.label}
                onClick={() => setStatusFilter(option.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  statusFilter === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600 mb-1">Total Orders</p>
            <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600 mb-1">Pending Approval</p>
            <p className="text-2xl font-bold text-yellow-600">
              {orders.filter((o) => o.state === 'PENDING_APPROVAL').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600 mb-1">In Progress</p>
            <p className="text-2xl font-bold text-blue-600">
              {orders.filter((o) => ['APPROVED', 'PACKED'].includes(o.state)).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600 mb-1">Ready</p>
            <p className="text-2xl font-bold text-purple-600">
              {orders.filter((o) => o.state === 'READY_FOR_PICKUP').length}
            </p>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && <OrderListSkeleton />}

        {/* Orders List */}
        {!isLoading && orders.length > 0 && (
          <div className="space-y-4">
            {orders.map((order: any) => (
              <div key={order.orderId || order.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:border-blue-300 transition p-6">
                <div
                  className="cursor-pointer"
                  onClick={() => router.push(`/wholesaler/orders/${order.orderId || order.id}`)}
                >
                  <OrderCard
                    orderNumber={order.orderNumber}
                    state={order.state}
                    createdAt={order.createdAt}
                    grandTotal={order.totals?.grandTotal ?? order.grandTotal ?? 0}
                    itemCount={order.items?.length ?? 0}
                    paymentMethod={order.paymentMethod}
                    onClick={() => {}}
                  />
                </div>
                {/* Inline Action Buttons */}
                {getActionButton(order)}
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && orders.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12">
            <EmptyOrders />
          </div>
        )}
      </div>
    </div>
  );
}
