/**
 * AddressSelector Component
 * Allows users to select or manage delivery addresses
 */

import { useState, useEffect } from 'react';
import { MapPin, Plus, Check, Edit2, Trash2 } from 'lucide-react';
import type { Address } from '../../types/address.types';
import { addressService } from '../../services/address.service';
import { showSuccessToast, showErrorToast } from '../../utils/toast';

interface AddressSelectorProps {
  selectedAddressId: string | null;
  onAddressSelect: (addressId: string) => void;
  onAddAddress?: () => void;
  onEditAddress?: (addressId: string) => void;
  compact?: boolean;
}

export function AddressSelector({
  selectedAddressId,
  onAddressSelect,
  onAddAddress,
  onEditAddress,
  compact = false,
}: AddressSelectorProps) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /**
   * Load addresses on mount
   */
  useEffect(() => {
    loadAddresses();
  }, []);

  /**
   * Load all user addresses
   */
  const loadAddresses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await addressService.getAddresses();
      setAddresses(response.data.addresses);

      // Auto-select default address if nothing selected
      if (!selectedAddressId && response.data.addresses.length > 0) {
        const defaultAddress = response.data.addresses.find(addr => addr.isDefault);
        if (defaultAddress) {
          onAddressSelect(defaultAddress.id);
        }
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to load addresses';
      setError(errorMessage);
      console.error('Error loading addresses:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle address deletion
   */
  const handleDelete = async (addressId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this address?')) {
      return;
    }

    setDeletingId(addressId);
    try {
      await addressService.deleteAddress(addressId);
      showSuccessToast('Address deleted');
      
      // Reload addresses
      await loadAddresses();
      
      // If deleted address was selected, clear selection
      if (selectedAddressId === addressId) {
        onAddressSelect('');
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to delete address';
      showErrorToast(errorMessage);
      console.error('Error deleting address:', err);
    } finally {
      setDeletingId(null);
    }
  };

  /**
   * Handle edit click
   */
  const handleEdit = (addressId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEditAddress) {
      onEditAddress(addressId);
    }
  };

  /**
   * Format address for display
   */
  const formatAddress = (address: Address): string => {
    const parts = [
      address.addressLine1,
      address.addressLine2,
      address.city,
      address.state,
      address.postalCode,
    ].filter(Boolean);
    return parts.join(', ');
  };

  /**
   * Loading state
   */
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="h-24 bg-slate-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  /**
   * Error state
   */
  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-50 border border-red-200">
        <p className="text-sm text-red-700 font-medium">{error}</p>
        <button
          onClick={loadAddresses}
          className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium underline"
        >
          Try again
        </button>
      </div>
    );
  }

  /**
   * Empty state
   */
  if (addresses.length === 0) {
    return (
      <div className="text-center py-8 px-4 border-2 border-dashed border-slate-300 rounded-lg">
        <MapPin className="w-12 h-12 mx-auto text-slate-400 mb-3" />
        <p className="text-sm text-slate-600 font-medium mb-1">No delivery addresses</p>
        <p className="text-xs text-slate-500 mb-4">Add an address to continue with checkout</p>
        {onAddAddress && (
          <button
            onClick={onAddAddress}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Address
          </button>
        )}
      </div>
    );
  }

  /**
   * Address list
   */
  return (
    <div className="space-y-3">
      {/* Header */}
      {!compact && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-slate-600" />
            <h3 className="text-base font-semibold text-slate-900">Delivery Address</h3>
          </div>
          {onAddAddress && (
            <button
              onClick={onAddAddress}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add New
            </button>
          )}
        </div>
      )}

      {/* Address Cards */}
      {addresses.map((address) => {
        const isSelected = address.id === selectedAddressId;
        const isDeleting = deletingId === address.id;

        return (
          <button
            key={address.id}
            onClick={() => onAddressSelect(address.id)}
            disabled={isDeleting}
            className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
              isSelected
                ? 'border-blue-600 bg-blue-50/50'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            } ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex gap-3">
              {/* Radio/Check indicator */}
              <div className="flex-shrink-0 pt-0.5">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>

              {/* Address Details */}
              <div className="flex-1 min-w-0">
                {/* Name and Default Badge */}
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-slate-900">{address.name}</p>
                  {address.isDefault && (
                    <span className="px-2 py-0.5 rounded-md bg-green-100 text-green-700 text-xs font-medium">
                      Default
                    </span>
                  )}
                </div>

                {/* Phone */}
                <p className="text-xs text-slate-600 mb-2">{address.phone}</p>

                {/* Address */}
                <p className="text-sm text-slate-700 leading-relaxed">
                  {formatAddress(address)}
                </p>
              </div>

              {/* Action Buttons */}
              {!compact && (
                <div className="flex-shrink-0 flex gap-1">
                  {onEditAddress && (
                    <button
                      onClick={(e) => handleEdit(address.id, e)}
                      disabled={isDeleting}
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40"
                      title="Edit address"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  
                  {!address.isDefault && (
                    <button
                      onClick={(e) => handleDelete(address.id, e)}
                      disabled={isDeleting}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                      title="Delete address"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </button>
        );
      })}

      {/* Add Address Button (Bottom) */}
      {compact && onAddAddress && (
        <button
          onClick={onAddAddress}
          className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">Add New Address</span>
        </button>
      )}
    </div>
  );
}
