/**
 * Wholesaler Orders List Page
 * Task #21: Wholesaler order view pages
 * 
 * Display all orders for wholesaler review
 * Note: Approval/rejection actions disabled - Phase 4 functionality
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrders } from '@/hooks';
import { OrderCard } from '@/components/retailer/orders/OrderCard';
import { OrderListSkeleton, EmptyOrders, ErrorDisplay, InlineWarning } from '@/components/ui';
import type { OrderState } from '@/lib/types';

export default function WholesalerOrdersPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<OrderState | undefined>('PENDING_APPROVAL');
  
  const { orders, isLoading, error, refresh } = useOrders({
    status: statusFilter,
  });

  const statusOptions: { value: OrderState | undefined; label: string; count?: number }[] = [
    { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'PACKED', label: 'Packed' },
    { value: 'SHIPPED', label: 'Shipped' },
    { value: 'DELIVERED', label: 'Delivered' },
    { value: undefined, label: 'All Orders' },
  ];

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <ErrorDisplay
            title="Failed to Load Orders"
            message={error}
            onRetry={refresh}
          />
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

        {/* Phase 4 Notice */}
        <div className="mb-6">
          <InlineWarning message="Order approval and management features are coming in Phase 4. Currently viewing orders in read-only mode." />
        </div>

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
                {option.count !== undefined && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-white/20 text-xs">
                    {option.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
              {
                orders.filter((o) =>
                  ['APPROVED', 'PACKED', 'SHIPPED'].includes(o.state)
                ).length
              }
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600 mb-1">Delivered</p>
            <p className="text-2xl font-bold text-green-600">
              {orders.filter((o) => o.state === 'DELIVERED').length}
            </p>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && <OrderListSkeleton />}

        {/* Orders List */}
        {!isLoading && orders.length > 0 && (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="relative">
                <OrderCard
                  orderNumber={order.orderNumber}
                  state={order.state}
                  createdAt={order.createdAt}
                  grandTotal={order.totals.grandTotal}
                  itemCount={order.items.length}
                  paymentMethod={order.paymentMethod}
                  onClick={() => router.push(`/wholesaler/orders/${order.id}`)}
                />
                {order.state === 'PENDING_APPROVAL' && (
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                      Action Required
                    </span>
                  </div>
                )}
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
