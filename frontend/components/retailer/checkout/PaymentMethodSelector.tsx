/**
 * Payment Method Selector Component
 */

'use client';

type PaymentMethod = 'prepaid' | 'cod';

interface PaymentMethodSelectorProps {
  selected: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

export function PaymentMethodSelector({ selected, onChange }: PaymentMethodSelectorProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Payment Method</h3>

      <div className="space-y-3">
        {/* Prepaid Option */}
        <div
          onClick={() => onChange('prepaid')}
          className={`p-4 border-2 rounded-lg cursor-pointer transition ${
            selected === 'prepaid'
              ? 'border-blue-600 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-start gap-3">
            <input
              type="radio"
              checked={selected === 'prepaid'}
              onChange={() => onChange('prepaid')}
              className="mt-1"
            />
            <div className="flex-1">
              <p className="font-medium text-gray-900">Prepaid (Online Payment)</p>
              <p className="text-sm text-gray-600 mt-1">
                Pay securely via UPI, Card, Net Banking, or Wallet
              </p>
              <div className="flex gap-2 mt-2">
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">UPI</span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">Cards</span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">Net Banking</span>
              </div>
            </div>
          </div>
        </div>

        {/* COD Option */}
        <div
          onClick={() => onChange('cod')}
          className={`p-4 border-2 rounded-lg cursor-pointer transition ${
            selected === 'cod'
              ? 'border-blue-600 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-start gap-3">
            <input
              type="radio"
              checked={selected === 'cod'}
              onChange={() => onChange('cod')}
              className="mt-1"
            />
            <div className="flex-1">
              <p className="font-medium text-gray-900">Cash on Delivery (COD)</p>
              <p className="text-sm text-gray-600 mt-1">
                Pay in cash when your order is delivered
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
