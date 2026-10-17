/**
 * AddressCard Component
 * Display address with inline editing capability
 */

import { useState } from "react";
import {
  MapPin,
  Phone,
  Edit2,
  Trash2,
  Star,
  Image as ImageIcon,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { AddressForm } from "./AddressForm";
import { addressService } from "../../services/address.service";
import type { Address, AddressFormData } from "../../types/address.types";
import { formatCoordinatesWithLabels } from "../../utils/geolocation";

interface AddressCardProps {
  address: Address;
  onUpdate?: (addressId: string, data: AddressFormData) => Promise<void>;
  onDelete?: (addressId: string) => Promise<void>;
  onSetDefault?: (addressId: string) => Promise<void>;
  isUpdating?: boolean;
  isDeleting?: boolean;
  showActions?: boolean;
}

export function AddressCard({
  address,
  onUpdate,
  onDelete,
  onSetDefault,
  isUpdating = false,
  isDeleting = false,
  showActions = true,
}: AddressCardProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  /**
   * Handle edit mode toggle
   */
  const handleEditClick = () => {
    setIsEditMode(true);
  };

  /**
   * Handle edit cancel
   */
  const handleEditCancel = () => {
    setIsEditMode(false);
  };

  /**
   * Handle update submit
   */
  const handleUpdateSubmit = async (data: AddressFormData) => {
    if (onUpdate) {
      await onUpdate(address.id, data);
      setIsEditMode(false);
    }
  };

  /**
   * Handle delete click
   */
  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  /**
   * Handle delete confirm
   */
  const handleDeleteConfirm = async () => {
    if (onDelete) {
      await onDelete(address.id);
    }
  };

  /**
   * Handle delete cancel
   */
  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  /**
   * Handle set as default
   */
  const handleSetDefault = async () => {
    if (onSetDefault) {
      await onSetDefault(address.id);
    }
  };

  // If in edit mode, show the form
  if (isEditMode) {
    return (
      <div className="shop-card">
        <div className="shop-card-header">
          <h3 className="shop-heading">Edit address</h3>
        </div>
        <div className="p-5 sm:p-6">
          <AddressForm
            mode="edit"
            initialData={{
              name: address.name,
              phone: address.phone,
              addressLine1: address.addressLine1,
              addressLine2: address.addressLine2 || "",
              city: address.city,
              state: address.state,
              postalCode: address.postalCode,
              isDefault: address.isDefault,
              latitude: address.latitude || undefined,
              longitude: address.longitude || undefined,
              imageUrl: address.imageUrl || undefined,
            }}
            onSubmit={handleUpdateSubmit}
            onCancel={handleEditCancel}
            submitLabel="Update Address"
            isLoading={isUpdating}
          />
        </div>
      </div>
    );
  }

  // Show delete confirmation
  if (showDeleteConfirm) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50/60 p-5 sm:p-6">
        <div className="space-y-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-white border border-red-200 flex items-center justify-center shrink-0">
              <Trash2 className="w-4 h-4 text-red-600" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-xl font-medium tracking-tight text-red-900">
                Delete this address?
              </h3>
              <p className="text-sm text-red-700 mt-1">
                Are you sure you want to delete this address? This action cannot
                be undone.
              </p>
              <div className="mt-3 p-4 bg-white rounded-xl border border-red-100">
                <p className="font-medium text-sm text-ink">
                  {address.name}
                </p>
                <p className="text-sm text-stone-500 mt-1 break-words">
                  {addressService.formatAddressOneLine(address)}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleDeleteCancel}
              disabled={isDeleting}
              className="shop-btn-outline flex-1"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="inline-flex flex-1 items-center justify-center gap-2 h-11 px-6 rounded-full bg-red-600 text-white text-sm font-semibold transition-colors hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? "Deleting..." : "Yes, delete"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Display mode
  return (
    <div
      className={`shop-card p-5 sm:p-6 ${address.isDefault ? "border-brass-300 ring-1 ring-brass-300" : ""}`}
    >
      <div className="space-y-5">
        {/* Header with badges */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display text-xl font-medium tracking-tight text-ink break-words">
                {address.name}
              </h3>
              {address.isDefault && (
                <span className="inline-flex items-center gap-1 rounded-full border border-brass-100 bg-brass-50 px-2.5 py-0.5 text-[11px] font-semibold text-brass-700">
                  <Star className="w-3 h-3 fill-current" aria-hidden="true" />
                  Default
                </span>
              )}
            </div>
            <p className="text-sm text-stone-500 flex items-center gap-1.5 mt-1.5">
              <Phone className="w-3.5 h-3.5" aria-hidden="true" />
              {address.phone}
            </p>
          </div>

          {/* Action buttons */}
          {showActions && (
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={handleEditClick}
                disabled={isUpdating || isDeleting}
                aria-label="Edit address"
                title="Edit address"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-ivory-300 bg-white text-ink-500 transition-colors hover:border-ink hover:text-ink disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Edit2 className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={handleDeleteClick}
                disabled={isUpdating || isDeleting || address.isDefault}
                aria-label="Delete address"
                title={address.isDefault ? "Default address cannot be deleted" : "Delete address"}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-ivory-300 bg-white text-red-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-ivory-300"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        {/* Address details */}
        <div className="space-y-1 text-sm text-ink-700 leading-relaxed break-words">
          <p>{address.addressLine1}</p>
          {address.addressLine2 && (
            <p>{address.addressLine2}</p>
          )}
          <p>
            {address.city}, {address.state} {address.postalCode}
          </p>
        </div>

        {/* Shop image */}
        {addressService.hasImage(address) && address.imageUrl && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">
              <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" />
              Shop image
            </div>
            <div className="rounded-xl overflow-hidden border border-ivory-200">
              <img
                src={address.imageUrl}
                alt="Shop location"
                className="w-full h-48 object-cover"
              />
            </div>
          </div>
        )}

        {/* Geolocation */}
        {addressService.hasGeolocation(address) &&
          address.latitude &&
          address.longitude && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">
                <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                Location
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3.5 bg-ivory-50 rounded-xl border border-ivory-200">
                <span className="text-sm text-ink-700 break-words">
                  {formatCoordinatesWithLabels(
                    address.latitude,
                    address.longitude,
                  )}
                </span>
                <a
                  href={addressService.getMapUrl(
                    address.latitude,
                    address.longitude,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-ink underline decoration-brass-300 underline-offset-4 hover:decoration-brass shrink-0"
                >
                  View on map
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
              </div>
            </div>
          )}

        {/* Set as default button */}
        {!address.isDefault && showActions && onSetDefault && (
          <button
            type="button"
            onClick={handleSetDefault}
            disabled={isUpdating || isDeleting}
            className="shop-btn-outline w-full"
          >
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            Set as default
          </button>
        )}
      </div>
    </div>
  );
}

export default AddressCard;
