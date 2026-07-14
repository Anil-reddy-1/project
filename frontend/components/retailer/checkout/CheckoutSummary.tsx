/**
 * Checkout Summary Component
 * Derived from: Phase 3 Implementation Plan §9.3.1
 * 
 * Displays cart items and pricing breakdown during checkout
 */

'use client';

interface CartItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  moq: number;
  imageUrl?: string;
}

interface CheckoutSummaryProps {
  items: CartItem[];
  subtotal: number;
  taxAmount: number;
  taxPercentage: number;
  deliveryCharge: number;
  discount: number;
  grandTotal: number;
  onUpdateQuantity?: (itemId: string, quantity: number) => void;
  onRemoveItem?: (itemId: string) => void;
  editable?: boolean;
}

export function CheckoutSummary({
  items,
  subtotal,
  taxAmount,
  taxPercentage,
  deliveryCharge,
  discount,
  grandTotal,
  onUpdateQuantity,
  onRemoveItem,
  editable = false,
}: CheckoutSummaryProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          Order Summary ({items.length} {items.length === 1 ? 'item' : 'items'})
        </h2>
      </div>

      {/* Items List */}
      <div className="px-6 py-4 space-y-4 max-h-96 overflow-y-auto">
        {items.map((item) => (
          <div key={item.itemId} className="flex gap-4">
            {/* Product Image */}
            {item.imageUrl && (
              <div className="w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-gray-100">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Product Details */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900 truncate">
                {item.name}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                ₹{item.price.toFixed(2)} × {item.quantity}
              </p>
              <p className="text-xs text-gray-400 mt-1">MOQ: {item.moq}</p>
            </div>

            {/* Price and Actions */}
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">
                ₹{(item.price * item.quantity).toFixed(2)}
              </p>
              {editable && onUpdateQuantity && onRemoveItem && (
                <div className="mt-2 flex gap-2 justify-end">
                  <button
                    onClick={() => onUpdateQuantity(item.itemId, Math.max(item.moq, item.quantity - 1))}
                    className="text-xs text-gray-500 hover:text-gray-700"
                    disabled={item.quantity <= item.moq}
                  >
                    −
                  </button>
                  <span className="text-xs text-gray-700">{item.quantity}</span>
                  <button
                    onClick={() => onUpdateQuantity(item.itemId, item.quantity + 1)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    +
                  </button>
                  <button
                    onClick={() => onRemoveItem(item.itemId)}
                    className="ml-2 text-xs text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pricing Breakdown */}
      <div className="px-6 py-4 border-t border-gray-200 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span className="text-gray-900">₹{subtotal.toFixed(2)}</span>
        </div>

        {taxPercentage > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tax ({taxPercentage}%)</span>
            <span className="text-gray-900">₹{taxAmount.toFixed(2)}</span>
          </div>
        )}

        {deliveryCharge > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Delivery Charge</span>
            <span className="text-gray-900">₹{deliveryCharge.toFixed(2)}</span>
          </div>
        )}

        {discount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-green-600">Discount</span>
            <span className="text-green-600">-₹{discount.toFixed(2)}</span>
          </div>
        )}

        <div className="pt-2 border-t border-gray-200 flex justify-between">
          <span className="text-base font-semibold text-gray-900">Total</span>
          <span className="text-xl font-bold text-gray-900">
            ₹{grandTotal.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
