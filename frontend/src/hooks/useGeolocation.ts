/**
 * useGeolocation Hook
 * React hook for capturing and managing geolocation data
 */

import { useState, useCallback, useEffect } from 'react';
import {
  getCurrentPosition,
  checkGeolocationPermission,
  isGeolocationSupported,
  GeolocationError,
  GeolocationErrorType,
  type GeolocationOptions,
} from '../utils/geolocation';
import type { GeolocationCoordinates } from '../types/address.types';

// Hook state interface
interface UseGeolocationState {
  coordinates: GeolocationCoordinates | null;
  loading: boolean;
  error: GeolocationError | null;
  permissionState: PermissionState | 'unsupported' | null;
  isSupported: boolean;
}

// Hook return interface
interface UseGeolocationReturn extends UseGeolocationState {
  captureLocation: () => Promise<void>;
  clearLocation: () => void;
  clearError: () => void;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for geolocation management
 * 
 * @param options - Geolocation API options
 * @param autoCapture - Whether to automatically capture location on mount
 * 
 * @example
 * const { coordinates, loading, error, captureLocation } = useGeolocation();
 * 
 * // Capture location on button click
 * <button onClick={captureLocation}>Get Location</button>
 * 
 * // Display coordinates
 * {coordinates && <p>Lat: {coordinates.latitude}, Lng: {coordinates.longitude}</p>}
 */
export function useGeolocation(
  options?: GeolocationOptions,
  autoCapture: boolean = false
): UseGeolocationReturn {
  const [state, setState] = useState<UseGeolocationState>({
    coordinates: null,
    loading: false,
    error: null,
    permissionState: null,
    isSupported: isGeolocationSupported(),
  });

  /**
   * Check and update permission state
   */
  const updatePermissionState = useCallback(async () => {
    try {
      const permission = await checkGeolocationPermission();
      setState((prev) => ({ ...prev, permissionState: permission }));
    } catch (error) {
      console.error('Error checking permission:', error);
    }
  }, []);

  /**
   * Capture current location
   */
  const captureLocation = useCallback(async () => {
    // Check if geolocation is supported
    if (!state.isSupported) {
      const error = new GeolocationError(
        GeolocationErrorType.NOT_SUPPORTED,
        'Geolocation is not supported by your browser'
      );
      setState((prev) => ({ ...prev, error, loading: false }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const coords = await getCurrentPosition(options);
      setState((prev) => ({
        ...prev,
        coordinates: coords,
        loading: false,
        error: null,
      }));

      // Update permission state after successful capture
      await updatePermissionState();
    } catch (error) {
      const geoError = error instanceof GeolocationError
        ? error
        : new GeolocationError(
            GeolocationErrorType.UNKNOWN,
            'Failed to get location',
            error as any
          );

      setState((prev) => ({
        ...prev,
        loading: false,
        error: geoError,
        coordinates: null,
      }));

      // Update permission state after error
      await updatePermissionState();
    }
  }, [state.isSupported, options, updatePermissionState]);

  /**
   * Clear captured location
   */
  const clearLocation = useCallback(() => {
    setState((prev) => ({
      ...prev,
      coordinates: null,
      error: null,
    }));
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Refetch location (alias for captureLocation)
   */
  const refetch = captureLocation;

  /**
   * Auto-capture location on mount if enabled
   */
  useEffect(() => {
    if (autoCapture && state.isSupported) {
      captureLocation();
    }
  }, [autoCapture, state.isSupported, captureLocation]);

  /**
   * Check permission state on mount
   */
  useEffect(() => {
    updatePermissionState();
  }, [updatePermissionState]);

  return {
    ...state,
    captureLocation,
    clearLocation,
    clearError,
    refetch,
  };
}

export default useGeolocation;
