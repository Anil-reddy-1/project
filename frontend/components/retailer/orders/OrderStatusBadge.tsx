/**
 * Order Status Badge Component
 * Phase 4 update — aligned to canonical OrderState type
 *
 * Valid states: PENDING_APPROVAL, APPROVED, REJECTED, PACKED,
 * READY_FOR_PICKUP, ASSIGNED, PICKED_UP, ON_THE_WAY,
 * DELIVERED, CANCELLED, DISPUTED, PAYMENT_SETTLED
 */

'use client';

import type { OrderState } from '@/lib/types';

interface OrderStatusBadgeProps {
  status: OrderState | string;
  size?: 'sm' | 'md' | 'lg';
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  PENDING_APPROVAL: {
    label: 'Pending Approval',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100 border-yellow-200',
  },
  APPROVED: {
    label: 'Approved',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100 border-blue-200',
  },
  REJECTED: {
    label: 'Rejected',
    color: 'text-red-700',
    bgColor: 'bg-red-100 border-red-200',
  },
  PACKED: {
    label: 'Packed',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100 border-indigo-200',
  },
  READY_FOR_PICKUP: {
    label: 'Ready for Pickup',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100 border-purple-200',
  },
  ASSIGNED: {
    label: 'Assigned',
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-100 border-cyan-200',
  },
  PICKED_UP: {
    label: 'Picked Up',
    color: 'text-teal-700',
    bgColor: 'bg-teal-100 border-teal-200',
  },
  ON_THE_WAY: {
    label: 'On The Way',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100 border-orange-200',
  },
  DELIVERED: {
    label: 'Delivered',
    color: 'text-green-700',
    bgColor: 'bg-green-100 border-green-200',
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100 border-gray-200',
  },
  DISPUTED: {
    label: 'Disputed',
    color: 'text-red-700',
    bgColor: 'bg-red-50 border-red-300',
  },
  PAYMENT_SETTLED: {
    label: 'Payment Settled',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100 border-emerald-200',
  },
};

export function OrderStatusBadge({ status, size = 'md' }: OrderStatusBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  const config = STATUS_CONFIG[status] || {
    label: status || 'Unknown',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 border-gray-200',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${sizeClasses[size]} ${config.color} ${config.bgColor} rounded-full font-semibold border`}
    >
      {config.label}
    </span>
  );
}
