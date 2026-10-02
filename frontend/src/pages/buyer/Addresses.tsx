/**
 * Addresses Page
 * Manage user delivery addresses with CRUD operations
 */

import { useState, useEffect } from 'react';
import { MapPin, Plus } from 'lucide-react';
import { DashboardLayout } from '../../components/layout';
import { AddressCard, AddressForm } from '../../components/address';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { addressService } from '../../services/address.service';
import { showToast } from '../../utils/toast';
import type { Address, AddressFormData } from '../../types/address.types';

export function Addresses() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  /**
   * Load addresses on mount
   */
  useEffect(() => {
    loadAddresses();
  }, []);

  /**
   * Load addresses from API
   */
  const loadAddresses = async () => {
    try {
      setIsLoading(true);
      const response = await addressService.getAddresses();
      setAddresses(response.data.addresses);
    } catch (error: any) {
      console.error('Error loading addresses:', error);
      showToast.error(error.message || 'Failed to load addresses');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle add address
   */
  const handleAddAddress = async (data: AddressFormData) => {
    try {
      setIsCreating(true);
      const response = await addressService.createAddress(data);
      setAddresses((prev) => [response.data, ...prev]);
      setShowAddForm(false);
      showToast.success('Address added successfully');
    } catch (error: any) {
      console.error('Error creating address:', error);
      showToast.error(error.message || 'Failed to add address');
      throw error; // Re-throw to prevent form from closing on error
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Handle update address
   */
  const handleUpdateAddress = async (addressId: string, data: AddressFormData) => {
    try {
      setUpdatingIds((prev) => new Set(prev).add(addressId));
      const response = await addressService.updateAddress(addressId, data);
      setAddresses((prev) =>
        prev.map((addr) => (addr.id === addressId ? response.data : addr))
      );
      showToast.success('Address updated successfully');
    } catch (error: any) {
      console.error('Error updating address:', error);
      showToast.error(error.message || 'Failed to update address');
      throw error; // Re-throw to prevent card from exiting edit mode on error
    } finally {
      setUpdatingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(addressId);
        return newSet;
      });
    }
  };

  /**
   * Handle delete address
   */
  const handleDeleteAddress = async (addressId: string) => {
    try {
      setDeletingIds((prev) => new Set(prev).add(addressId));
      await addressService.deleteAddress(addressId);
      setAddresses((prev) => prev.filter((addr) => addr.id !== addressId));
      showToast.success('Address deleted successfully');
    } catch (error: any) {
      console.error('Error deleting address:', error);
      showToast.error(error.message || 'Failed to delete address');
    } finally {
      setDeletingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(addressId);
        return newSet;
      });
    }
  };

  /**
   * Handle set default address
   */
  const handleSetDefault = async (addressId: string) => {
    try {
      setUpdatingIds((prev) => new Set(prev).add(addressId));
      await addressService.setDefaultAddress(addressId);
      // Update addresses list - set new default and unset others
      setAddresses((prev) =>
        prev.map((addr) => ({
          ...addr,
          isDefault: addr.id === addressId,
        }))
      );
      showToast.success('Default address updated');
    } catch (error: any) {
      console.error('Error setting default address:', error);
      showToast.error(error.message || 'Failed to set default address');
    } finally {
      setUpdatingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(addressId);
        return newSet;
      });
    }
  };

  /**
   * Handle show add form
   */
  const handleShowAddForm = () => {
    setShowAddForm(true);
  };

  /**
   * Handle cancel add form
   */
  const handleCancelAddForm = () => {
    setShowAddForm(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <DashboardLayout title="Store" subtitle="Addresses">
        <div className="max-w-4xl mx-auto py-8">
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Store" subtitle="Addresses">
      <div className="max-w-4xl mx-auto py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Delivery Addresses</h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage your saved delivery locations
            </p>
          </div>
          {!showAddForm && addresses.length > 0 && (
            <Button onClick={handleShowAddForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Address
            </Button>
          )}
        </div>

        {/* Add Address Form */}
        {showAddForm && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Add New Address</h2>
            <AddressForm
              mode="create"
              onSubmit={handleAddAddress}
              onCancel={handleCancelAddForm}
              submitLabel="Add Address"
              isLoading={isCreating}
            />
          </Card>
        )}

        {/* Empty State */}
        {addresses.length === 0 && !showAddForm && (
          <EmptyState
            icon={MapPin}
            title="No addresses saved"
            description="Add your business delivery address to speed up checkout"
            action={<Button onClick={handleShowAddForm}>Add First Address</Button>}
          />
        )}

        {/* Address List */}
        {addresses.length > 0 && (
          <div className="space-y-4">
            {addresses.map((address) => (
              <AddressCard
                key={address.id}
                address={address}
                onUpdate={handleUpdateAddress}
                onDelete={handleDeleteAddress}
                onSetDefault={handleSetDefault}
                isUpdating={updatingIds.has(address.id)}
                isDeleting={deletingIds.has(address.id)}
                showActions={true}
              />
            ))}
          </div>
        )}

        {/* Info Card */}
        {addresses.length > 0 && (
          <Card className="p-5 bg-blue-50 border-blue-200">
            <p className="text-sm font-semibold text-blue-900 mb-3">
              Address Tips
            </p>
            <ul className="space-y-2 text-xs text-blue-700">
              <li className="flex items-start gap-2">
                <span className="mt-0.5">•</span>
                <span>Add shop/location image for easy identification by delivery partners</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">•</span>
                <span>Capture location coordinates for accurate delivery</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">•</span>
                <span>Set a default address for faster checkout</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">•</span>
                <span>You can edit or delete addresses anytime (except default address)</span>
              </li>
            </ul>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
