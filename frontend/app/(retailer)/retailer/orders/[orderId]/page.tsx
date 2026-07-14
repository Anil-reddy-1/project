/**
 * Order Details Page
 * Display detailed order information
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getOrderById, cancelOrder } from '@/lib/api/orders';
import { OrderStatusBadge } from '@/components/retailer/orders/OrderStatusBadge';

interface Order {
  id: string;
  orderNumber: string;
  state: any;
  items: any[];
  subtotal: number;
  taxAmount: number;
  deliveryCharge: number;
  discount: number;
  grandTotal: number;
  deliveryAddress: any;
  paymentMethod: string;
  createdAt: any;
  updatedAt: any;
}

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      setIsLoading(true);
      const data = await getOrderById(orderId);
      setOrder(data as any);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load order');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this order?')) return;

    try {
      setIsCancelling(true);
      await cancelOrder(orderId, 'Cancelled by customer');
      await loadOrder(); // Reload to get updated state
    } catch (err: any) {
      alert(err.message || 'Failed to cancel order');
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading order...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600 mb-4">{error || 'Order not found'}</p>
            <button
              onClick={() => router.push('/retailer/orders')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Back to Orders
            </button>
          </div>
        </div>
      </div>
    );
  }

  const canCancel = order.state === 'PENDING_APPROVAL';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/retailer/orders')}
            className="text-blue-600 hover:text-blue-700 mb-4 inline-flex items-center"
          >
            ← Back to Orders
          </button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{order.orderNumber}</h1>
              <p className="text-gray-600 mt-1">
                Placed on {new Date(order.createdAt).toLocaleString()}
              </p>
            </div>
            <OrderStatusBadge status={order.state} />
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
          <div className="space-y-4">
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between items-start border-b border-gray-200 pb-4 last:border-0">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                  <p className="text-sm text-gray-600">Price: ₹{item.price.toFixed(2)} each</p>
                </div>
                <p className="font-semibold text-gray-900">
                  ₹{(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Price Details</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>₹{order.subtotal.toFixed(2)}</span>
            </div>
            {order.taxAmount > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span>₹{order.taxAmount.toFixed(2)}</span>
              </div>
            )}
            {order.deliveryCharge > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Delivery Charge</span>
                <span>₹{order.deliveryCharge.toFixed(2)}</span>
              </div>
            )}
            {order.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-₹{order.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-2 mt-2">
              <div className="flex justify-between text-lg font-bold text-gray-900">
                <span>Grand Total</span>
                <span>₹{order.grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Address */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Delivery Address</h2>
          <div className="text-gray-600">
            <p>{order.deliveryAddress.line1}</p>
            {order.deliveryAddress.line2 && <p>{order.deliveryAddress.line2}</p>}
            <p>{order.deliveryAddress.city}, {order.deliveryAddress.state} - {order.deliveryAddress.pincode}</p>
            <p className="mt-2">Phone: {order.deliveryAddress.phone}</p>
          </div>
        </div>

        {/* Payment Info */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h2>
          <p className="text-gray-600">
            Payment Method: <span className="font-medium text-gray-900">
              {order.paymentMethod === 'prepaid' ? 'Prepaid (Online)' : 'Cash on Delivery'}
            </span>
          </p>
        </div>

        {/* Actions */}
        {canCancel && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <button
              onClick={handleCancel}
              disabled={isCancelling}
              className="w-full bg-red-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              {isCancelling ? 'Cancelling...' : 'Cancel Order'}
            </button>
            <p className="text-sm text-gray-500 text-center mt-2">
              You can only cancel orders that are pending approval
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
