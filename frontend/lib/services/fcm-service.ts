'use client';

import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { app } from '../firebase/client';

class FCMService {
  private messaging: any = null;
  private currentToken: string | null = null;
  private isInitialized = false;

  /**
   * Initialize FCM
   */
  async initialize(): Promise<boolean> {
    try {
      // Check if messaging is supported
      const supported = await isSupported();
      if (!supported) {
        console.log('[FCM] Firebase Messaging is not supported in this browser');
        return false;
      }

      // Check if service worker is supported
      if (!('serviceWorker' in navigator)) {
        console.log('[FCM] Service Worker is not supported');
        return false;
      }

      this.messaging = getMessaging(app);
      this.isInitialized = true;
      
      console.log('[FCM] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[FCM] Error initializing:', error);
      return false;
    }
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.log('[FCM] Notifications not supported');
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    console.log('[FCM] Permission:', permission);
    return permission;
  }

  /**
   * Get FCM token
   */
  async getToken(): Promise<string | null> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!this.messaging) {
        return null;
      }

      // Request permission first
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        console.log('[FCM] Permission not granted');
        return null;
      }

      // Get VAPID key from environment
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        console.warn('[FCM] VAPID key not configured');
        // Try to get token anyway (will use default)
      }

      // Register service worker
      await this.registerServiceWorker();

      // Get token
      const token = await getToken(this.messaging, {
        vapidKey: vapidKey || undefined,
        serviceWorkerRegistration: await navigator.serviceWorker.ready,
      });

      if (token) {
        this.currentToken = token;
        console.log('[FCM] Token obtained:', token.substring(0, 20) + '...');
        return token;
      } else {
        console.log('[FCM] No token available');
        return null;
      }
    } catch (error) {
      console.error('[FCM] Error getting token:', error);
      return null;
    }
  }

  /**
   * Register service worker
   */
  private async registerServiceWorker(): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/',
      });
      
      console.log('[FCM] Service Worker registered:', registration);
      
      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
    } catch (error) {
      console.error('[FCM] Service Worker registration failed:', error);
      throw error;
    }
  }

  /**
   * Listen for foreground messages
   */
  onMessage(callback: (payload: any) => void): () => void {
    if (!this.messaging) {
      console.warn('[FCM] Messaging not initialized');
      return () => {};
    }

    const unsubscribe = onMessage(this.messaging, (payload) => {
      console.log('[FCM] Foreground message received:', payload);
      callback(payload);
    });

    return unsubscribe;
  }

  /**
   * Register token with backend
   */
  async registerTokenWithBackend(token: string, idToken: string): Promise<boolean> {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
      const response = await fetch(`${apiUrl}/fcm/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          token,
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to register token');
      }

      console.log('[FCM] Token registered with backend');
      return true;
    } catch (error) {
      console.error('[FCM] Error registering token with backend:', error);
      return false;
    }
  }

  /**
   * Unregister token from backend
   */
  async unregisterTokenFromBackend(token: string, idToken: string): Promise<boolean> {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
      const response = await fetch(`${apiUrl}/fcm/unregister`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error('Failed to unregister token');
      }

      console.log('[FCM] Token unregistered from backend');
      return true;
    } catch (error) {
      console.error('[FCM] Error unregistering token from backend:', error);
      return false;
    }
  }

  /**
   * Subscribe to topic
   */
  async subscribeToTopic(token: string, topic: string, idToken: string): Promise<boolean> {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
      const response = await fetch(`${apiUrl}/fcm/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ token, topic }),
      });

      if (!response.ok) {
        throw new Error('Failed to subscribe to topic');
      }

      console.log(`[FCM] Subscribed to topic: ${topic}`);
      return true;
    } catch (error) {
      console.error('[FCM] Error subscribing to topic:', error);
      return false;
    }
  }

  /**
   * Get current token
   */
  getCurrentToken(): string | null {
    return this.currentToken;
  }

  /**
   * Check if notifications are supported
   */
  isNotificationSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  /**
   * Get notification permission status
   */
  getPermissionStatus(): NotificationPermission {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }
}

export const fcmService = new FCMService();
