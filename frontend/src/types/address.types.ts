/**
 * Address Types & Interfaces
 * TypeScript definitions for user delivery address management
 */

// Address interface
export interface Address {
  id: string;
  userId: string;
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  isDefault: boolean;
  latitude?: number | null;
  longitude?: number | null;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Get addresses response
export interface GetAddressesResponse {
  success: boolean;
  message: string;
  data: {
    addresses: Address[];
    count: number;
  };
}

// Get address by ID response
export interface GetAddressByIdResponse {
  success: boolean;
  message: string;
  data: Address;
}

// Get default address response
export interface GetDefaultAddressResponse {
  success: boolean;
  message: string;
  data: Address;
}

// Create address request
export interface CreateAddressRequest {
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault?: boolean;
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
}

// Create address response
export interface CreateAddressResponse {
  success: boolean;
  message: string;
  data: Address;
}

// Update address request (all fields optional for partial update)
export interface UpdateAddressRequest {
  name?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  isDefault?: boolean;
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
}

// Update address response
export interface UpdateAddressResponse {
  success: boolean;
  message: string;
  data: Address;
}

// Set default address response
export interface SetDefaultAddressResponse {
  success: boolean;
  message: string;
  data: Address;
}

// Delete address response
export interface DeleteAddressResponse {
  success: boolean;
  message: string;
  data: {
    success: boolean;
    message: string;
    deletedAddressId: string;
  };
}

// Address count response
export interface AddressCountResponse {
  success: boolean;
  data: {
    count: number;
  };
}

// Validation error type
export interface AddressValidationError {
  field: string;
  message: string;
}

// Address form data (for forms)
export interface AddressFormData {
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault: boolean;
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
}

// Geolocation coordinates
export interface GeolocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

// Indian states list (for dropdown)
export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
] as const;

export type IndianState = typeof INDIAN_STATES[number];
