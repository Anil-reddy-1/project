/**
 * useAddresses Hook
 * Task #20: State management hooks
 *
 * Manage delivery addresses
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getAddresses,
  createAddress as apiCreateAddress,
  updateAddress as apiUpdateAddress,
  deleteAddress as apiDeleteAddress,
  setDefaultAddress as apiSetDefaultAddress,
} from '@/lib/api';
import type { DeliveryAddress } from '@/lib/types';

export function useAddresses(userId: string | null, autoFetch: boolean = true) {
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAddresses = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await getAddresses(userId);
      // API returns { addresses: [...] }
      setAddresses((response as any).addresses ?? (response as any).data ?? []);
    } catch (err: any) {
      console.error('Failed to fetch addresses:', err);
      setError(
        err.response?.data?.error?.message ||
          err.message ||
          'Failed to load addresses'
      );
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (autoFetch) {
      fetchAddresses();
    }
  }, [autoFetch, fetchAddresses]);

  const createAddress = useCallback(
    async (data: Omit<DeliveryAddress, 'id' | 'isDefault'>) => {
      if (!userId) return;

      try {
        setError(null);
        const response = await apiCreateAddress(userId, data as any);
        const created: DeliveryAddress = (response as any).address ?? (response as any).data;
        setAddresses((prev) => [...prev, created]);
        return created;
      } catch (err: any) {
        console.error('Failed to create address:', err);
        setError(
          err.response?.data?.error?.message ||
            err.message ||
            'Failed to create address'
        );
        throw err;
      }
    },
    [userId]
  );

  const updateAddress = useCallback(
    async (addressId: string, data: Partial<DeliveryAddress>) => {
      if (!userId) return;

      try {
        setError(null);
        const response = await apiUpdateAddress(userId, addressId, data as any);
        const updated: DeliveryAddress = (response as any).address ?? (response as any).data;
        setAddresses((prev) =>
          prev.map((addr) => (addr.id === addressId ? updated : addr))
        );
        return updated;
      } catch (err: any) {
        console.error('Failed to update address:', err);
        setError(
          err.response?.data?.error?.message ||
            err.message ||
            'Failed to update address'
        );
        throw err;
      }
    },
    [userId]
  );

  const deleteAddress = useCallback(
    async (addressId: string) => {
      if (!userId) return;

      try {
        setError(null);
        await apiDeleteAddress(userId, addressId);
        setAddresses((prev) => prev.filter((addr) => addr.id !== addressId));
      } catch (err: any) {
        console.error('Failed to delete address:', err);
        setError(
          err.response?.data?.error?.message ||
            err.message ||
            'Failed to delete address'
        );
        throw err;
      }
    },
    [userId]
  );

  const setDefaultAddress = useCallback(
    async (addressId: string) => {
      if (!userId) return;

      try {
        setError(null);
        await apiSetDefaultAddress(userId, addressId);
        setAddresses((prev) =>
          prev.map((addr) => ({
            ...addr,
            isDefault: addr.id === addressId,
          }))
        );
      } catch (err: any) {
        console.error('Failed to set default address:', err);
        setError(
          err.response?.data?.error?.message ||
            err.message ||
            'Failed to set default address'
        );
        throw err;
      }
    },
    [userId]
  );

  return {
    addresses,
    isLoading,
    error,
    fetchAddresses,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
  };
}
