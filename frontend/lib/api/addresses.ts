/**
 * Addresses API Client
 * Phase 3: Address Management
 * 
 * API client functions for delivery address management:
 * - List user addresses
 * - Create address
 * - Update address
 * - Delete address
 * - Set default address
 */

import { apiClient } from './client';

// ─── Request/Response Types ───────────────────────────────────────────────────

export interface Address {
  id: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  landmark?: string;
  isDefault: boolean;
  createdAt: Date | string;
}

export interface CreateAddressRequest {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  landmark?: string;
}

export interface UpdateAddressRequest {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  landmark?: string;
}

export interface AddressListResponse {
  addresses: Address[];
}

export interface AddressResponse {
  address: Address;
}

export interface DeleteAddressResponse {
  message: string;
}

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * Get all addresses for current user
 * 
 * @param userId - User ID (current user)
 * @returns List of delivery addresses
 */
export async function getAddresses(userId: string): Promise<AddressListResponse> {
  return apiClient<AddressListResponse>(`/users/${userId}/addresses`);
}

/**
 * Create a new delivery address
 * 
 * @param userId - User ID (current user)
 * @param data - Address data
 * @returns Created address
 */
export async function createAddress(
  userId: string,
  data: CreateAddressRequest
): Promise<AddressResponse> {
  return apiClient<AddressResponse>(`/users/${userId}/addresses`, {
    method: 'POST',
    body: data,
  });
}

/**
 * Update an existing address
 * 
 * @param userId - User ID (current user)
 * @param addressId - Address ID to update
 * @param data - Updated address fields
 * @returns Updated address
 */
export async function updateAddress(
  userId: string,
  addressId: string,
  data: UpdateAddressRequest
): Promise<AddressResponse> {
  return apiClient<AddressResponse>(`/users/${userId}/addresses/${addressId}`, {
    method: 'PATCH',
    body: data,
  });
}

/**
 * Delete an address
 * 
 * @param userId - User ID (current user)
 * @param addressId - Address ID to delete
 * @returns Deletion confirmation
 */
export async function deleteAddress(
  userId: string,
  addressId: string
): Promise<DeleteAddressResponse> {
  return apiClient<DeleteAddressResponse>(`/users/${userId}/addresses/${addressId}`, {
    method: 'DELETE',
  });
}

/**
 * Set an address as default
 * 
 * @param userId - User ID (current user)
 * @param addressId - Address ID to set as default
 * @returns Updated address
 */
export async function setDefaultAddress(
  userId: string,
  addressId: string
): Promise<AddressResponse> {
  return apiClient<AddressResponse>(`/users/${userId}/addresses/${addressId}/set-default`, {
    method: 'PUT',
  });
}
