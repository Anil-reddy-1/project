/**
 * Navigation Service for Delivery Partners
 * Phase 5B - Maps Integration
 * 
 * Features:
 * - Google Maps deep links (Android)
 * - Apple Maps deep links (iOS)
 * - Auto-detect platform
 * - Fallback to web maps
 * - Driving mode by default
 */

interface NavigationOptions {
  latitude: number;
  longitude: number;
  label?: string;
  mode?: 'driving' | 'walking' | 'bicycling' | 'transit';
}

class NavigationService {
  /**
   * Open navigation to coordinates
   */
  navigateTo(options: NavigationOptions): void {
    const { latitude, longitude, label, mode = 'driving' } = options;

    if (this.isIOS()) {
      this.openAppleMaps(latitude, longitude, label, mode);
    } else if (this.isAndroid()) {
      this.openGoogleMaps(latitude, longitude, label, mode);
    } else {
      // Desktop or unknown - open Google Maps web
      this.openGoogleMapsWeb(latitude, longitude, label, mode);
    }
  }

  /**
   * Get directions from current location to destination
   */
  getDirections(destination: NavigationOptions): void {
    this.navigateTo(destination);
  }

  /**
   * Open Apple Maps (iOS)
   */
  private openAppleMaps(
    latitude: number,
    longitude: number,
    label?: string,
    mode: string = 'driving'
  ): void {
    // Apple Maps URL scheme
    // docs: https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/MapLinks/MapLinks.html
    
    const params = new URLSearchParams({
      daddr: `${latitude},${longitude}`,
      dirflg: this.getAppleMapsMode(mode),
    });

    if (label) {
      params.set('q', label);
    }

    const url = `maps://maps.apple.com/?${params.toString()}`;
    
    console.log('[Navigation] Opening Apple Maps:', url);
    window.location.href = url;
  }

  /**
   * Open Google Maps (Android)
   */
  private openGoogleMaps(
    latitude: number,
    longitude: number,
    label?: string,
    mode: string = 'driving'
  ): void {
    // Google Maps URL scheme
    // docs: https://developers.google.com/maps/documentation/urls/android-intents
    
    const params = new URLSearchParams({
      api: '1',
      destination: `${latitude},${longitude}`,
      travelmode: mode,
    });

    if (label) {
      params.set('destination_label', label);
    }

    const url = `https://www.google.com/maps/dir/?${params.toString()}`;
    
    console.log('[Navigation] Opening Google Maps:', url);
    window.location.href = url;
  }

  /**
   * Open Google Maps Web (fallback)
   */
  private openGoogleMapsWeb(
    latitude: number,
    longitude: number,
    label?: string,
    mode: string = 'driving'
  ): void {
    const params = new URLSearchParams({
      api: '1',
      destination: `${latitude},${longitude}`,
      travelmode: mode,
    });

    const url = `https://www.google.com/maps/dir/?${params.toString()}`;
    
    console.log('[Navigation] Opening Google Maps (web):', url);
    window.open(url, '_blank');
  }

  /**
   * Calculate ETA based on distance
   * Simple estimation: assumes 20 km/h average speed
   */
  calculateETA(distanceKm: number): number {
    const averageSpeedKmh = 20; // Bike/scooter speed in traffic
    const timeInHours = distanceKm / averageSpeedKmh;
    const timeInMinutes = Math.ceil(timeInHours * 60);
    return timeInMinutes;
  }

  /**
   * Format ETA for display
   */
  formatETA(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (mins === 0) {
      return `${hours} hr`;
    }
    
    return `${hours} hr ${mins} min`;
  }

  /**
   * Get Apple Maps direction flag
   */
  private getAppleMapsMode(mode: string): string {
    // Apple Maps direction flags:
    // d = driving (default)
    // w = walking
    // r = transit
    
    switch (mode) {
      case 'walking':
        return 'w';
      case 'transit':
        return 'r';
      case 'driving':
      case 'bicycling': // No bike mode in Apple Maps, use driving
      default:
        return 'd';
    }
  }

  /**
   * Detect if running on iOS
   */
  private isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  /**
   * Detect if running on Android
   */
  private isAndroid(): boolean {
    return /android/i.test(navigator.userAgent);
  }

  /**
   * Check if maps app is likely installed
   */
  isMapsAvailable(): boolean {
    return this.isIOS() || this.isAndroid();
  }

  /**
   * Get navigation app name for display
   */
  getNavigationAppName(): string {
    if (this.isIOS()) {
      return 'Apple Maps';
    } else if (this.isAndroid()) {
      return 'Google Maps';
    }
    return 'Maps';
  }
}

export const navigationService = new NavigationService();
