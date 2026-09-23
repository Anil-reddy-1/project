/**
 * useCheckout Hook
 * Custom hook for checkout process with order validation and placement
 */

import { useState, useCallback } from 'react';
import { orderService, type CreateOrderPayload } from '../services/order.service';
import { showSuccessToast, showErrorToast } from '../utils/toast';

interface UseCheckoutReturn {
  // State
  loading: boolean;
  validating: boolean;
  error: string | null;
  validationErrors: string[];
  
  // Operations
  validateOrder: (addressId: string) => Promise<boolean>;
  placeOrder: (payload: CreateOrderPayload) => Promise<string | null>; // Returns order ID on success
}

export function useCheckout(): UseCheckoutReturn {
  const [loading, setLoading] = useState<boolean>(false);
  const [validating, setValidating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  /**
   * Validate order before placement
   */
  const validateOrder = useCallback(async (addressId: string): Promise<boolean> => {
    try {
      setValidating(true);
      setError(null);
      setValidationErrors([]);
      
      const response = await orderService.validateOrder({ addressId });
      
      if (!response.data.valid) {
        setValidationErrors(response.data.errors);
        return false;
      }
      
      return true;
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to validate order';
      setError(errorMessage);
      console.error('Error validating order:', err);
      return false;
    } finally {
      setValidating(false);
    }
  }, []);

  /**
   * Place order
   */
  const placeOrder = useCallback(async (payload: CreateOrderPayload): Promise<string | null> => {
    try {
      setLoading(true);
      setError(null);
      setValidationErrors([]);
      
      const response = await orderService.createOrder(payload);
      
      if (response.success) {
        showSuccessToast(`Order placed successfully! Order #${response.data.order.orderNumber}`);
        return response.data.order.id;
      }
      
      return null;
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to place order';
      setError(errorMessage);
      showErrorToast(errorMessage);
      console.error('Error placing order:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    validating,
    error,
    validationErrors,
    validateOrder,
    placeOrder,
  };
}
