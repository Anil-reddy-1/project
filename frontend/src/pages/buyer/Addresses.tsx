/**
 * Addresses Page
 * Manage user delivery addresses with CRUD operations
 */

import { useState, useEffect } from "react";
import { Loader2, MapPin, Plus } from "lucide-react";
import { DashboardLayout } from "../../components/layout";
import { AddressCard, AddressForm } from "../../components/address";
import { addressService } from "../../services/address.service";
import { showToast } from "../../utils/toast";
import type { Address, AddressFormData } from "../../types/address.types";

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
      console.error("Error loading addresses:", error);
      showToast.error(error.message || "Failed to load addresses");
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
      showToast.success("Address added successfully");
    } catch (error: any) {
      console.error("Error creating address:", error);
      showToast.error(error.message || "Failed to add address");
      throw error; // Re-throw to prevent form from closing on error
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Handle update address
   */
  const handleUpdateAddress = async (
    addressId: string,
    data: AddressFormData,
  ) => {
    try {
      setUpdatingIds((prev) => new Set(prev).add(addressId));
      const response = await addressService.updateAddress(addressId, data);
      setAddresses((prev) =>
        prev.map((addr) => (addr.id === addressId ? response.data : addr)),
      );
      showToast.success("Address updated successfully");
    } catch (error: any) {
      console.error("Error updating address:", error);
      showToast.error(error.message || "Failed to update address");
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
      showToast.success("Address deleted successfully");
    } catch (error: any) {
      console.error("Error deleting address:", error);
      showToast.error(error.message || "Failed to delete address");
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
        })),
      );
      showToast.success("Default address updated");
    } catch (error: any) {
      console.error("Error setting default address:", error);
      showToast.error(error.message || "Failed to set default address");
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
        <div className="max-w-4xl mx-auto py-2">
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <Loader2 className="w-7 h-7 text-brass-600 animate-spin" aria-hidden="true" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">Loading addresses</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Store" subtitle="Addresses">
      <div className="max-w-4xl mx-auto py-2 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
          <div>
            <p className="shop-eyebrow">Your account</p>
            <h1 className="shop-title mt-2">Delivery addresses</h1>
            <p className="shop-subtitle mt-2">
              Manage your saved delivery locations
            </p>
          </div>
          {!showAddForm && addresses.length > 0 && (
            <button type="button" className="shop-btn-primary self-start sm:self-auto" onClick={handleShowAddForm}>
              <Plus className="w-4 h-4" aria-hidden="true" />
              Add address
            </button>
          )}
        </div>

        {/* Add Address Form */}
        {showAddForm && (
          <div className="shop-card">
            <div className="shop-card-header">
              <h2 className="shop-heading">Add a new address</h2>
            </div>
            <div className="p-5 sm:p-6">
              <AddressForm
                mode="create"
                onSubmit={handleAddAddress}
                onCancel={handleCancelAddForm}
                submitLabel="Add Address"
                isLoading={isCreating}
              />
            </div>
          </div>
        )}

        {/* Empty State */}
        {addresses.length === 0 && !showAddForm && (
          <div className="shop-card px-6 py-16 sm:py-20 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-ivory-100 border border-ivory-200 flex items-center justify-center">
              <MapPin className="w-7 h-7 text-brass-600" strokeWidth={1.5} aria-hidden="true" />
            </div>
            <h2 className="shop-heading text-2xl mt-6">No addresses saved</h2>
            <p className="shop-subtitle mt-2 max-w-sm">
              Add your business delivery address to speed up checkout
            </p>
            <button type="button" className="shop-btn-primary mt-8" onClick={handleShowAddForm}>
              <Plus className="w-4 h-4" aria-hidden="true" />
              Add your first address
            </button>
          </div>
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
          <div className="rounded-2xl border border-ivory-200 bg-ivory-50 p-5 sm:p-6">
            <p className="shop-eyebrow">
              Address tips
            </p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 text-sm text-ink-500">
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1 w-1 rounded-full bg-brass shrink-0" aria-hidden="true" />
                <span>
                  Add shop/location image for easy identification by delivery
                  partners
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1 w-1 rounded-full bg-brass shrink-0" aria-hidden="true" />
                <span>Capture location coordinates for accurate delivery</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1 w-1 rounded-full bg-brass shrink-0" aria-hidden="true" />
                <span>Set a default address for faster checkout</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1 w-1 rounded-full bg-brass shrink-0" aria-hidden="true" />
                <span>
                  You can edit or delete addresses anytime (except default
                  address)
                </span>
              </li>
            </ul>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
