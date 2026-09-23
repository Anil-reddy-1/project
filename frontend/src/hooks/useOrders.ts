/**
 * useOrders Hook
 * Custom hook for order management and history
 */

import { useState, useCallback, useEffect } from 'react';
import { orderService, type Order } from '../services/order.service';
import { showErrorToast } from '../utils/toast';

interface UseOrdersParams {
  autoLoad?: boolean;
  page?: number;
  limit?: number;
  status?: string;
}

interface UseOrdersReturn {
  // State
  orders: Order[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  limit: number;
  
  // Operations
  refreshOrders: () => Promise<void>;
  loadOrders: (params?: { page?: number; limit?: number; status?: string; dateFrom?: string; dateTo?: string }) => Promise<void>;
  getOrderById: (id: string) => Promise<Order | null>;
}

export function useOrders(params: UseOrdersParams = {}): UseOrdersReturn {
  const { autoLoad = true, page: initialPage = 1, limit: initialLimit = 10, status } = params;
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(initialPage);
  const [limit, setLimit] = useState<number>(initialLimit);

  /**
   * Load orders from server
   */
  const loadOrders = useCallback(async (loadParams?: {
    page?: number;
    limit?: number;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page: loadParams?.page || page,
        limit: loadParams?.limit || limit,
        status: loadParams?.status || status,
        dateFrom: loadParams?.dateFrom,
        dateTo: loadParams?.dateTo,
      };
      
      const response = await orderService.getMyOrders(params);
      
      setOrders(response.data.orders);
      setTotal(response.data.total);
      setPage(response.data.page);
      setLimit(response.data.limit);
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to load orders';
      setError(errorMessage);
      showErrorToast(errorMessage);
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, status]);

  /**
   * Refresh orders (reload with current parameters)
   */
  const refreshOrders = useCallback(async () => {
    await loadOrders();
  }, [loadOrders]);

  /**
   * Get single order by ID
   */
  const getOrderById = useCallback(async (id: string): Promise<Order | null> => {
    try {
      const response = await orderService.getOrderById(id);
      return response.data.order;
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to load order';
      showErrorToast(errorMessage);
      console.error('Error loading order:', err);
      return null;
    }
  }, []);

  // Auto-load on mount if enabled
  useEffect(() => {
    if (autoLoad) {
      loadOrders();
    }
  }, [autoLoad]); // Only run on mount

  return {
    orders,
    loading,
    error,
    total,
    page,
    limit,
    refreshOrders,
    loadOrders,
    getOrderById,
  };
}
