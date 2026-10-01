/**
 * Address Service
 * API calls for user delivery address management
 */

import { api } from './api.service';
import type {
  Address,
  GetAddressesResponse,
  GetAddressByIdResponse,
  GetDefaultAddressResponse,
  CreateAddressRequest,
  CreateAddressResponse,
  UpdateAddressRequest,
  UpdateAddressResponse,
  SetDefaultAddressResponse,
  DeleteAddressResponse,
  AddressCountResponse,
  AddressValidationError,
} from '../types/address.types';

class AddressService {
  private readonly baseUrl = '/addresses';

  /**
   * Get all user addresses
   */
  async getAddresses(): Promise<GetAddressesResponse> {
    return api.get<GetAddressesResponse>(this.baseUrl);
  }

  /**
   * Get specific address by ID
   */
  async getAddressById(addressId: string): Promise<GetAddressByIdResponse> {
    return api.get<GetAddressByIdResponse>(`${this.baseUrl}/${addressId}`);
  }

  /**
   * Get default address
   */
  async getDefaultAddress(): Promise<GetDefaultAddressResponse> {
    return api.get<GetDefaultAddressResponse>(`${this.baseUrl}/default`);
  }

  /**
   * Create new address
   */
  async createAddress(addressData: CreateAddressRequest): Promise<CreateAddressResponse> {
    return api.post<CreateAddressResponse>(this.baseUrl, addressData);
  }

  /**
   * Update address (supports partial updates)
   */
  async updateAddress(addressId: string, addressData: UpdateAddressRequest): Promise<UpdateAddressResponse> {
    return api.put<UpdateAddressResponse>(`${this.baseUrl}/${addressId}`, addressData);
  }

  /**
   * Set address as default
   */
  async setDefaultAddress(addressId: string): Promise<SetDefaultAddressResponse> {
    return api.patch<SetDefaultAddressResponse>(`${this.baseUrl}/${addressId}/default`);
  }

  /**
   * Delete address
   */
  async deleteAddress(addressId: string): Promise<DeleteAddressResponse> {
    return api.delete<DeleteAddressResponse>(`${this.baseUrl}/${addressId}`);
  }

  /**
   * Get address count
   */
  async getAddressCount(): Promise<AddressCountResponse> {
    return api.get<AddressCountResponse>(`${this.baseUrl}/count`);
  }

  /**
   * Get addresses as array (returns empty array on error)
   */
  async getAddressList(): Promise<Address[]> {
    try {
      const response = await this.getAddresses();
      return response.data.addresses;
    } catch (error) {
      console.error('Error getting addresses:', error);
      return [];
    }
  }

  /**
   * Get default address or null
   */
  async getDefault(): Promise<Address | null> {
    try {
      const response = await this.getDefaultAddress();
      return response.data;
    } catch (error) {
      console.error('Error getting default address:', error);
      return null;
    }
  }

  /**
   * Get address count as number (returns 0 on error)
   */
  async getCount(): Promise<number> {
    try {
      const response = await this.getAddressCount();
      return response.data.count;
    } catch (error) {
      console.error('Error getting address count:', error);
      return 0;
    }
  }

  /**
   * Check if user has any addresses
   */
  async hasAddresses(): Promise<boolean> {
    try {
      const count = await this.getCount();
      return count > 0;
    } catch (error) {
      console.error('Error checking if user has addresses:', error);
      return false;
    }
  }

  /**
   * Validate address data (client-side validation)
   */
  validateAddress(addressData: Partial<CreateAddressRequest>): AddressValidationError[] {
    const errors: AddressValidationError[] = [];

    if (!addressData.name || addressData.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Name is required' });
    }

    if (!addressData.phone || addressData.phone.trim().length === 0) {
      errors.push({ field: 'phone', message: 'Phone number is required' });
    } else {
      // Remove spaces, dashes, parentheses for validation
      const cleanPhone = addressData.phone.replace(/[\s\-()]/g, '');
      if (!/^[0-9]{10}$/.test(cleanPhone)) {
        errors.push({ field: 'phone', message: 'Phone number must be 10 digits' });
      }
    }

    if (!addressData.addressLine1 || addressData.addressLine1.trim().length === 0) {
      errors.push({ field: 'addressLine1', message: 'Address line 1 is required' });
    }

    if (!addressData.city || addressData.city.trim().length === 0) {
      errors.push({ field: 'city', message: 'City is required' });
    }

    if (!addressData.state || addressData.state.trim().length === 0) {
      errors.push({ field: 'state', message: 'State is required' });
    }

    if (!addressData.postalCode || addressData.postalCode.trim().length === 0) {
      errors.push({ field: 'postalCode', message: 'Postal code is required' });
    } else if (!/^[0-9]{6}$/.test(addressData.postalCode.trim())) {
      errors.push({ field: 'postalCode', message: 'Postal code must be 6 digits' });
    }

    // Validate geolocation if provided (both must be provided together)
    if (addressData.latitude !== undefined || addressData.longitude !== undefined) {
      if (addressData.latitude === undefined || addressData.latitude === null ||
          addressData.longitude === undefined || addressData.longitude === null) {
        errors.push({ field: 'geolocation', message: 'Both latitude and longitude must be provided together' });
      } else {
        if (addressData.latitude < -90 || addressData.latitude > 90) {
          errors.push({ field: 'latitude', message: 'Latitude must be between -90 and 90' });
        }
        if (addressData.longitude < -180 || addressData.longitude > 180) {
          errors.push({ field: 'longitude', message: 'Longitude must be between -180 and 180' });
        }
      }
    }

    // Validate image URL if provided
    if (addressData.imageUrl && addressData.imageUrl.trim().length > 0) {
      const urlPattern = /^https?:\/\/.+/i;
      if (!urlPattern.test(addressData.imageUrl.trim())) {
        errors.push({ field: 'imageUrl', message: 'Image URL must be a valid HTTP/HTTPS URL' });
      }
    }

    return errors;
  }

  /**
   * Format address for display (single line)
   */
  formatAddressOneLine(address: Address): string {
    const parts = [
      address.addressLine1,
      address.addressLine2,
      address.city,
      address.state,
      address.postalCode,
    ].filter(Boolean);
    
    return parts.join(', ');
  }

  /**
   * Format address for display (multi-line)
   */
  formatAddressMultiLine(address: Address): string[] {
    return [
      address.name,
      address.phone,
      address.addressLine1,
      address.addressLine2,
      `${address.city}, ${address.state} ${address.postalCode}`,
    ].filter(Boolean) as string[];
  }

  /**
   * Get address display name (name + phone)
   */
  getAddressDisplayName(address: Address): string {
    return `${address.name} - ${address.phone}`;
  }

  /**
   * Generate Google Maps URL from coordinates
   */
  getMapUrl(latitude: number, longitude: number): string {
    return `https://www.google.com/maps?q=${latitude},${longitude}`;
  }

  /**
   * Check if address has geolocation
   */
  hasGeolocation(address: Address): boolean {
    return address.latitude !== null && 
           address.latitude !== undefined && 
           address.longitude !== null && 
           address.longitude !== undefined;
  }

  /**
   * Check if address has shop image
   */
  hasImage(address: Address): boolean {
    return !!address.imageUrl && address.imageUrl.trim().length > 0;
  }
}

export const addressService = new AddressService();
export default addressService;
