const pool = require('../config/db');

/**
 * Notification Service
 * Handles creation and management of user notifications
 * 
 * Currently implements in-app notifications stored in database.
 * Future enhancements: Email, SMS, Push notifications
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
    
    console.log(`[Notification] Created ${type} for user ${userId}: ${title}`);
    
    return mapNotificationRow(result.rows[0]);
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
  const messages = {
    assigned: `Your order #${deliveryData.orderNumber} has been assigned to a delivery partner.`,
    accepted: `Your delivery partner has accepted order #${deliveryData.orderNumber}.`,
    in_transit: `Your order #${deliveryData.orderNumber} is out for delivery!`,
    delivered: `Your order #${deliveryData.orderNumber} has been delivered successfully.`
  };
  
  const titles = {
    assigned: 'Order Assigned',
    accepted: 'Delivery Accepted',
    in_transit: 'Out for Delivery',
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
      WHERE user_id = $1 AND read_at IS NULL
      RETURNING COUNT(*);
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
      WHERE created_at < NOW() - INTERVAL '${daysOld} days'
      RETURNING COUNT(*);
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

module.exports = {
  createNotification,
  sendOrderConfirmation,
  sendDeliveryAssigned,
  sendDeliveryStatusUpdate,
  sendOrderCompleted,
  sendOrderCancelled,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteOldNotifications
};
