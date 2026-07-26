'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWebSocket } from '../contexts/websocket-context';

interface OrderStatusUpdate {
  orderId: string;
  status: string;
  timestamp: string;
  [key: string]: any;
}

interface AssignmentUpdate {
  assignmentId: string;
  partnerId: string;
  orderId: string;
  response?: 'accepted' | 'declined';
  timestamp: string;
}

interface UseRealtimeOrderOptions {
  orderId: string;
  onStatusUpdate?: (update: OrderStatusUpdate) => void;
  onAssignmentUpdate?: (update: AssignmentUpdate) => void;
}

export function useRealtimeOrder(options: UseRealtimeOrderOptions) {
  const { orderId, onStatusUpdate, onAssignmentUpdate } = options;
  const { on, off, trackOrder, untrackOrder, isConnected } = useWebSocket();
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<OrderStatusUpdate | null>(null);
  const [assignmentInfo, setAssignmentInfo] = useState<AssignmentUpdate | null>(null);

  // Handle order status updates
  const handleStatusUpdate = useCallback((data: OrderStatusUpdate) => {
    if (data.orderId !== orderId) return;

    setOrderStatus(data.status);
    setLastUpdate(data);

    if (onStatusUpdate) {
      onStatusUpdate(data);
    }
  }, [orderId, onStatusUpdate]);

  // Handle assignment updates
  const handleAssignmentUpdate = useCallback((data: AssignmentUpdate) => {
    if (data.orderId !== orderId) return;

    setAssignmentInfo(data);

    if (onAssignmentUpdate) {
      onAssignmentUpdate(data);
    }
  }, [orderId, onAssignmentUpdate]);

  // Handle assignment accepted
  const handleAssignmentAccepted = useCallback((data: AssignmentUpdate) => {
    if (data.orderId !== orderId) return;

    setAssignmentInfo({ ...data, response: 'accepted' });

    if (onAssignmentUpdate) {
      onAssignmentUpdate({ ...data, response: 'accepted' });
    }
  }, [orderId, onAssignmentUpdate]);

  // Subscribe to events
  useEffect(() => {
    if (!isConnected) return;

    // Track this order
    trackOrder(orderId);

    // Subscribe to order status updates
    on('order:status_update', handleStatusUpdate);
    
    // Subscribe to assignment updates
    on('assignment:response', handleAssignmentUpdate);
    on('assignment:accepted', handleAssignmentAccepted);

    return () => {
      untrackOrder(orderId);
      off('order:status_update', handleStatusUpdate);
      off('assignment:response', handleAssignmentUpdate);
      off('assignment:accepted', handleAssignmentAccepted);
    };
  }, [isConnected, orderId, on, off, trackOrder, untrackOrder, handleStatusUpdate, handleAssignmentUpdate, handleAssignmentAccepted]);

  return {
    orderStatus,
    lastUpdate,
    assignmentInfo,
    isTracking: isConnected,
  };
}
