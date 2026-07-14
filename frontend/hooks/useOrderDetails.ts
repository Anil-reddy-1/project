/**
 * useOrderDetails Hook
 * Task #20: State management hooks
 *
 * Fetch and manage single order details
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { getOrderById } from '@/lib/api';
import type { Order } from '@/lib/types';

export function useOrderDetails(orderId: string | null) {
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await getOrderById(orderId);
      // API returns { success, data: Order }
      setOrder((response as any).data ?? null);
    } catch (err: any) {
      console.error('Failed to fetch order:', err);
      setError(
        err.response?.data?.error?.message ||
          err.message ||
          'Failed to load order details'
      );
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const refresh = useCallback(() => {
    return fetchOrder();
  }, [fetchOrder]);

  return {
    order,
    isLoading,
    error,
    refresh,
  };
}
