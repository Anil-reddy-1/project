/**
 * Address Selection Component
 * Displays saved addresses and allows selection/adding new address
 */

'use client';

interface Address {
  id?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  landmark?: string;
  isDefault?: boolean;
}

interface AddressSelectionProps {
  addresses: Address[];
  selectedAddress: Address | null;
  onSelect: (address: Address) => void;
  onAddNew: () => void;
}

export function AddressSelection({
  addresses,
  selectedAddress,
  onSelect,
  onAddNew,
}: AddressSelectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Delivery Address</h3>
      
      {addresses.length > 0 ? (
        <div className="space-y-3">
          {addresses.map((address, index) => (
            <div
              key={address.id || index}
              onClick={() => onSelect(address)}
              className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                selectedAddress === address
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{address.line1}</p>
                  {address.line2 && <p className="text-sm text-gray-600">{address.line2}</p>}
                  <p className="text-sm text-gray-600">
                    {address.city}, {address.state} - {address.pincode}
                  </p>
                  <p className="text-sm text-gray-600">Phone: {address.phone}</p>
                  {address.landmark && (
                    <p className="text-xs text-gray-500 mt-1">Landmark: {address.landmark}</p>
                  )}
                </div>
                {address.isDefault && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    Default
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No saved addresses</p>
      )}

      <button
        onClick={onAddNew}
        className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition"
      >
        + Add New Address
      </button>
    </div>
  );
}
