/**
 * Offline Cache Service for Delivery Partners
 * Phase 5B - Basic offline support
 * 
 * Features:
 * - Cache active deliveries
 * - Queue location updates when offline
 * - Sync when back online
 * - LocalStorage-based (simple implementation)
 */

interface CachedData {
  timestamp: number;
  data: any;
}

interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

class OfflineCacheService {
  private readonly CACHE_PREFIX = 'delivery_cache_';
  private readonly LOCATION_QUEUE_KEY = 'location_updates_queue';
  private readonly MAX_CACHE_AGE_MS = 5 * 60 * 1000; // 5 minutes
  private isOnline: boolean = navigator.onLine;

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  /**
   * Cache data with timestamp
   */
  set(key: string, data: any): void {
    try {
      const cached: CachedData = {
        timestamp: Date.now(),
        data,
      };
      localStorage.setItem(
        `${this.CACHE_PREFIX}${key}`,
        JSON.stringify(cached)
      );
    } catch (error) {
      console.error('[OfflineCache] Failed to cache data:', error);
    }
  }

  /**
   * Get cached data if not expired
   */
  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(`${this.CACHE_PREFIX}${key}`);
      if (!item) return null;

      const cached: CachedData = JSON.parse(item);
      const age = Date.now() - cached.timestamp;

      // Check if expired
      if (age > this.MAX_CACHE_AGE_MS) {
        this.remove(key);
        return null;
      }

      return cached.data as T;
    } catch (error) {
      console.error('[OfflineCache] Failed to get cached data:', error);
      return null;
    }
  }

  /**
   * Remove cached data
   */
  remove(key: string): void {
    try {
      localStorage.removeItem(`${this.CACHE_PREFIX}${key}`);
    } catch (error) {
      console.error('[OfflineCache] Failed to remove cache:', error);
    }
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(this.CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('[OfflineCache] Failed to clear cache:', error);
    }
  }

  /**
   * Queue location update when offline
   */
  queueLocationUpdate(update: LocationUpdate): void {
    try {
      const queue = this.getLocationQueue();
      queue.push(update);

      // Keep only last 50 updates
      if (queue.length > 50) {
        queue.shift();
      }

      localStorage.setItem(this.LOCATION_QUEUE_KEY, JSON.stringify(queue));
      console.log('[OfflineCache] Location update queued:', queue.length);
    } catch (error) {
      console.error('[OfflineCache] Failed to queue location:', error);
    }
  }

  /**
   * Get queued location updates
   */
  getLocationQueue(): LocationUpdate[] {
    try {
      const item = localStorage.getItem(this.LOCATION_QUEUE_KEY);
      return item ? JSON.parse(item) : [];
    } catch (error) {
      console.error('[OfflineCache] Failed to get location queue:', error);
      return [];
    }
  }

  /**
   * Clear location queue
   */
  clearLocationQueue(): void {
    try {
      localStorage.removeItem(this.LOCATION_QUEUE_KEY);
    } catch (error) {
      console.error('[OfflineCache] Failed to clear location queue:', error);
    }
  }

  /**
   * Sync queued location updates when back online
   */
  async syncLocationUpdates(
    syncFunction: (updates: LocationUpdate[]) => Promise<void>
  ): Promise<void> {
    if (!this.isOnline) {
      console.log('[OfflineCache] Still offline, skipping sync');
      return;
    }

    const queue = this.getLocationQueue();
    if (queue.length === 0) {
      console.log('[OfflineCache] No location updates to sync');
      return;
    }

    console.log('[OfflineCache] Syncing', queue.length, 'location updates');

    try {
      await syncFunction(queue);
      this.clearLocationQueue();
      console.log('[OfflineCache] Sync completed successfully');
    } catch (error) {
      console.error('[OfflineCache] Sync failed:', error);
      // Keep queue for next sync attempt
    }
  }

  /**
   * Check if online
   */
  checkOnlineStatus(): boolean {
    return this.isOnline;
  }

  /**
   * Handle online event
   */
  private handleOnline(): void {
    console.log('[OfflineCache] Device is back online');
    this.isOnline = true;

    // Trigger custom event for components to react
    window.dispatchEvent(new CustomEvent('app-online'));
  }

  /**
   * Handle offline event
   */
  private handleOffline(): void {
    console.log('[OfflineCache] Device is offline');
    this.isOnline = false;

    // Trigger custom event for components to react
    window.dispatchEvent(new CustomEvent('app-offline'));
  }

  /**
   * Cache active order data
   */
  cacheActiveOrder(orderId: string, orderData: any): void {
    this.set(`active_order_${orderId}`, orderData);
  }

  /**
   * Get cached active order
   */
  getCachedActiveOrder(orderId: string): any | null {
    return this.get(`active_order_${orderId}`);
  }

  /**
   * Cache partner status
   */
  cachePartnerStatus(status: any): void {
    this.set('partner_status', status);
  }

  /**
   * Get cached partner status
   */
  getCachedPartnerStatus(): any | null {
    return this.get('partner_status');
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    totalCached: number;
    queuedUpdates: number;
    isOnline: boolean;
  } {
    const keys = Object.keys(localStorage).filter((key) =>
      key.startsWith(this.CACHE_PREFIX)
    );

    return {
      totalCached: keys.length,
      queuedUpdates: this.getLocationQueue().length,
      isOnline: this.isOnline,
    };
  }
}

export const offlineCacheService = new OfflineCacheService();
