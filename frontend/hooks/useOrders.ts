/**
 * useOrders Hook
 * Task #20: State management hooks
 *
 * Fetch and manage order list with filters
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { getOrders } from '@/lib/api';
import type { Order } from '@/lib/api';
import type { OrderState } from '@/types';

interface UseOrdersOptions {
  status?: OrderState;
  autoFetch?: boolean;
}

export function useOrders(options: UseOrdersOptions = {}) {
  const { status, autoFetch = true } = options;

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // getOrders accepts { state } filter matching OrderFilters in orders.ts
      const response = await getOrders(status ? { state: status } : undefined);
      // API returns { success, data: [...], pagination }
      setOrders((response as any).data ?? []);
      setLastFetch(new Date());
    } catch (err: any) {
      console.error('Failed to fetch orders:', err);
      setError(
        err.response?.data?.error?.message ||
          err.message ||
          'Failed to load orders'
      );
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => {
    if (autoFetch) {
      fetchOrders();
    }
  }, [autoFetch, fetchOrders]);

  const refresh = useCallback(() => {
    return fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
    isLoading,
    error,
    lastFetch,
    refresh,
    fetchOrders,
  };
}
