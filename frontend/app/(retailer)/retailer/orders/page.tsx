/**
 * Retailer Orders List Page
 * Task #18: Order management pages
 * 
 * Display all orders placed by retailer
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrders } from '@/hooks';
import { OrderCard } from '@/components/retailer/orders/OrderCard';
import { OrderListSkeleton, EmptyOrders, ErrorDisplay } from '@/components/ui';
import type { OrderState } from '@/lib/types';

export default function RetailerOrdersPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<OrderState | undefined>(undefined);
  
  const { orders, isLoading, error, refresh } = useOrders({
    status: statusFilter,
  });

  const statusOptions: { value: OrderState | undefined; label: string }[] = [
    { value: undefined, label: 'All Orders' },
    { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'PACKED', label: 'Packed' },
    { value: 'SHIPPED', label: 'Shipped' },
    { value: 'DELIVERED', label: 'Delivered' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
          <p className="text-gray-600 mt-1">View and manage your orders</p>
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
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && <OrderListSkeleton />}

        {/* Orders List */}
        {!isLoading && orders.length > 0 && (
          <div className="space-y-4">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                orderNumber={order.orderNumber}
                state={order.state}
                createdAt={order.createdAt}
                grandTotal={order.totals.grandTotal}
                itemCount={order.items.length}
                paymentMethod={order.paymentMethod}
                onClick={() => router.push(`/retailer/orders/${order.id}`)}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && orders.length === 0 && <EmptyOrders />}
      </div>
    </div>
  );
}
