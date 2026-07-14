/**
 * Order Card Component - Display order in list view
 */

'use client';

type OrderState = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'PACKED' | 'READY_FOR_PICKUP' | 'ASSIGNED' | 'PICKED_UP' | 'ON_THE_WAY' | 'DELIVERED' | 'DISPUTED' | 'PAYMENT_SETTLED';

interface OrderCardProps {
  orderNumber: string;
  state: OrderState;
  createdAt: string | Date;
  grandTotal: number;
  itemCount: number;
  paymentMethod: string;
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
  const date = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  
  const getStateColor = (state: OrderState) => {
    const colors: Record<string, string> = {
      PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
      DELIVERED: 'bg-blue-100 text-blue-800',
    };
    return colors[state] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition cursor-pointer"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-semibold text-gray-900">{orderNumber}</p>
          <p className="text-sm text-gray-500">{date.toLocaleDateString()}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStateColor(state)}`}>
          {state.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="space-y-1 text-sm">
        <p className="text-gray-600">
          {itemCount} {itemCount === 1 ? 'item' : 'items'} • {paymentMethod === 'prepaid' ? 'Prepaid' : 'COD'}
        </p>
        <p className="text-lg font-bold text-gray-900">₹{grandTotal.toFixed(2)}</p>
      </div>
    </div>
  );
}
