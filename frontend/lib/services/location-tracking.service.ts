/**
 * Location Tracking Service for Delivery Partners
 * Phase 5B - Real-time location updates
 * 
 * Features:
 * - Geolocation API integration
 * - Periodic location updates (every 30 seconds)
 * - Battery-efficient tracking
 * - Permission handling
 * - Error handling
 */

import { auth } from '../firebase/client';

class LocationTrackingService {
  private watchId: number | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private isTracking: boolean = false;
  private lastLocation: { latitude: number; longitude: number } | null = null;

  /**
   * Start tracking location
   */
  async startTracking(): Promise<void> {
    if (this.isTracking) {
      console.log('[Location] Already tracking');
      return;
    }

    try {
      // Check if geolocation is supported
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by this browser');
      }

      // Request permission
      const permission = await this.requestPermission();
      if (!permission) {
        throw new Error('Location permission denied');
      }

      // Start watching position
      this.watchId = navigator.geolocation.watchPosition(
        (position) => this.handlePosition(position),
        (error) => this.handleError(error),
        {
          enableHighAccuracy: false, // Battery-efficient
          maximumAge: 30000, // Accept cached position up to 30 seconds old
          timeout: 10000,
        }
      );

      // Set up periodic updates (every 30 seconds)
      this.updateInterval = setInterval(() => {
        this.getCurrentPosition();
      }, 30000);

      this.isTracking = true;
      console.log('[Location] Tracking started');
    } catch (error) {
      console.error('[Location] Failed to start tracking:', error);
      throw error;
    }
  }

  /**
   * Stop tracking location
   */
  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.isTracking = false;
    console.log('[Location] Tracking stopped');
  }

  /**
   * Get current position once
   */
  async getCurrentPosition(): Promise<{ latitude: number; longitude: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          resolve(location);
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: false,
          maximumAge: 30000,
          timeout: 10000,
        }
      );
    });
  }

  /**
   * Request location permission
   */
  private async requestPermission(): Promise<boolean> {
    try {
      // Check if Permissions API is supported
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        return result.state === 'granted' || result.state === 'prompt';
      }

      // Fallback: try to get position to trigger permission
      await this.getCurrentPosition();
      return true;
    } catch (error) {
      console.error('[Location] Permission check failed:', error);
      return false;
    }
  }

  /**
   * Handle position update
   */
  private async handlePosition(position: GeolocationPosition): Promise<void> {
    const newLocation = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };

    // Check if location has changed significantly (>50 meters)
    if (this.lastLocation) {
      const distance = this.calculateDistance(
        this.lastLocation.latitude,
        this.lastLocation.longitude,
        newLocation.latitude,
        newLocation.longitude
      );

      // If moved less than 50 meters, skip update (save API calls)
      if (distance < 0.05) {
        return;
      }
    }

    // Update backend
    await this.updateLocationOnServer(
      newLocation.latitude,
      newLocation.longitude,
      position.coords.accuracy
    );

    this.lastLocation = newLocation;
  }

  /**
   * Handle geolocation error
   */
  private handleError(error: GeolocationPositionError): void {
    console.error('[Location] Geolocation error:', error.message);

    switch (error.code) {
      case error.PERMISSION_DENIED:
        console.error('[Location] User denied location permission');
        this.stopTracking();
        break;
      case error.POSITION_UNAVAILABLE:
        console.error('[Location] Location information unavailable');
        break;
      case error.TIMEOUT:
        console.error('[Location] Location request timed out');
        break;
    }
  }

  /**
   * Update location on server
   */
  private async updateLocationOnServer(
    latitude: number,
    longitude: number,
    accuracy: number
  ): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.warn('[Location] No authenticated user');
        return;
      }

      const token = await user.getIdToken();
      const response = await fetch(
        'http://localhost:3001/api/delivery-assignments/partner/location',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ latitude, longitude, accuracy }),
        }
      );

      if (!response.ok) {
        console.error('[Location] Failed to update location on server');
      } else {
        console.log('[Location] Location updated:', { latitude, longitude });
      }
    } catch (error) {
      console.error('[Location] Error updating server:', error);
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   * Returns distance in kilometers
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Check if tracking is active
   */
  isActive(): boolean {
    return this.isTracking;
  }

  /**
   * Get last known location
   */
  getLastLocation(): { latitude: number; longitude: number } | null {
    return this.lastLocation;
  }
}

export const locationTrackingService = new LocationTrackingService();
