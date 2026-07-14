/**
 * Order Status Badge Component
 */

'use client';

type OrderState = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'PACKED' | 'READY_FOR_PICKUP' | 'ASSIGNED' | 'PICKED_UP' | 'ON_THE_WAY' | 'DELIVERED' | 'DISPUTED' | 'PAYMENT_SETTLED';

interface OrderStatusBadgeProps {
  status: OrderState;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const getStatusConfig = (state: OrderState) => {
    const configs: Record<string, { color: string; label: string }> = {
      PENDING_APPROVAL: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Pending Approval' },
      APPROVED: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Approved' },
      REJECTED: { color: 'bg-red-100 text-red-800 border-red-200', label: 'Rejected' },
      PACKED: { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Packed' },
      READY_FOR_PICKUP: { color: 'bg-purple-100 text-purple-800 border-purple-200', label: 'Ready for Pickup' },
      ASSIGNED: { color: 'bg-indigo-100 text-indigo-800 border-indigo-200', label: 'Partner Assigned' },
      PICKED_UP: { color: 'bg-indigo-100 text-indigo-800 border-indigo-200', label: 'Picked Up' },
      ON_THE_WAY: { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'On the Way' },
      DELIVERED: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Delivered' },
      CANCELLED: { color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Cancelled' },
      DISPUTED: { color: 'bg-orange-100 text-orange-800 border-orange-200', label: 'Disputed' },
      PAYMENT_SETTLED: { color: 'bg-teal-100 text-teal-800 border-teal-200', label: 'Payment Settled' },
    };
    return configs[state] || { color: 'bg-gray-100 text-gray-800 border-gray-200', label: state };
  };

  const config = getStatusConfig(status);

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${config.color}`}>
      {config.label}
    </span>
  );
}
