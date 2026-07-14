/**
 * Order Card Component
 * Task #18: Order management pages
 * 
 * Display order summary in list view
 */

'use client';

import { OrderStatusBadge } from './OrderStatusBadge';
import type { OrderState, PaymentMethod } from '@/lib/types';

interface OrderCardProps {
  orderNumber: string;
  state: OrderState;
  createdAt: string;
  grandTotal: number;
  itemCount: number;
  paymentMethod: PaymentMethod;
  onClick: () => void;
}

export function OrderCard({
  orderNumber,
  state,
  createdAt,
  grandTotal,
  itemCount,
  paymentMethod,
  onClick,
}: OrderCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition cursor-pointer border border-gray-200 hover:border-blue-300"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Order {orderNumber}
          </h3>
          <p className="text-sm text-gray-600">
            {new Date(createdAt).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        <OrderStatusBadge status={state} />
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Items</span>
          <span className="text-gray-900 font-medium">{itemCount}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Payment</span>
          <span className="text-gray-900 font-medium">
            {paymentMethod === 'PHONEPE' ? 'PhonePe' : 'Cash on Delivery'}
          </span>
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <span className="text-sm text-gray-600">Total Amount</span>
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-gray-900">
            ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
