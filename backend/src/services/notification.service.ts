/**
 * Notification service stub.
 * Derived from: tech-spec.md §11
 *
 * Centralized dispatch for all push notifications (FCM) across every role.
 * All state transitions that require notifications call this service —
 * one place that decides what to send and to whom (tech-spec.md §11).
 *
 * STATUS: Phase 0 stub — methods are wired but not yet functional.
 * Phase 1 will implement FCM token registration and real dispatch.
 */

import { adminMessaging } from "../config/firebase";
import { env } from "../config/env";

export interface NotificationPayload {
  title: string;
  body: string;
  /** Additional data sent alongside the notification */
  data?: Record<string, string>;
}

/**
 * Send a push notification to a single user by their FCM token.
 *
 * @param fcmToken   - Recipient's FCM registration token (stored in users/{uid})
 * @param payload    - Notification title, body, and optional data
 */
export async function sendPushNotification(
  fcmToken: string,
  payload: NotificationPayload,
): Promise<void> {
  if (!env.FCM_SERVER_KEY) {
    console.warn("[NotificationService] FCM_SERVER_KEY not set — skipping push notification.");
    return;
  }

  try {
    await adminMessaging().send({
      token: fcmToken,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data ?? {},
      webpush: {
        notification: {
          icon: "/icons/icon-192x192.png",
          badge: "/icons/badge-72x72.png",
        },
      },
    });
  } catch (err) {
    // Notification failure is non-fatal — log and continue
    console.error("[NotificationService] Push notification failed:", err);
  }
}

/**
 * Send a push notification to multiple users at once (multicast).
 * Used for batch alerts (e.g., multiple delivery partners for assignment).
 *
 * @param fcmTokens - Array of FCM registration tokens
 * @param payload   - Notification payload
 */
export async function sendMulticastNotification(
  fcmTokens: string[],
  payload: NotificationPayload,
): Promise<void> {
  if (!env.FCM_SERVER_KEY || fcmTokens.length === 0) return;

  try {
    await adminMessaging().sendEachForMulticast({
      tokens: fcmTokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data ?? {},
    });
  } catch (err) {
    console.error("[NotificationService] Multicast notification failed:", err);
  }
}
