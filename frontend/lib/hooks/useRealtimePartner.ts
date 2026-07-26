'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWebSocket } from '../contexts/websocket-context';

interface PartnerStatusUpdate {
  partnerId: string;
  status: 'available' | 'busy' | 'offline';
  timestamp: string;
  [key: string]: any;
}

interface NewAssignment {
  assignmentId: string;
  orderId: string;
  pickupLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  deliveryLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  distance: number;
  earnings: number;
  slaDuration: number;
  timestamp: string;
  [key: string]: any;
}

interface UseRealtimePartnerOptions {
  onNewAssignment?: (assignment: NewAssignment) => void;
  onStatusUpdate?: (update: PartnerStatusUpdate) => void;
}

export function useRealtimePartner(options: UseRealtimePartnerOptions = {}) {
  const { onNewAssignment, onStatusUpdate } = options;
  const { on, off, emit, isConnected } = useWebSocket();
  const [partnerStatus, setPartnerStatus] = useState<'available' | 'busy' | 'offline'>('offline');
  const [pendingAssignment, setPendingAssignment] = useState<NewAssignment | null>(null);
  const [assignmentHistory, setAssignmentHistory] = useState<NewAssignment[]>([]);

  // Handle new assignment notification
  const handleNewAssignment = useCallback((data: NewAssignment) => {
    setPendingAssignment(data);
    setAssignmentHistory(prev => [...prev, data]);

    if (onNewAssignment) {
      onNewAssignment(data);
    }

    // Play notification sound (if enabled)
    if (typeof window !== 'undefined' && 'Audio' in window) {
      try {
        const audio = new Audio('/sounds/notification.mp3');
        audio.play().catch(() => {
          // Ignore if autoplay is blocked
        });
      } catch (error) {
        // Ignore audio errors
      }
    }
  }, [onNewAssignment]);

  // Handle partner status update
  const handleStatusUpdate = useCallback((data: PartnerStatusUpdate) => {
    setPartnerStatus(data.status);

    if (onStatusUpdate) {
      onStatusUpdate(data);
    }
  }, [onStatusUpdate]);

  // Update partner status
  const updateStatus = useCallback((status: 'available' | 'busy' | 'offline') => {
    emit('partner:status', { status });
    setPartnerStatus(status);
  }, [emit]);

  // Update location (for delivery partners)
  const updateLocation = useCallback((lat: number, lng: number, accuracy: number, orderId?: string) => {
    emit('location:update', { lat, lng, accuracy, orderId });
  }, [emit]);

  // Clear pending assignment
  const clearPendingAssignment = useCallback(() => {
    setPendingAssignment(null);
  }, []);

  // Subscribe to events
  useEffect(() => {
    if (!isConnected) {
      setPartnerStatus('offline');
      return;
    }

    // Subscribe to new assignments
    on('assignment:new', handleNewAssignment);
    
    // Subscribe to status updates
    on('partner:status_update', handleStatusUpdate);

    return () => {
      off('assignment:new', handleNewAssignment);
      off('partner:status_update', handleStatusUpdate);
    };
  }, [isConnected, on, off, handleNewAssignment, handleStatusUpdate]);

  return {
    partnerStatus,
    pendingAssignment,
    assignmentHistory,
    updateStatus,
    updateLocation,
    clearPendingAssignment,
    isConnected,
  };
}
