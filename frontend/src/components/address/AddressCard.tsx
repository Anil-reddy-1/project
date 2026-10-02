/**
 * AddressCard Component
 * Display address with inline editing capability
 */

import { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  MapPin, 
  Phone, 
  Edit2, 
  Trash2, 
  Star, 
  Image as ImageIcon,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { AddressForm } from './AddressForm';
import { addressService } from '../../services/address.service';
import type { Address, AddressFormData } from '../../types/address.types';
import { formatCoordinatesWithLabels } from '../../utils/geolocation';

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
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Edit Address</h3>
        <AddressForm
          mode="edit"
          initialData={{
            name: address.name,
            phone: address.phone,
            addressLine1: address.addressLine1,
            addressLine2: address.addressLine2 || '',
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
      </Card>
    );
  }

  // Show delete confirmation
  if (showDeleteConfirm) {
    return (
      <Card className="p-6 border-red-200 bg-red-50">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Trash2 className="w-5 h-5 text-red-600 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900">Delete Address?</h3>
              <p className="text-sm text-red-700 mt-1">
                Are you sure you want to delete this address? This action cannot be undone.
              </p>
              <div className="mt-2 p-3 bg-white rounded-lg border border-red-200">
                <p className="font-medium text-sm text-gray-900">{address.name}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {addressService.formatAddressOneLine(address)}
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="flex-1"
            >
              {isDeleting ? 'Deleting...' : 'Yes, Delete'}
            </Button>
            <Button
              variant="outline"
              onClick={handleDeleteCancel}
              disabled={isDeleting}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Display mode
  return (
    <Card className={`p-6 ${address.isDefault ? 'border-blue-500 border-2' : ''}`}>
      <div className="space-y-4">
        {/* Header with badges */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-semibold text-gray-900">{address.name}</h3>
              {address.isDefault && (
                <Badge className="bg-blue-500">
                  <Star className="w-3 h-3 mr-1 fill-current" />
                  Default
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
              <Phone className="w-3.5 h-3.5" />
              {address.phone}
            </p>
          </div>

          {/* Action buttons */}
          {showActions && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditClick}
                disabled={isUpdating || isDeleting}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteClick}
                disabled={isUpdating || isDeleting || address.isDefault}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Address details */}
        <div className="space-y-2">
          <p className="text-sm text-gray-700">{address.addressLine1}</p>
          {address.addressLine2 && (
            <p className="text-sm text-gray-700">{address.addressLine2}</p>
          )}
          <p className="text-sm text-gray-700">
            {address.city}, {address.state} {address.postalCode}
          </p>
        </div>

        {/* Shop image */}
        {addressService.hasImage(address) && address.imageUrl && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <ImageIcon className="w-4 h-4" />
              Shop Image
            </div>
            <div className="rounded-lg overflow-hidden border border-gray-200">
              <img
                src={address.imageUrl}
                alt="Shop location"
                className="w-full h-48 object-cover"
              />
            </div>
          </div>
        )}

        {/* Geolocation */}
        {addressService.hasGeolocation(address) && address.latitude && address.longitude && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <MapPin className="w-4 h-4" />
              Location
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
              <span className="text-sm text-gray-700">
                {formatCoordinatesWithLabels(address.latitude, address.longitude)}
              </span>
              <a
                href={addressService.getMapUrl(address.latitude, address.longitude)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm font-medium"
              >
                View on Map
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* Set as default button */}
        {!address.isDefault && showActions && onSetDefault && (
          <Button
            variant="outline"
            onClick={handleSetDefault}
            disabled={isUpdating || isDeleting}
            className="w-full"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Set as Default
          </Button>
        )}
      </div>
    </Card>
  );
}

export default AddressCard;
