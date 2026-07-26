'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWebSocket } from '../contexts/websocket-context';

interface Location {
  lat: number;
  lng: number;
  accuracy: number;
}

interface LocationUpdate {
  partnerId: string;
  orderId?: string;
  location: Location;
  timestamp: string;
}

interface UseRealtimeLocationOptions {
  orderId?: string;
  partnerId?: string;
  onLocationUpdate?: (update: LocationUpdate) => void;
}

export function useRealtimeLocation(options: UseRealtimeLocationOptions = {}) {
  const { orderId, partnerId, onLocationUpdate } = options;
  const { on, off, trackOrder, untrackOrder, isConnected } = useWebSocket();
  const [currentLocation, setCurrentLocation] = useState<LocationUpdate | null>(null);
  const [locationHistory, setLocationHistory] = useState<LocationUpdate[]>([]);

  // Handle location updates
  const handleLocationUpdate = useCallback((data: LocationUpdate) => {
    // Filter by orderId or partnerId if specified
    if (orderId && data.orderId !== orderId) return;
    if (partnerId && data.partnerId !== partnerId) return;

    setCurrentLocation(data);
    setLocationHistory(prev => [...prev.slice(-49), data]); // Keep last 50 locations

    if (onLocationUpdate) {
      onLocationUpdate(data);
    }
  }, [orderId, partnerId, onLocationUpdate]);

  // Subscribe to location updates
  useEffect(() => {
    if (!isConnected) return;

    // Subscribe to partner location updates
    on('location:partner_update', handleLocationUpdate);
    
    // Subscribe to order-specific location updates
    on('location:update', handleLocationUpdate);

    // Track order if specified
    if (orderId) {
      trackOrder(orderId);
    }

    return () => {
      off('location:partner_update', handleLocationUpdate);
      off('location:update', handleLocationUpdate);
      
      if (orderId) {
        untrackOrder(orderId);
      }
    };
  }, [isConnected, orderId, on, off, trackOrder, untrackOrder, handleLocationUpdate]);

  const clearHistory = useCallback(() => {
    setLocationHistory([]);
  }, []);

  return {
    currentLocation,
    locationHistory,
    clearHistory,
    isTracking: isConnected,
  };
}
