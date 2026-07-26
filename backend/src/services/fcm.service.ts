import { adminAuth, adminDb } from '../config/firebase';
import { getMessaging } from 'firebase-admin/messaging';

interface NotificationPayload {
  title: string;
  body: string;
  imageUrl?: string;
  icon?: string;
}

interface DataPayload {
  [key: string]: string;
}

interface SendNotificationOptions {
  token?: string;
  tokens?: string[];
  topic?: string;
  userId?: string;
  notification: NotificationPayload;
  data?: DataPayload;
  priority?: 'high' | 'normal';
  ttl?: number; // Time to live in seconds
}

/**
 * Firebase Cloud Messaging Service
 * Handles push notifications to delivery partners and other users
 */
class FCMService {
  /**
   * Send notification to device(s) or topic
   */
  async sendNotification(options: SendNotificationOptions): Promise<boolean> {
    try {
      const messaging = getMessaging();
      const { notification, data, priority = 'high', ttl = 3600 } = options;

      // Prepare message
      const message: any = {
        notification: {
          title: notification.title,
          body: notification.body,
          ...(notification.imageUrl && { imageUrl: notification.imageUrl }),
        },
        data: data || {},
        android: {
          priority: priority === 'high' ? 'high' : 'normal',
          ttl: ttl * 1000, // Convert to milliseconds
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
            ...(notification.icon && { icon: notification.icon }),
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
        webpush: {
          notification: {
            icon: notification.icon || '/icons/notification-icon.png',
            badge: '/icons/badge-icon.png',
            vibrate: [200, 100, 200],
            requireInteraction: priority === 'high',
          },
          fcmOptions: {
            link: data?.clickAction || '/',
          },
        },
      };

      // Send to specific token
      if (options.token) {
        message.token = options.token;
        const response = await messaging.send(message);
        console.log('[FCM] Notification sent successfully:', response);
        return true;
      }

      // Send to multiple tokens
      if (options.tokens && options.tokens.length > 0) {
        // FCM allows max 500 tokens per request
        const tokenBatches = this.chunkArray(options.tokens, 500);
        
        for (const batch of tokenBatches) {
          const multicastMessage = {
            ...message,
            tokens: batch,
          };
          
          const response = await messaging.sendEachForMulticast(multicastMessage);
          console.log(`[FCM] Sent to ${response.successCount}/${batch.length} devices`);
          
          // Handle failed tokens
          if (response.failureCount > 0) {
            await this.handleFailedTokens(batch, response.responses);
          }
        }
        return true;
      }

      // Send to topic
      if (options.topic) {
        message.topic = options.topic;
        const response = await messaging.send(message);
        console.log('[FCM] Notification sent to topic:', response);
        return true;
      }

      // Send to user (fetch their tokens)
      if (options.userId) {
        const tokens = await this.getUserTokens(options.userId);
        if (tokens.length > 0) {
          return this.sendNotification({ ...options, tokens });
        }
      }

      console.error('[FCM] No valid target specified');
      return false;
    } catch (error) {
      console.error('[FCM] Error sending notification:', error);
      return false;
    }
  }

  /**
   * Register FCM token for a user
   */
  async registerToken(userId: string, token: string, deviceInfo?: any): Promise<void> {
    try {
      const db = adminDb();
      
      // Check if token already exists
      const existingTokenQuery = await db
        .collection('fcm_tokens')
        .where('token', '==', token)
        .limit(1)
        .get();

      if (!existingTokenQuery.empty) {
        // Update existing token
        const tokenDoc = existingTokenQuery.docs[0];
        await tokenDoc.ref.update({
          userId,
          lastUsed: new Date(),
          isActive: true,
          ...(deviceInfo && { deviceInfo }),
        });
      } else {
        // Create new token record
        await db.collection('fcm_tokens').add({
          userId,
          token,
          platform: deviceInfo?.platform || 'web',
          deviceInfo: deviceInfo || {},
          topics: [],
          createdAt: new Date(),
          lastUsed: new Date(),
          isActive: true,
        });
      }

      console.log(`[FCM] Token registered for user ${userId}`);
    } catch (error) {
      console.error('[FCM] Error registering token:', error);
      throw error;
    }
  }

  /**
   * Unregister FCM token
   */
  async unregisterToken(token: string): Promise<void> {
    try {
      const db = adminDb();
      
      const tokenQuery = await db
        .collection('fcm_tokens')
        .where('token', '==', token)
        .limit(1)
        .get();

      if (!tokenQuery.empty) {
        await tokenQuery.docs[0].ref.update({
          isActive: false,
        });
        console.log('[FCM] Token unregistered');
      }
    } catch (error) {
      console.error('[FCM] Error unregistering token:', error);
    }
  }

  /**
   * Get all active tokens for a user
   */
  async getUserTokens(userId: string): Promise<string[]> {
    try {
      const db = adminDb();
      
      const tokensSnapshot = await db
        .collection('fcm_tokens')
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .get();

      return tokensSnapshot.docs.map(doc => doc.data().token);
    } catch (error) {
      console.error('[FCM] Error getting user tokens:', error);
      return [];
    }
  }

  /**
   * Subscribe token to topic
   */
  async subscribeToTopic(token: string, topic: string): Promise<void> {
    try {
      const messaging = getMessaging();
      await messaging.subscribeToTopic(token, topic);
      
      // Update token record
      const db = adminDb();
      const tokenQuery = await db
        .collection('fcm_tokens')
        .where('token', '==', token)
        .limit(1)
        .get();

      if (!tokenQuery.empty) {
        const tokenDoc = tokenQuery.docs[0];
        const currentTopics = tokenDoc.data().topics || [];
        if (!currentTopics.includes(topic)) {
          await tokenDoc.ref.update({
            topics: [...currentTopics, topic],
          });
        }
      }

      console.log(`[FCM] Subscribed to topic: ${topic}`);
    } catch (error) {
      console.error('[FCM] Error subscribing to topic:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe token from topic
   */
  async unsubscribeFromTopic(token: string, topic: string): Promise<void> {
    try {
      const messaging = getMessaging();
      await messaging.unsubscribeFromTopic(token, topic);
      
      // Update token record
      const db = adminDb();
      const tokenQuery = await db
        .collection('fcm_tokens')
        .where('token', '==', token)
        .limit(1)
        .get();

      if (!tokenQuery.empty) {
        const tokenDoc = tokenQuery.docs[0];
        const currentTopics = tokenDoc.data().topics || [];
        await tokenDoc.ref.update({
          topics: currentTopics.filter((t: string) => t !== topic),
        });
      }

      console.log(`[FCM] Unsubscribed from topic: ${topic}`);
    } catch (error) {
      console.error('[FCM] Error unsubscribing from topic:', error);
      throw error;
    }
  }

  /**
   * Send notification to all delivery partners
   */
  async sendToAllDeliveryPartners(notification: NotificationPayload, data?: DataPayload): Promise<void> {
    try {
      const db = adminDb();
      
      // Get all delivery partners
      const partnersSnapshot = await db
        .collection('users')
        .where('role', '==', 'delivery')
        .get();

      const partnerIds = partnersSnapshot.docs.map(doc => doc.id);
      
      // Get all their tokens
      const tokensSnapshot = await db
        .collection('fcm_tokens')
        .where('userId', 'in', partnerIds)
        .where('isActive', '==', true)
        .get();

      const tokens = tokensSnapshot.docs.map(doc => doc.data().token);

      if (tokens.length > 0) {
        await this.sendNotification({
          tokens,
          notification,
          data,
          priority: 'high',
        });
      }
    } catch (error) {
      console.error('[FCM] Error sending to all delivery partners:', error);
    }
  }

  /**
   * Handle failed token deliveries
   */
  private async handleFailedTokens(tokens: string[], responses: any[]): Promise<void> {
    const db = adminDb();
    
    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      
      if (!response.success) {
        const token = tokens[i];
        const error = response.error;

        // If token is invalid or unregistered, mark as inactive
        if (
          error?.code === 'messaging/invalid-registration-token' ||
          error?.code === 'messaging/registration-token-not-registered'
        ) {
          try {
            await this.unregisterToken(token);
            console.log(`[FCM] Marked invalid token as inactive`);
          } catch (err) {
            console.error('[FCM] Error handling failed token:', err);
          }
        }
      }
    }
  }

  /**
   * Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Clean up old inactive tokens (run periodically)
   */
  async cleanupInactiveTokens(daysOld: number = 30): Promise<void> {
    try {
      const db = adminDb();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const oldTokensSnapshot = await db
        .collection('fcm_tokens')
        .where('isActive', '==', false)
        .where('lastUsed', '<', cutoffDate)
        .get();

      const batch = db.batch();
      oldTokensSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`[FCM] Cleaned up ${oldTokensSnapshot.size} old tokens`);
    } catch (error) {
      console.error('[FCM] Error cleaning up tokens:', error);
    }
  }
}

export const fcmService = new FCMService();

// Predefined notification templates
export const FCM_TEMPLATES = {
  NEW_ASSIGNMENT: (earnings: number, distance: number) => ({
    title: '🚚 New Delivery Request',
    body: `Earn ₹${earnings} for ${distance.toFixed(1)}km delivery`,
    icon: '/icons/delivery-icon.png',
  }),

  BATCH_ASSIGNMENT: (count: number, earnings: number) => ({
    title: '📦 New Batch Delivery',
    body: `${count} orders - Earn ₹${earnings} total`,
    icon: '/icons/batch-icon.png',
  }),

  ASSIGNMENT_TIMEOUT: () => ({
    title: '⏰ Assignment Expired',
    body: 'You missed a delivery opportunity',
    icon: '/icons/timeout-icon.png',
  }),

  ORDER_READY: (orderNumber: string) => ({
    title: '✅ Order Ready for Pickup',
    body: `Order ${orderNumber} is packed and ready`,
    icon: '/icons/ready-icon.png',
  }),

  SURGE_ACTIVE: (multiplier: number) => ({
    title: '🔥 Surge Pricing Active',
    body: `Earn ${multiplier}x more right now!`,
    icon: '/icons/surge-icon.png',
  }),

  ORDER_DELIVERED: (orderNumber: string, earnings: number) => ({
    title: '💰 Delivery Complete',
    body: `Order ${orderNumber} delivered - You earned ₹${earnings}`,
    icon: '/icons/success-icon.png',
  }),
};
