/**
 * Orders List Page
 * Display all retailer orders with filters
 */

'use client';

import { useState } from 'react';
import { useOrders } from '@/hooks';
import { OrderCard } from '@/components/retailer/orders/OrderCard';
import { useRouter } from 'next/navigation';

export default function OrdersPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const { orders, loading, error, refetch } = useOrders({
    state: statusFilter === 'all' ? undefined : (statusFilter as any),
    limit: 20,
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
          <button
            onClick={() => refetch()}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex gap-2 overflow-x-auto">
            {['all', 'PENDING_APPROVAL', 'APPROVED', 'DELIVERED', 'CANCELLED'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'All' : status.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading orders...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600">{error}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-600 mb-4">No orders found</p>
            <button
              onClick={() => router.push('/retailer')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.map((order) => (
              <OrderCard
                key={order.orderId}
                orderNumber={order.orderNumber}
                state={order.state}
                createdAt={order.createdAt}
                grandTotal={order.grandTotal}
                itemCount={order.items.length}
                paymentMethod={order.paymentMethod}
                onClick={() => router.push(`/retailer/orders/${order.orderId}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
