/**
 * Geolocation Utility
 * Browser geolocation API helpers for address location capture
 */

import type { GeolocationCoordinates } from '../types/address.types';

// Geolocation error types
export enum GeolocationErrorType {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  POSITION_UNAVAILABLE = 'POSITION_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  UNKNOWN = 'UNKNOWN',
}

// Custom error class for geolocation errors
export class GeolocationError extends Error {
  type: GeolocationErrorType;
  originalError?: GeolocationPositionError;

  constructor(type: GeolocationErrorType, message: string, originalError?: GeolocationPositionError) {
    super(message);
    this.name = 'GeolocationError';
    this.type = type;
    this.originalError = originalError;
  }
}

// Geolocation options
export interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

// Default geolocation options
const DEFAULT_OPTIONS: GeolocationOptions = {
  enableHighAccuracy: true,
  timeout: 10000, // 10 seconds
  maximumAge: 0, // Don't use cached position
};

/**
 * Check if geolocation is supported by the browser
 */
export function isGeolocationSupported(): boolean {
  return 'geolocation' in navigator;
}

/**
 * Check browser geolocation permission status
 * Returns 'granted', 'denied', 'prompt', or 'unsupported'
 */
export async function checkGeolocationPermission(): Promise<PermissionState | 'unsupported'> {
  if (!isGeolocationSupported()) {
    return 'unsupported';
  }

  try {
    // Check if Permissions API is available
    if (!navigator.permissions || !navigator.permissions.query) {
      return 'prompt'; // Assume prompt if Permissions API not available
    }

    const result = await navigator.permissions.query({ name: 'geolocation' });
    return result.state;
  } catch (error) {
    console.warn('Error checking geolocation permission:', error);
    return 'prompt'; // Fallback to prompt
  }
}

/**
 * Get current position from browser geolocation API
 * Returns coordinates with accuracy and timestamp
 */
export async function getCurrentPosition(
  options: GeolocationOptions = DEFAULT_OPTIONS
): Promise<GeolocationCoordinates> {
  // Check if geolocation is supported
  if (!isGeolocationSupported()) {
    throw new GeolocationError(
      GeolocationErrorType.NOT_SUPPORTED,
      'Geolocation is not supported by your browser'
    );
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates: GeolocationCoordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        };
        resolve(coordinates);
      },
      (error) => {
        // Map GeolocationPositionError to custom error
        let errorType: GeolocationErrorType;
        let message: string;

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorType = GeolocationErrorType.PERMISSION_DENIED;
            message = 'Location permission denied. Please enable location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorType = GeolocationErrorType.POSITION_UNAVAILABLE;
            message = 'Location information is unavailable. Please check your device settings.';
            break;
          case error.TIMEOUT:
            errorType = GeolocationErrorType.TIMEOUT;
            message = 'Location request timed out. Please try again.';
            break;
          default:
            errorType = GeolocationErrorType.UNKNOWN;
            message = 'An unknown error occurred while getting your location.';
        }

        reject(new GeolocationError(errorType, message, error));
      },
      options
    );
  });
}

/**
 * Format coordinates for display
 * Example: "28.6139, 77.2090"
 */
export function formatCoordinates(latitude: number, longitude: number, precision: number = 4): string {
  return `${latitude.toFixed(precision)}, ${longitude.toFixed(precision)}`;
}

/**
 * Format coordinates with labels
 * Example: "Lat: 28.6139, Lng: 77.2090"
 */
export function formatCoordinatesWithLabels(latitude: number, longitude: number, precision: number = 4): string {
  return `Lat: ${latitude.toFixed(precision)}, Lng: ${longitude.toFixed(precision)}`;
}

/**
 * Get Google Maps URL for coordinates
 */
export function getGoogleMapsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

/**
 * Get OpenStreetMap URL for coordinates
 */
export function getOpenStreetMapUrl(latitude: number, longitude: number, zoom: number = 15): string {
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}&zoom=${zoom}`;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Validate latitude value
 */
export function isValidLatitude(lat: number): boolean {
  return typeof lat === 'number' && !isNaN(lat) && lat >= -90 && lat <= 90;
}

/**
 * Validate longitude value
 */
export function isValidLongitude(lon: number): boolean {
  return typeof lon === 'number' && !isNaN(lon) && lon >= -180 && lon <= 180;
}

/**
 * Validate coordinates pair
 */
export function areValidCoordinates(lat: number, lon: number): boolean {
  return isValidLatitude(lat) && isValidLongitude(lon);
}

/**
 * Get user-friendly error message for geolocation errors
 */
export function getGeolocationErrorMessage(error: GeolocationError): string {
  return error.message;
}

/**
 * Get help text for geolocation permission issues
 */
export function getPermissionHelpText(permissionState: PermissionState | 'unsupported'): string {
  switch (permissionState) {
    case 'granted':
      return 'Location access is enabled.';
    case 'denied':
      return 'Location access is blocked. Please enable it in your browser settings.';
    case 'prompt':
      return 'Click "Capture Location" to allow location access.';
    case 'unsupported':
      return 'Your browser does not support geolocation.';
    default:
      return 'Location access status unknown.';
  }
}
