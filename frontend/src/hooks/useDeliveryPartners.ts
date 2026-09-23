/**
 * useDeliveryPartners Hook
 * Custom hook for managing delivery partners and assignments
 */

import { useState, useCallback, useEffect } from 'react';
import { userService, type User } from '../services/user.service';
import { deliveryService, type AssignDeliveryPayload } from '../services/delivery.service';
import { showSuccessToast, showErrorToast } from '../utils/toast';

interface UseDeliveryPartnersReturn {
  // State
  partners: User[];
  loading: boolean;
  assigning: boolean;
  error: string | null;
  
  // Operations
  fetchPartners: () => Promise<void>;
  assignDelivery: (deliveryId: string, partnerId: string, notes?: string) => Promise<boolean>;
}

export function useDeliveryPartners(): UseDeliveryPartnersReturn {
  const [partners, setPartners] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [assigning, setAssigning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch delivery partners (users with role='delivery')
   */
  const fetchPartners = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await userService.getUsers({
        role: 'delivery',
        status: 'active',
        limit: 100, // Get all active delivery partners
      });
      
      // Handle different response structures
      const users = Array.isArray(response.data) 
        ? response.data 
        : response.data.users || [];
      
      setPartners(users);
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to load delivery partners';
      setError(errorMessage);
      showErrorToast(errorMessage);
      console.error('Error fetching delivery partners:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Assign delivery to a partner
   */
  const assignDelivery = useCallback(async (
    deliveryId: string, 
    partnerId: string,
    notes?: string
  ): Promise<boolean> => {
    try {
      setAssigning(true);
      setError(null);
      
      const payload: AssignDeliveryPayload = {
        deliveryPartnerId: partnerId,
        notes,
      };
      
      await deliveryService.assignDelivery(deliveryId, payload);
      
      showSuccessToast('Delivery assigned successfully');
      return true;
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to assign delivery';
      setError(errorMessage);
      showErrorToast(errorMessage);
      console.error('Error assigning delivery:', err);
      return false;
    } finally {
      setAssigning(false);
    }
  }, []);

  // Auto-fetch partners on mount
  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  return {
    partners,
    loading,
    assigning,
    error,
    fetchPartners,
    assignDelivery,
  };
}
