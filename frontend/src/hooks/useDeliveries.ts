/**
 * useDeliveries Hook
 * Custom hook for delivery partner operations
 */

import { useState, useCallback, useEffect } from 'react';
import { deliveryService, type Delivery } from '../services/delivery.service';
import { showSuccessToast, showErrorToast } from '../utils/toast';

interface UseDeliveriesParams {
  autoLoad?: boolean;
  status?: string;
}

interface UseDeliveriesReturn {
  // State
  deliveries: Delivery[];
  loading: boolean;
  error: string | null;
  total: number;
  
  // Operations
  refreshDeliveries: () => Promise<void>;
  loadDeliveries: (params?: { status?: string }) => Promise<void>;
  getDeliveryById: (id: string) => Promise<Delivery | null>;
  acceptDelivery: (id: string, notes?: string) => Promise<boolean>;
  startDelivery: (id: string, notes?: string) => Promise<boolean>;
  completeDelivery: (id: string, notes?: string) => Promise<boolean>;
}

export function useDeliveries(params: UseDeliveriesParams = {}): UseDeliveriesReturn {
  const { autoLoad = true, status } = params;
  
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);

  /**
   * Load deliveries from server
   */
  const loadDeliveries = useCallback(async (loadParams?: { status?: string }) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        status: loadParams?.status || status,
        limit: 50,
      };
      
      const response = await deliveryService.getMyDeliveries(params);
      
      setDeliveries(response.data.deliveries);
      setTotal(response.data.total);
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to load deliveries';
      setError(errorMessage);
      showErrorToast(errorMessage);
      console.error('Error loading deliveries:', err);
    } finally {
      setLoading(false);
    }
  }, [status]);

  /**
   * Refresh deliveries (reload with current parameters)
   */
  const refreshDeliveries = useCallback(async () => {
    await loadDeliveries();
  }, [loadDeliveries]);

  /**
   * Get single delivery by ID
   */
  const getDeliveryById = useCallback(async (id: string): Promise<Delivery | null> => {
    try {
      const response = await deliveryService.getDeliveryById(id);
      return response.data.delivery;
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to load delivery';
      showErrorToast(errorMessage);
      console.error('Error loading delivery:', err);
      return null;
    }
  }, []);

  /**
   * Accept delivery assignment
   */
  const acceptDelivery = useCallback(async (id: string, notes?: string): Promise<boolean> => {
    try {
      await deliveryService.acceptDelivery(id, notes ? { notes } : undefined);
      showSuccessToast('Delivery accepted successfully');
      await refreshDeliveries();
      return true;
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to accept delivery';
      showErrorToast(errorMessage);
      console.error('Error accepting delivery:', err);
      return false;
    }
  }, [refreshDeliveries]);

  /**
   * Start delivery (mark as in transit)
   */
  const startDelivery = useCallback(async (id: string, notes?: string): Promise<boolean> => {
    try {
      await deliveryService.startDelivery(id, notes ? { notes } : undefined);
      showSuccessToast('Delivery started successfully');
      await refreshDeliveries();
      return true;
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to start delivery';
      showErrorToast(errorMessage);
      console.error('Error starting delivery:', err);
      return false;
    }
  }, [refreshDeliveries]);

  /**
   * Complete delivery (mark as delivered)
   */
  const completeDelivery = useCallback(async (id: string, notes?: string): Promise<boolean> => {
    try {
      await deliveryService.completeDelivery(id, notes ? { notes } : undefined);
      showSuccessToast('Delivery completed successfully');
      await refreshDeliveries();
      return true;
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to complete delivery';
      showErrorToast(errorMessage);
      console.error('Error completing delivery:', err);
      return false;
    }
  }, [refreshDeliveries]);

  // Auto-load on mount if enabled
  useEffect(() => {
    if (autoLoad) {
      loadDeliveries();
    }
  }, [autoLoad]); // Only run on mount

  return {
    deliveries,
    loading,
    error,
    total,
    refreshDeliveries,
    loadDeliveries,
    getDeliveryById,
    acceptDelivery,
    startDelivery,
    completeDelivery,
  };
}
