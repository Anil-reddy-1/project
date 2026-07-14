/**
 * Notification service.
 * Derived from: tech-spec.md §11, Phase 3 Implementation Plan §8.3.5
 *
 * Centralized dispatch for all push notifications (FCM) and emails across every role.
 * All state transitions that require notifications call this service —
 * one place that decides what to send and to whom (tech-spec.md §11).
 *
 * Phase 3 extensions:
 * - Order placement notifications
 * - Payment status notifications
 * - Email notifications via Brevo
 * - In-app notification records
 */

import { adminMessaging } from "../config/firebase";
import { env } from "../config/env";
import { adminDb } from "../config/firebase";
import * as brevo from '@getbrevo/brevo';

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

// ─── Brevo Email Client ───────────────────────────────────────────────────────

let brevoClient: brevo.BrevoClient | undefined;

if (env.BREVO_API_KEY) {
  brevoClient = new brevo.BrevoClient({ apiKey: env.BREVO_API_KEY });
  console.log('✅ Brevo email service configured for notifications');
}

/**
 * Send email notification via Brevo
 */
async function sendEmail(
  to: { name: string; email: string },
  subject: string,
  htmlContent: string,
  textContent: string
): Promise<void> {
  if (!brevoClient || !to.email) {
    console.warn('[Notification] Brevo not configured or email missing - logging to console');
    console.log(`\n📧 EMAIL: ${subject}\nTo: ${to.name} <${to.email}>\n${textContent}\n`);
    return;
  }

  try {
    await brevoClient.transactionalEmails.sendTransacEmail({
      to: [{ email: to.email, name: to.name }],
      sender: {
        email: env.BREVO_FROM_EMAIL,
        name: env.BREVO_FROM_NAME,
      },
      subject,
      htmlContent,
      textContent,
    });

    console.log(`✅ Email sent: ${subject} to ${to.email}`);
  } catch (error) {
    console.error('[Notification] Failed to send email:', error);
  }
}

// ─── Order Notifications ──────────────────────────────────────────────────────

export interface OrderNotificationData {
  orderId: string;
  orderNumber: string;
  retailerName: string;
  retailerEmail: string;
  wholesalerEmail: string;
  grandTotal: number;
  itemCount: number;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: Date;
}

/**
 * Send order placed notification to retailer
 */
export async function sendOrderPlacedNotification(
  orderData: OrderNotificationData
): Promise<void> {
  const subject = `Order Confirmed - ${orderData.orderNumber}`;
  
  const textContent = [
    `Hi ${orderData.retailerName},`,
    ``,
    `Your order has been placed successfully!`,
    ``,
    `Order Number: ${orderData.orderNumber}`,
    `Order Date: ${orderData.createdAt.toLocaleString()}`,
    `Total Amount: ₹${orderData.grandTotal.toFixed(2)}`,
    `Payment Method: ${orderData.paymentMethod === 'prepaid' ? 'Prepaid (Online)' : 'Cash on Delivery'}`,
    `Status: Pending Approval`,
    ``,
    `You will be notified once the wholesaler approves your order.`,
    ``,
    `Thank you for your business!`,
    ``,
    `Best regards,`,
    `WholesaleHub Team`,
  ].join('\n');

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1F4E8C;">Order Confirmed! 🎉</h2>
      <p>Hi ${orderData.retailerName},</p>
      <p>Your order has been placed successfully!</p>
      <div style="background: #F8FAFC; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Order Details</h3>
        <p style="margin: 5px 0;"><strong>Order Number:</strong> ${orderData.orderNumber}</p>
        <p style="margin: 5px 0;"><strong>Order Date:</strong> ${orderData.createdAt.toLocaleString()}</p>
        <p style="margin: 5px 0;"><strong>Total Amount:</strong> <span style="font-size: 18px; color: #10B981;">₹${orderData.grandTotal.toFixed(2)}</span></p>
        <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${orderData.paymentMethod === 'prepaid' ? 'Prepaid (Online)' : 'Cash on Delivery'}</p>
        <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #F59E0B;">Pending Approval</span></p>
      </div>
      <p>You will be notified once the wholesaler approves your order.</p>
      <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 30px 0;">
      <p style="color: #64748B; font-size: 14px;">
        Thank you for your business!<br>
        Best regards,<br>
        WholesaleHub Team
      </p>
    </div>
  `;

  await sendEmail(
    { name: orderData.retailerName, email: orderData.retailerEmail },
    subject,
    htmlContent,
    textContent
  );

  // Create in-app notification
  await createInAppNotification(
    orderData.orderId.split('_')[0], // Extract retailer ID from order
    'Order Placed',
    `Your order ${orderData.orderNumber} has been placed successfully`,
    'order',
    { orderId: orderData.orderId, orderNumber: orderData.orderNumber }
  );
}

/**
 * Send new order alert to wholesaler
 */
export async function sendNewOrderAlertToWholesaler(
  orderData: OrderNotificationData
): Promise<void> {
  const subject = `New Order Received - ${orderData.orderNumber}`;
  
  const textContent = [
    `A new order has been placed by ${orderData.retailerName}.`,
    ``,
    `Order Number: ${orderData.orderNumber}`,
    `Retailer: ${orderData.retailerName}`,
    `Total Amount: ₹${orderData.grandTotal.toFixed(2)}`,
    `Payment Status: ${orderData.paymentStatus}`,
    `Items: ${orderData.itemCount}`,
    ``,
    `Please review and approve/reject this order.`,
    ``,
    `Best regards,`,
    `WholesaleHub System`,
  ].join('\n');

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1F4E8C;">New Order Received 📦</h2>
      <p>A new order has been placed by <strong>${orderData.retailerName}</strong>.</p>
      <div style="background: #F8FAFC; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Order Summary</h3>
        <p style="margin: 5px 0;"><strong>Order Number:</strong> ${orderData.orderNumber}</p>
        <p style="margin: 5px 0;"><strong>Retailer:</strong> ${orderData.retailerName}</p>
        <p style="margin: 5px 0;"><strong>Total Amount:</strong> <span style="font-size: 18px; color: #10B981;">₹${orderData.grandTotal.toFixed(2)}</span></p>
        <p style="margin: 5px 0;"><strong>Payment Status:</strong> ${orderData.paymentStatus}</p>
        <p style="margin: 5px 0;"><strong>Items:</strong> ${orderData.itemCount}</p>
      </div>
      <p>Please review and approve/reject this order from your dashboard.</p>
      <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 30px 0;">
      <p style="color: #64748B; font-size: 14px;">
        WholesaleHub System
      </p>
    </div>
  `;

  // Get wholesaler email from database
  try {
    const db = adminDb();
    const usersSnapshot = await db.collection('users').where('role', '==', 'wholesaler').limit(1).get();
    if (!usersSnapshot.empty) {
      const wholesaler = usersSnapshot.docs[0].data();
      await sendEmail(
        { name: wholesaler.name || 'Wholesaler', email: wholesaler.email },
        subject,
        htmlContent,
        textContent
      );

      // Create in-app notification for wholesaler
      await createInAppNotification(
        usersSnapshot.docs[0].id,
        'New Order',
        `New order ${orderData.orderNumber} from ${orderData.retailerName}`,
        'order',
        { orderId: orderData.orderId, orderNumber: orderData.orderNumber }
      );
    }
  } catch (error) {
    console.error('[Notification] Failed to send wholesaler alert:', error);
  }
}

// ─── Payment Notifications ────────────────────────────────────────────────────

export interface PaymentNotificationData {
  orderId: string;
  orderNumber: string;
  retailerName: string;
  retailerEmail: string;
  amount: number;
  paymentMethod: string;
  transactionId?: string;
  errorMessage?: string;
}

/**
 * Send payment success notification
 */
export async function sendPaymentSuccessNotification(
  paymentData: PaymentNotificationData
): Promise<void> {
  const subject = `Payment Successful - ${paymentData.orderNumber}`;
  
  const textContent = [
    `Hi ${paymentData.retailerName},`,
    ``,
    `Your payment has been processed successfully!`,
    ``,
    `Order Number: ${paymentData.orderNumber}`,
    `Amount Paid: ₹${paymentData.amount.toFixed(2)}`,
    `Payment Method: ${paymentData.paymentMethod}`,
    ...(paymentData.transactionId ? [`Transaction ID: ${paymentData.transactionId}`] : []),
    ``,
    `Your order is now awaiting approval from the wholesaler.`,
    ``,
    `Thank you!`,
    ``,
    `Best regards,`,
    `WholesaleHub Team`,
  ].join('\n');

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #10B981;">Payment Successful! ✓</h2>
      <p>Hi ${paymentData.retailerName},</p>
      <p>Your payment has been processed successfully!</p>
      <div style="background: #F8FAFC; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Payment Details</h3>
        <p style="margin: 5px 0;"><strong>Order Number:</strong> ${paymentData.orderNumber}</p>
        <p style="margin: 5px 0;"><strong>Amount Paid:</strong> <span style="font-size: 18px; color: #10B981;">₹${paymentData.amount.toFixed(2)}</span></p>
        <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${paymentData.paymentMethod}</p>
        ${paymentData.transactionId ? `<p style="margin: 5px 0;"><strong>Transaction ID:</strong> ${paymentData.transactionId}</p>` : ''}
      </div>
      <p>Your order is now awaiting approval from the wholesaler.</p>
      <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 30px 0;">
      <p style="color: #64748B; font-size: 14px;">
        Thank you!<br>
        Best regards,<br>
        WholesaleHub Team
      </p>
    </div>
  `;

  await sendEmail(
    { name: paymentData.retailerName, email: paymentData.retailerEmail },
    subject,
    htmlContent,
    textContent
  );

  // Create in-app notification
  await createInAppNotification(
    paymentData.orderId.split('_')[0], // Extract retailer ID
    'Payment Successful',
    `Payment of ₹${paymentData.amount.toFixed(2)} processed successfully`,
    'payment',
    { orderId: paymentData.orderId, orderNumber: paymentData.orderNumber }
  );
}

/**
 * Send payment failure notification
 */
export async function sendPaymentFailureNotification(
  paymentData: PaymentNotificationData
): Promise<void> {
  const subject = `Payment Failed - ${paymentData.orderNumber}`;
  
  const textContent = [
    `Hi ${paymentData.retailerName},`,
    ``,
    `Your payment could not be processed.`,
    ``,
    `Order Number: ${paymentData.orderNumber}`,
    `Amount: ₹${paymentData.amount.toFixed(2)}`,
    ...(paymentData.errorMessage ? [`Reason: ${paymentData.errorMessage}`] : []),
    ``,
    `You can retry the payment from your order details page.`,
    ``,
    `If you continue to face issues, please contact our support team.`,
    ``,
    `Best regards,`,
    `WholesaleHub Team`,
  ].join('\n');

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #DC2626;">Payment Failed</h2>
      <p>Hi ${paymentData.retailerName},</p>
      <p>Your payment could not be processed.</p>
      <div style="background: #FEE2E2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #DC2626;">
        <h3 style="margin-top: 0;">Payment Details</h3>
        <p style="margin: 5px 0;"><strong>Order Number:</strong> ${paymentData.orderNumber}</p>
        <p style="margin: 5px 0;"><strong>Amount:</strong> ₹${paymentData.amount.toFixed(2)}</p>
        ${paymentData.errorMessage ? `<p style="margin: 5px 0;"><strong>Reason:</strong> ${paymentData.errorMessage}</p>` : ''}
      </div>
      <p>You can retry the payment from your order details page.</p>
      <p>If you continue to face issues, please contact our support team.</p>
      <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 30px 0;">
      <p style="color: #64748B; font-size: 14px;">
        Best regards,<br>
        WholesaleHub Team
      </p>
    </div>
  `;

  await sendEmail(
    { name: paymentData.retailerName, email: paymentData.retailerEmail },
    subject,
    htmlContent,
    textContent
  );

  // Create in-app notification
  await createInAppNotification(
    paymentData.orderId.split('_')[0], // Extract retailer ID
    'Payment Failed',
    `Payment for order ${paymentData.orderNumber} failed`,
    'payment',
    { orderId: paymentData.orderId, orderNumber: paymentData.orderNumber }
  );
}

/**
 * Send COD confirmation
 */
export async function sendCODConfirmation(
  orderData: OrderNotificationData
): Promise<void> {
  const subject = `Order Confirmed (COD) - ${orderData.orderNumber}`;
  
  const textContent = [
    `Hi ${orderData.retailerName},`,
    ``,
    `Your Cash on Delivery order has been placed successfully!`,
    ``,
    `Order Number: ${orderData.orderNumber}`,
    `Total Amount: ₹${orderData.grandTotal.toFixed(2)}`,
    `Payment Method: Cash on Delivery`,
    ``,
    `Payment will be collected at the time of delivery.`,
    `Your order is now awaiting approval from the wholesaler.`,
    ``,
    `Thank you for your business!`,
    ``,
    `Best regards,`,
    `WholesaleHub Team`,
  ].join('\n');

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1F4E8C;">Order Confirmed (COD) 🎉</h2>
      <p>Hi ${orderData.retailerName},</p>
      <p>Your Cash on Delivery order has been placed successfully!</p>
      <div style="background: #F8FAFC; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Order Details</h3>
        <p style="margin: 5px 0;"><strong>Order Number:</strong> ${orderData.orderNumber}</p>
        <p style="margin: 5px 0;"><strong>Total Amount:</strong> <span style="font-size: 18px; color: #10B981;">₹${orderData.grandTotal.toFixed(2)}</span></p>
        <p style="margin: 5px 0;"><strong>Payment Method:</strong> Cash on Delivery</p>
      </div>
      <p><strong>Payment will be collected at the time of delivery.</strong></p>
      <p>Your order is now awaiting approval from the wholesaler.</p>
      <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 30px 0;">
      <p style="color: #64748B; font-size: 14px;">
        Thank you for your business!<br>
        Best regards,<br>
        WholesaleHub Team
      </p>
    </div>
  `;

  await sendEmail(
    { name: orderData.retailerName, email: orderData.retailerEmail },
    subject,
    htmlContent,
    textContent
  );

  // Create in-app notification
  await createInAppNotification(
    orderData.orderId.split('_')[0], // Extract retailer ID
    'Order Placed (COD)',
    `Your COD order ${orderData.orderNumber} has been placed successfully`,
    'order',
    { orderId: orderData.orderId, orderNumber: orderData.orderNumber }
  );
}

// ─── In-App Notifications ─────────────────────────────────────────────────────

/**
 * Create in-app notification record
 * These will be displayed in the app's notification center (implemented in Phase 3.9)
 */
export async function createInAppNotification(
  userId: string,
  title: string,
  message: string,
  type: string,
  metadata?: any
): Promise<void> {
  try {
    const db = adminDb();
    const notificationRef = db.collection('notifications').doc();
    await notificationRef.set({
      notificationId: notificationRef.id,
      userId,
      title,
      message,
      type,
      metadata: metadata || null,
      read: false,
      createdAt: new Date(),
    });

    console.log(`📱 In-app notification created for user ${userId}: ${title}`);
  } catch (error) {
    console.error('[Notification] Failed to create in-app notification:', error);
    // Don't throw - notification failure shouldn't break order flow
  }
}
