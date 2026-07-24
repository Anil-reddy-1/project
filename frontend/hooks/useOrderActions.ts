/**
 * useOrderActions Hook
 * Phase 4 — Wholesaler Approval & Inventory Lock
 *
 * Provides wholesaler order action methods with loading/error state management.
 * Actions: approve, reject, markPacked, markReadyForPickup
 */

'use client';

import { useState, useCallback } from 'react';
import {
  approveOrder,
  rejectOrder,
  markOrderPacked,
  markOrderReadyForPickup,
} from '@/lib/api';
import type { OrderRejectionReason, Order } from '@/lib/api';

interface ActionState {
  isLoading: boolean;
  error: string | null;
  lastAction: string | null;
}

export function useOrderActions(onSuccess?: (action: string, order: Order) => void) {
  const [state, setState] = useState<ActionState>({
    isLoading: false,
    error: null,
    lastAction: null,
  });

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const handleApprove = useCallback(
    async (orderId: string) => {
      try {
        setState({ isLoading: true, error: null, lastAction: 'approve' });
        const response = await approveOrder(orderId);
        setState({ isLoading: false, error: null, lastAction: 'approve' });
        onSuccess?.('approve', response.data);
        return response.data;
      } catch (err: any) {
        const message = err?.message || 'Failed to approve order';
        setState({ isLoading: false, error: message, lastAction: 'approve' });
        throw err;
      }
    },
    [onSuccess]
  );

  const handleReject = useCallback(
    async (orderId: string, reason: OrderRejectionReason, notes?: string) => {
      try {
        setState({ isLoading: true, error: null, lastAction: 'reject' });
        const response = await rejectOrder(orderId, reason, notes);
        setState({ isLoading: false, error: null, lastAction: 'reject' });
        onSuccess?.('reject', response.data);
        return response.data;
      } catch (err: any) {
        const message = err?.message || 'Failed to reject order';
        setState({ isLoading: false, error: message, lastAction: 'reject' });
        throw err;
      }
    },
    [onSuccess]
  );

  const handleMarkPacked = useCallback(
    async (orderId: string) => {
      try {
        setState({ isLoading: true, error: null, lastAction: 'pack' });
        const response = await markOrderPacked(orderId);
        setState({ isLoading: false, error: null, lastAction: 'pack' });
        onSuccess?.('pack', response.data);
        return response.data;
      } catch (err: any) {
        const message = err?.message || 'Failed to mark order as packed';
        setState({ isLoading: false, error: message, lastAction: 'pack' });
        throw err;
      }
    },
    [onSuccess]
  );

  const handleMarkReady = useCallback(
    async (orderId: string) => {
      try {
        setState({ isLoading: true, error: null, lastAction: 'ready' });
        const response = await markOrderReadyForPickup(orderId);
        setState({ isLoading: false, error: null, lastAction: 'ready' });
        onSuccess?.('ready', response.data);
        return { order: response.data, pickupOTP: response.data.pickupOTP };
      } catch (err: any) {
        const message = err?.message || 'Failed to mark order ready';
        setState({ isLoading: false, error: message, lastAction: 'ready' });
        throw err;
      }
    },
    [onSuccess]
  );

  return {
    ...state,
    clearError,
    approveOrder: handleApprove,
    rejectOrder: handleReject,
    markPacked: handleMarkPacked,
    markReadyForPickup: handleMarkReady,
  };
}
