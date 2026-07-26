'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { fcmService } from '../services/fcm-service';

interface FCMNotification {
  title: string;
  body: string;
  data?: any;
  timestamp: Date;
}

export function useFCM() {
  const { user, role } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastNotification, setLastNotification] = useState<FCMNotification | null>(null);

  // Check if FCM is supported
  useEffect(() => {
    const checkSupport = async () => {
      const supported = fcmService.isNotificationSupported();
      setIsSupported(supported);
      
      if (supported) {
        const currentPermission = fcmService.getPermissionStatus();
        setPermission(currentPermission);
      }
    };

    checkSupport();
  }, []);

  // Initialize FCM and get token
  const initializeFCM = useCallback(async () => {
    if (!user || !isSupported) {
      return;
    }

    setIsLoading(true);

    try {
      const idToken = await user.getIdToken();
      // Initialize messaging
      await fcmService.initialize();

      // Get FCM token
      const fcmToken = await fcmService.getToken();
      
      if (fcmToken) {
        setToken(fcmToken);
        setPermission('granted');

        // Register token with backend
        await fcmService.registerTokenWithBackend(fcmToken, idToken);

        // Subscribe to topics based on user role
        if (role === 'delivery_partner') {
          await fcmService.subscribeToTopic(fcmToken, 'new_deliveries', idToken);
          await fcmService.subscribeToTopic(fcmToken, 'delivery_updates', idToken);
        }
      }
    } catch (error) {
      console.error('[useFCM] Error initializing:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, role, isSupported]);

  // Listen for foreground messages
  useEffect(() => {
    if (!token) return;

    const unsubscribe = fcmService.onMessage((payload) => {
      setLastNotification({
        title: payload.notification?.title || 'Notification',
        body: payload.notification?.body || '',
        data: payload.data,
        timestamp: new Date(),
      });

      // Show browser notification if permission is granted
      if (permission === 'granted' && 'Notification' in window) {
        new Notification(payload.notification?.title || 'Notification', {
          body: payload.notification?.body || '',
          icon: payload.notification?.icon || '/icons/notification-icon.png',
          badge: '/icons/badge-icon.png',
          tag: payload.data?.type || 'default',
          data: payload.data,
        });
      }

      // Play notification sound
      playNotificationSound();
    });

    return () => {
      unsubscribe();
    };
  }, [token, permission]);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const newPermission = await fcmService.requestPermission();
      setPermission(newPermission);

      if (newPermission === 'granted') {
        await initializeFCM();
      }

      return newPermission;
    } catch (error) {
      console.error('[useFCM] Error requesting permission:', error);
      return 'denied';
    } finally {
      setIsLoading(false);
    }
  }, [initializeFCM]);

  // Clear last notification
  const clearNotification = useCallback(() => {
    setLastNotification(null);
  }, []);

  return {
    isSupported,
    permission,
    token,
    isLoading,
    lastNotification,
    requestPermission,
    initializeFCM,
    clearNotification,
  };
}

// Helper function to play notification sound
function playNotificationSound() {
  try {
    const audio = new Audio('/sounds/notification.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {
      // Ignore if autoplay is blocked
    });
  } catch (error) {
    // Ignore audio errors
  }
}
