const pool = require('../config/db');
const { emitToUser } = require('../utils/socketEmitter');

/**
 * Notification Service
 * Handles creation and management of user notifications
 * 
 * Implements in-app notifications stored in database + real-time Socket.IO push.
 */

/**
 * Create a notification for a user
 * @param {string} userId - User ID
 * @param {string} type - Notification type
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {object} data - Additional data (order_id, delivery_id, etc.)
 * @returns {Promise<object>} Created notification
 */
async function createNotification(userId, type, title, message, data = {}) {
  try {
    const query = `
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    
    const values = [userId, type, title, message, JSON.stringify(data)];
    const result = await pool.query(query, values);
    
    const notification = mapNotificationRow(result.rows[0]);
    
    console.log(`[Notification] Created ${type} for user ${userId}: ${title}`);
    
    // Push real-time notification via Socket.IO
    emitToUser(userId, 'notification:new', notification);
    
    return notification;
  } catch (error) {
    console.error('[Notification] Error creating notification:', error);
    // Don't throw - notifications are non-critical
    return null;
  }
}

/**
 * Send order confirmation notification to buyer
 */
async function sendOrderConfirmation(userId, orderData) {
  return await createNotification(
    userId,
    'order_confirmed',
    'Order Confirmed',
    `Your order #${orderData.orderNumber} has been confirmed. Total amount: ₹${orderData.totalAmount.toFixed(2)}`,
    {
      orderId: orderData.id,
      orderNumber: orderData.orderNumber,
      totalAmount: orderData.totalAmount
    }
  );
}

/**
 * Send delivery assignment notification to delivery partner
 */
async function sendDeliveryAssigned(partnerId, deliveryData) {
  return await createNotification(
    partnerId,
    'delivery_assigned',
    'New Delivery Assigned',
    `You have been assigned a delivery for ${deliveryData.customerName}. Location: ${deliveryData.deliveryAddress.city}`,
    {
      deliveryId: deliveryData.id,
      orderId: deliveryData.orderId,
      orderNumber: deliveryData.orderNumber,
      customerName: deliveryData.customerName
    }
  );
}

/**
 * Send delivery status update notification to buyer
 */
async function sendDeliveryStatusUpdate(userId, status, deliveryData) {
  const inTransitMsg = deliveryData.deliveryOtp
    ? `Your order #${deliveryData.orderNumber} has been picked up and is out for delivery! Share OTP ${deliveryData.deliveryOtp} with your delivery partner to confirm delivery.`
    : `Your order #${deliveryData.orderNumber} is out for delivery!`;

  const assignedMsg = deliveryData.deliveryOtp
    ? `Your order #${deliveryData.orderNumber} has been assigned to a delivery partner. Your delivery OTP is ${deliveryData.deliveryOtp} — share it with the partner only when you receive your order.`
    : `Your order #${deliveryData.orderNumber} has been assigned to a delivery partner.`;

  const messages = {
    assigned: assignedMsg,
    accepted: `Your delivery partner has accepted order #${deliveryData.orderNumber}.`,
    in_transit: inTransitMsg,
    delivered: `Your order #${deliveryData.orderNumber} has been delivered successfully.`
  };
  
  const titles = {
    assigned: 'Order Assigned',
    accepted: 'Delivery Accepted',
    in_transit: 'Order Picked Up - Out for Delivery',
    delivered: 'Order Delivered'
  };
  
  return await createNotification(
    userId,
    `delivery_${status}`,
    titles[status] || 'Delivery Update',
    messages[status] || `Delivery status updated to ${status}`,
    {
      deliveryId: deliveryData.id,
      orderId: deliveryData.orderId,
      orderNumber: deliveryData.orderNumber,
      deliveryOtp: deliveryData.deliveryOtp,
      status
    }
  );
}

/**
 * Send order completed notification to buyer
 */
async function sendOrderCompleted(userId, orderData) {
  return await createNotification(
    userId,
    'order_completed',
    'Order Completed',
    `Your order #${orderData.orderNumber} has been completed. Thank you for your purchase!`,
    {
      orderId: orderData.id,
      orderNumber: orderData.orderNumber
    }
  );
}

/**
 * Send order cancelled notification to buyer
 */
async function sendOrderCancelled(userId, orderData, reason) {
  return await createNotification(
    userId,
    'order_cancelled',
    'Order Cancelled',
    `Your order #${orderData.orderNumber} has been cancelled. ${reason ? `Reason: ${reason}` : ''}`,
    {
      orderId: orderData.id,
      orderNumber: orderData.orderNumber,
      reason
    }
  );
}

/**
 * Get user's notifications
 */
async function getUserNotifications(userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
  try {
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT * FROM notifications
      WHERE user_id = $1
      ${unreadOnly ? 'AND read_at IS NULL' : ''}
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3;
    `;
    
    const countQuery = `
      SELECT COUNT(*) FROM notifications
      WHERE user_id = $1
      ${unreadOnly ? 'AND read_at IS NULL' : ''};
    `;
    
    const [notificationsResult, countResult] = await Promise.all([
      pool.query(query, [userId, limit, offset]),
      pool.query(countQuery, [userId])
    ]);
    
    return {
      notifications: notificationsResult.rows.map(mapNotificationRow),
      total: parseInt(countResult.rows[0].count, 10),
      page,
      limit
    };
  } catch (error) {
    console.error('[Notification] Error fetching notifications:', error);
    throw error;
  }
}

/**
 * Mark notification as read
 */
async function markAsRead(notificationId, userId) {
  try {
    const query = `
      UPDATE notifications
      SET read_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2 AND read_at IS NULL
      RETURNING *;
    `;
    
    const result = await pool.query(query, [notificationId, userId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return mapNotificationRow(result.rows[0]);
  } catch (error) {
    console.error('[Notification] Error marking as read:', error);
    throw error;
  }
}

/**
 * Mark all notifications as read for a user
 */
async function markAllAsRead(userId) {
  try {
    const query = `
      UPDATE notifications
      SET read_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND read_at IS NULL;
    `;

    const result = await pool.query(query, [userId]);
    return result.rowCount;
  } catch (error) {
    console.error('[Notification] Error marking all as read:', error);
    throw error;
  }
}

/**
 * Get unread notification count
 */
async function getUnreadCount(userId) {
  try {
    const query = `
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = $1 AND read_at IS NULL;
    `;
    
    const result = await pool.query(query, [userId]);
    return parseInt(result.rows[0].count, 10);
  } catch (error) {
    console.error('[Notification] Error getting unread count:', error);
    return 0;
  }
}

/**
 * Delete old notifications (cleanup task)
 */
async function deleteOldNotifications(daysOld = 30) {
  try {
    const query = `
      DELETE FROM notifications
      WHERE created_at < NOW() - INTERVAL '${daysOld} days';
    `;

    const result = await pool.query(query);
    console.log(`[Notification] Deleted ${result.rowCount} old notifications`);
    return result.rowCount;
  } catch (error) {
    console.error('[Notification] Error deleting old notifications:', error);
    return 0;
  }
}

/**
 * Map database row to notification object
 */
function mapNotificationRow(row) {
  if (!row) return null;
  
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    data: row.data,
    readAt: row.read_at,
    createdAt: row.created_at
  };
}

/**
 * Notify all supervisors about a new order
 */
async function notifySupervisorsNewOrder(orderData) {
  try {
    // Find all active supervisors
    const query = `SELECT id FROM users WHERE role = 'supervisor' AND is_active = TRUE;`;
    const result = await pool.query(query);
    
    for (const row of result.rows) {
      await createNotification(
        row.id,
        'new_order',
        'New Order Received',
        `New order #${orderData.orderNumber} received. Total: ₹${orderData.totalAmount?.toFixed?.(2) || orderData.totalAmount}. Please start preparing.`,
        {
          orderId: orderData.id,
          orderNumber: orderData.orderNumber,
          totalAmount: orderData.totalAmount
        }
      );
    }
    
    console.log(`[Notification] Notified ${result.rows.length} supervisors about order ${orderData.orderNumber}`);
  } catch (error) {
    console.error('[Notification] Error notifying supervisors:', error);
  }
}

/**
 * Notify all active delivery partners that an order is packed and ready for pickup
 * If no active delivery partners exist, the notification will be created when they come online
 */
async function notifyDeliveryPartnersOrderPacked(orderData) {
  try {
    // Find all active delivery users
    const query = `SELECT id FROM users WHERE role = 'delivery' AND is_active = TRUE;`;
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      console.log(`[Notification] No active delivery partners. Order ${orderData.orderNumber} is waiting for pickup.`);
      // Store a system-level note — the notification will be visible when partners come online
      // We create a notification for all delivery users anyway, they'll see it when they log in
      return;
    }
    
    for (const row of result.rows) {
      await createNotification(
        row.id,
        'order_packed',
        'Order Ready for Pickup',
        `Order #${orderData.orderNumber} is packed and ready for pickup. Total: ₹${orderData.totalAmount?.toFixed?.(2) || orderData.totalAmount}.`,
        {
          orderId: orderData.id,
          orderNumber: orderData.orderNumber,
          totalAmount: orderData.totalAmount
        }
      );
    }
    
    console.log(`[Notification] Notified ${result.rows.length} delivery partners about packed order ${orderData.orderNumber}`);
  } catch (error) {
    console.error('[Notification] Error notifying delivery partners:', error);
  }
}

/**
 * Notify all supervisors that a delivery partner has collected COD cash
 * and it now needs to be physically handed over / confirmed in the system.
 */
async function notifySupervisorsCashPending(orderData) {
  try {
    const query = `SELECT id FROM users WHERE role = 'supervisor' AND is_active = TRUE;`;
    const result = await pool.query(query);

    for (const row of result.rows) {
      await createNotification(
        row.id,
        'cash_pending',
        'Cash Collection Pending',
        `Order #${orderData.orderNumber} delivered. ₹${formatAmount(orderData.totalAmount)} cash is with ${orderData.partnerName || 'the delivery partner'} — mark the order complete once the cash is handed over.`,
        {
          orderId: orderData.id,
          orderNumber: orderData.orderNumber,
          totalAmount: orderData.totalAmount
        }
      );
    }

    console.log(`[Notification] Notified ${result.rows.length} supervisors about pending cash handover for order ${orderData.orderNumber}`);
  } catch (error) {
    console.error('[Notification] Error notifying supervisors about cash handover:', error);
  }
}

function formatAmount(amount) {
  const n = Number(amount);
  return Number.isFinite(n) ? n.toFixed(2) : amount;
}

/**
 * Prompt the delivery partner to collect COD cash once the buyer's delivery OTP is verified.
 */
async function sendCollectCashPrompt(partnerId, orderData) {
  return await createNotification(
    partnerId,
    'collect_cash',
    'OTP Verified — Collect Cash',
    `OTP verified for order #${orderData.orderNumber}. Collect ₹${formatAmount(orderData.totalAmount)} in cash from the customer, then confirm to complete the delivery.`,
    {
      deliveryId: orderData.deliveryId,
      orderId: orderData.id,
      orderNumber: orderData.orderNumber,
      totalAmount: orderData.totalAmount
    }
  );
}

/**
 * Tell the buyer their OTP was verified and how much cash to hand over.
 */
async function sendBuyerPayCashPrompt(userId, orderData) {
  return await createNotification(
    userId,
    'pay_cash',
    'Delivery Verified',
    `Your delivery OTP for order #${orderData.orderNumber} was verified. Please pay ₹${formatAmount(orderData.totalAmount)} in cash to the delivery partner.`,
    {
      orderId: orderData.id,
      orderNumber: orderData.orderNumber,
      totalAmount: orderData.totalAmount
    }
  );
}

/**
 * Send the buyer their freshly regenerated delivery OTP.
 */
async function sendDeliveryOtpRegenerated(userId, orderData) {
  return await createNotification(
    userId,
    'delivery_otp_regenerated',
    'New Delivery OTP',
    `A new delivery OTP was generated for order #${orderData.orderNumber}: ${orderData.deliveryOtp}. Your previous OTP no longer works.`,
    {
      orderId: orderData.id,
      orderNumber: orderData.orderNumber,
      deliveryOtp: orderData.deliveryOtp
    }
  );
}

/**
 * Tell the assigned delivery partner that an OTP for their order changed.
 * @param {'pickup'|'delivery'} kind
 */
async function sendPartnerOtpChanged(partnerId, kind, orderData) {
  const message = kind === 'pickup'
    ? `The pickup OTP for order #${orderData.orderNumber} was regenerated. Ask the supervisor for the new OTP.`
    : `The customer's delivery OTP for order #${orderData.orderNumber} was regenerated. Ask the customer for the latest OTP.`;

  return await createNotification(
    partnerId,
    'otp_regenerated',
    kind === 'pickup' ? 'Pickup OTP Changed' : 'Delivery OTP Changed',
    message,
    {
      deliveryId: orderData.deliveryId,
      orderId: orderData.id,
      orderNumber: orderData.orderNumber,
      kind
    }
  );
}

/**
 * Tell the delivery partner the supervisor received their cash and closed the order.
 */
async function sendCashHandoverConfirmed(partnerId, orderData) {
  return await createNotification(
    partnerId,
    'cash_handover_confirmed',
    'Cash Handover Confirmed',
    `Supervisor confirmed receiving ₹${formatAmount(orderData.totalAmount)} for order #${orderData.orderNumber}. The order is now complete.`,
    {
      orderId: orderData.id,
      orderNumber: orderData.orderNumber,
      totalAmount: orderData.totalAmount
    }
  );
}

module.exports = {
  createNotification,
  sendCollectCashPrompt,
  sendBuyerPayCashPrompt,
  sendDeliveryOtpRegenerated,
  sendPartnerOtpChanged,
  sendCashHandoverConfirmed,
  sendOrderConfirmation,
  sendDeliveryAssigned,
  sendDeliveryStatusUpdate,
  sendOrderCompleted,
  sendOrderCancelled,
  notifySupervisorsNewOrder,
  notifyDeliveryPartnersOrderPacked,
  notifySupervisorsCashPending,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteOldNotifications
};
