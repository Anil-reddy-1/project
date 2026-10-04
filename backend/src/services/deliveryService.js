const pool = require('../config/db');
const deliveryModel = require('../models/deliveryModel');
const orderModel = require('../models/orderModel');
const userModel = require('../models/userModel');
const notificationService = require('./notificationService');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/error');

/**
 * Delivery Business Logic Service
 * Handles delivery assignment, status updates, and workflow management
 * 
 * ORDER-DELIVERY STATUS SYNCHRONIZATION STRATEGY:
 * ================================================
 * This service maintains synchronization between delivery status and order status.
 * 
 * Delivery Status Flow:
 *   pending → assigned → accepted → in_transit → delivered
 * 
 * Order Status Sync Points:
 *   - delivery: assigned  → order: assigned   (when admin assigns partner)
 *   - delivery: delivered → order: delivered  (when partner completes delivery)
 * 
 * Note: 'accepted' and 'in_transit' are delivery-specific states that don't 
 * require order status updates. Order status reflects major customer-facing 
 * milestones: confirmed → assigned (to partner) → delivered → completed
 * 
 * All status updates are performed in database transactions to ensure consistency.
 */

/**
 * Assign delivery to a partner (admin only)
 * - Validates partner exists and has delivery role
 * - Updates delivery status to 'assigned'
 * - IMPORTANT: Syncs order status to 'assigned' (order-delivery synchronization)
 */
async function assignDelivery(deliveryId, partnerId, adminId) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get delivery
    const delivery = await deliveryModel.findDeliveryById(deliveryId);
    
    if (!delivery) {
      throw new NotFoundError('Delivery not found', 'Delivery');
    }
    
    // Check if delivery can be assigned
    if (!['pending', 'assigned'].includes(delivery.status)) {
      throw new BadRequestError(`Cannot assign delivery with status '${delivery.status}'. Only pending or assigned deliveries can be (re)assigned.`);
    }
    
    // Verify partner exists and has delivery role
    const partner = await userModel.findUserById(partnerId);
    
    if (!partner) {
      throw new NotFoundError('Delivery partner not found', 'User');
    }
    
    if (partner.role !== 'delivery') {
      throw new BadRequestError(`User is not a delivery partner. Current role: ${partner.role}`);
    }
    
    // Assign delivery
    const updatedDelivery = await deliveryModel.assignDeliveryPartner(deliveryId, partnerId, client);
    
    // Sync order status to 'assigned' (Order-Delivery Status Synchronization)
    await client.query(
      `UPDATE orders SET order_status = 'assigned', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [delivery.orderId]
    );
    
    // Create status history record
    await deliveryModel.createStatusHistory(
      deliveryId,
      'assigned',
      adminId,
      `Assigned to ${partner.name || partner.email}`,
      client
    );
    
    await client.query('COMMIT');
    
    // Send notifications (non-blocking)
    // 1. Notify delivery partner about assignment
    notificationService.sendDeliveryAssigned(partnerId, {
      id: deliveryId,
      orderId: delivery.orderId,
      orderNumber: delivery.orderNumber,
      customerName: delivery.customerName,
      deliveryAddress: delivery.deliveryAddress
    }).catch(err => console.error('Failed to send delivery assigned notification:', err));
    
    // 2. Notify buyer about assignment
    const order = await orderModel.findOrderById(delivery.orderId);
    if (order) {
      notificationService.sendDeliveryStatusUpdate(order.userId, 'assigned', {
        id: deliveryId,
        orderId: delivery.orderId,
        orderNumber: delivery.orderNumber
      }).catch(err => console.error('Failed to send delivery status notification:', err));
    }
    
    return updatedDelivery;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Assign delivery partner directly by Order ID (admin only)
 * - Finds or creates the delivery record for the order
 * - Validates partner has 'delivery' role
 * - Syncs order status to 'assigned'
 */
async function assignDeliveryToOrder(orderId, partnerId, adminId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Validate order exists and is assignable
    const order = await orderModel.findOrderById(orderId);
    if (!order) throw new NotFoundError('Order not found', 'Order');

    const assignableStatuses = ['confirmed', 'pending', 'preparing', 'packed', 'assigned'];
    if (!assignableStatuses.includes(order.orderStatus)) {
      throw new BadRequestError(
        `Cannot assign delivery to order with status '${order.orderStatus}'.`
      );
    }

    // Validate partner
    const partner = await userModel.findUserById(partnerId);
    if (!partner) throw new NotFoundError('Delivery partner not found', 'User');
    if (partner.role !== 'delivery') {
      throw new BadRequestError(`User is not a delivery partner (role: ${partner.role})`);
    }

    // Find existing delivery record, or create one
    let delivery = await deliveryModel.findDeliveryByOrderId(orderId);

    if (!delivery) {
      const addr = order.deliveryAddress || {};
      delivery = await deliveryModel.createDelivery({
        orderId,
        customerName: addr.name || order.userName || 'Customer',
        customerPhone: addr.phone || order.userPhone || '',
        deliveryAddress: addr,
        status: 'pending',
      }, client);
    }

    // Assign partner
    const updatedDelivery = await deliveryModel.assignDeliveryPartner(delivery.id, partnerId, client);

    // Sync order status
    await client.query(
      `UPDATE orders SET order_status = 'assigned', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [orderId]
    );

    // Status history
    await deliveryModel.createStatusHistory(
      delivery.id, 'assigned', adminId,
      `Assigned to ${partner.name || partner.email}`, client
    );

    await client.query('COMMIT');

    // Non-blocking notification
    notificationService.sendDeliveryAssigned(partnerId, {
      id: delivery.id, orderId,
      orderNumber: order.orderNumber,
      customerName: delivery.customerName,
      deliveryAddress: delivery.deliveryAddress
    }).catch(err => console.error('Notification error:', err));

    return updatedDelivery;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Accept delivery (delivery partner)
 * - Partner accepts the delivery assignment
 * - Updates status from 'assigned' to 'accepted'
 */
async function acceptDelivery(deliveryId, partnerId) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const delivery = await deliveryModel.findDeliveryById(deliveryId);
    
    if (!delivery) {
      throw new NotFoundError('Delivery not found', 'Delivery');
    }
    
    // Verify delivery is assigned to this partner
    if (delivery.deliveryPartnerId !== partnerId) {
      throw new ForbiddenError('This delivery is not assigned to you');
    }
    
    // Check current status
    if (delivery.status !== 'assigned') {
      throw new BadRequestError(`Cannot accept delivery with status '${delivery.status}'. Only assigned deliveries can be accepted.`);
    }
    
    // Update to accepted
    const updatedDelivery = await deliveryModel.updateDeliveryStatus(
      deliveryId,
      'accepted',
      partnerId,
      'Delivery accepted by partner',
      client
    );
    
    // Create status history
    await deliveryModel.createStatusHistory(
      deliveryId,
      'accepted',
      partnerId,
      'Delivery accepted',
      client
    );
    
    await client.query('COMMIT');
    
    return updatedDelivery;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Start delivery (delivery partner)
 * - Mark delivery as in transit
 * - Updates status from 'accepted' to 'in_transit'
 */
async function startDelivery(deliveryId, partnerId, notes = null, otp = null) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const delivery = await deliveryModel.findDeliveryById(deliveryId);
    
    if (!delivery) {
      throw new NotFoundError('Delivery not found', 'Delivery');
    }
    
    // Verify delivery is assigned to this partner
    if (delivery.deliveryPartnerId !== partnerId) {
      throw new ForbiddenError('This delivery is not assigned to you');
    }
    
    // Fetch associated order to verify pickup OTP
    const order = await orderModel.findOrderById(delivery.orderId);
    if (!order) {
      throw new NotFoundError('Order not found', 'Order');
    }

    if (!otp) {
      throw new BadRequestError('Pickup OTP is required to start delivery');
    }

    if (order.pickupOtp !== otp) {
      throw new BadRequestError('Invalid Pickup OTP');
    }
    
    // Check current status
    if (delivery.status !== 'accepted') {
      throw new BadRequestError(`Cannot start delivery with status '${delivery.status}'. Only accepted deliveries can be started.`);
    }
    
    // Update to in_transit
    const updatedDelivery = await deliveryModel.updateDeliveryStatus(
      deliveryId,
      'in_transit',
      partnerId,
      notes || 'Delivery started',
      client
    );
    
    // Create status history
    await deliveryModel.createStatusHistory(
      deliveryId,
      'in_transit',
      partnerId,
      notes || 'Out for delivery',
      client
    );
    
    await client.query('COMMIT');
    
    return updatedDelivery;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Complete delivery (delivery partner)
 * - Mark delivery as delivered
 * - Updates status from 'in_transit' to 'delivered'
 * - IMPORTANT: Syncs order status to 'delivered' (order-delivery synchronization)
 */
async function completeDelivery(deliveryId, partnerId, notes = null) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const delivery = await deliveryModel.findDeliveryById(deliveryId);
    
    if (!delivery) {
      throw new NotFoundError('Delivery not found', 'Delivery');
    }
    
    // Verify delivery is assigned to this partner
    if (delivery.deliveryPartnerId !== partnerId) {
      throw new ForbiddenError('This delivery is not assigned to you');
    }
    
    // Check current status
    if (delivery.status !== 'in_transit') {
      throw new BadRequestError(`Cannot complete delivery with status '${delivery.status}'. Only in-transit deliveries can be completed.`);
    }
    
    // Update to delivered
    const updatedDelivery = await deliveryModel.updateDeliveryStatus(
      deliveryId,
      'delivered',
      partnerId,
      notes || 'Delivery completed',
      client
    );
    
    // Sync order status to delivered (Order-Delivery Status Synchronization)
    await client.query(
      `UPDATE orders SET order_status = 'delivered', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [delivery.orderId]
    );
    
    // Create status history
    await deliveryModel.createStatusHistory(
      deliveryId,
      'delivered',
      partnerId,
      notes || 'Delivery completed successfully',
      client
    );
    
    await client.query('COMMIT');
    
    // Send notification to buyer (non-blocking)
    const order = await orderModel.findOrderById(delivery.orderId);
    if (order) {
      notificationService.sendDeliveryStatusUpdate(order.userId, 'delivered', {
        id: deliveryId,
        orderId: delivery.orderId,
        orderNumber: delivery.orderNumber
      }).catch(err => console.error('Failed to send delivery completed notification:', err));
    }
    
    return updatedDelivery;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Update delivery status (generic)
 * - Validates status transitions
 * - Updates order status accordingly
 */
async function updateDeliveryStatus(deliveryId, newStatus, userId, userRole, notes = null) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const delivery = await deliveryModel.findDeliveryById(deliveryId);
    
    if (!delivery) {
      throw new NotFoundError('Delivery not found', 'Delivery');
    }
    
    // Permission check: partner can only update own deliveries, admin can update any
    if (userRole !== 'admin' && delivery.deliveryPartnerId !== userId) {
      throw new ForbiddenError('You do not have permission to update this delivery');
    }
    
    // Validate status
    const validStatuses = ['pending', 'assigned', 'accepted', 'in_transit', 'delivered', 'failed'];
    
    if (!validStatuses.includes(newStatus)) {
      throw new BadRequestError(`Invalid delivery status. Valid statuses: ${validStatuses.join(', ')}`);
    }
    
    // Validate status transition
    const currentStatus = delivery.status;
    
    // Define allowed transitions
    const allowedTransitions = {
      'pending': ['assigned', 'failed'],
      'assigned': ['accepted', 'pending', 'failed'],
      'accepted': ['in_transit', 'failed'],
      'in_transit': ['delivered', 'failed'],
      'delivered': [], // Final state
      'failed': ['assigned'] // Can reassign failed deliveries
    };
    
    if (!allowedTransitions[currentStatus].includes(newStatus) && userRole !== 'admin') {
      throw new BadRequestError(`Cannot change delivery status from ${currentStatus} to ${newStatus}`);
    }
    
    // Update delivery status
    const updatedDelivery = await deliveryModel.updateDeliveryStatus(
      deliveryId,
      newStatus,
      userId,
      notes,
      client
    );
    
    // Update order status based on delivery status (Order-Delivery Status Synchronization)
    // Only sync major milestones to keep order status customer-focused
    let orderStatus = null;
    if (newStatus === 'assigned') {
      orderStatus = 'assigned';  // Partner assigned to delivery
    } else if (newStatus === 'delivered') {
      orderStatus = 'delivered';  // Delivery completed
    }
    // Note: 'accepted' and 'in_transit' are partner-specific states that don't update order status
    
    if (orderStatus) {
      await client.query(
        `UPDATE orders SET order_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [orderStatus, delivery.orderId]
      );
    }
    
    // Create status history
    await deliveryModel.createStatusHistory(
      deliveryId,
      newStatus,
      userId,
      notes,
      client
    );
    
    await client.query('COMMIT');
    
    return updatedDelivery;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get delivery details with permission check
 */
async function getDeliveryDetails(deliveryId, userId, userRole) {
  const delivery = await deliveryModel.findDeliveryById(deliveryId);
  
  if (!delivery) {
    throw new NotFoundError('Delivery not found', 'Delivery');
  }
  
  // Permission check: admin can view all, partner can only view own deliveries
  if (userRole !== 'admin' && delivery.deliveryPartnerId !== userId) {
    throw new ForbiddenError('You do not have permission to view this delivery');
  }
  
  // Get status history
  const history = await deliveryModel.getDeliveryStatusHistory(deliveryId);
  
  return {
    ...delivery,
    statusHistory: history
  };
}

/**
 * Get partner's deliveries
 */
async function getPartnerDeliveries(partnerId, { page = 1, limit = 20, status } = {}) {
  return await deliveryModel.findDeliveriesByPartnerId(partnerId, {
    page: parseInt(page, 10) || 1,
    limit: Math.min(100, parseInt(limit, 10) || 20),
    status
  });
}

/**
 * Get all deliveries (admin only)
 */
async function getAllDeliveries({ page = 1, limit = 20, status, partnerId, dateFrom, dateTo } = {}) {
  return await deliveryModel.findAllDeliveries({
    page: parseInt(page, 10) || 1,
    limit: Math.min(100, parseInt(limit, 10) || 20),
    status,
    partnerId,
    dateFrom,
    dateTo
  });
}

/**
 * Get pending deliveries (admin view for assignment)
 */
async function getPendingDeliveries({ page = 1, limit = 20 } = {}) {
  return await deliveryModel.findPendingDeliveries({
    page: parseInt(page, 10) || 1,
    limit: Math.min(100, parseInt(limit, 10) || 20),
    status: 'pending'
  });
}

/**
 * Get delivery statistics for partner
 */
async function getPartnerStatistics(partnerId) {
  return await deliveryModel.getPartnerDeliveryStats(partnerId);
}

/**
 * Get available delivery partners (users with delivery role)
 */
async function getAvailablePartners() {
  const query = `
    SELECT 
      u.id,
      u.firebase_uid,
      u.name,
      u.email,
      u.phone,
      COUNT(d.id) FILTER (WHERE d.status IN ('assigned', 'accepted', 'in_transit')) as active_deliveries,
      COUNT(d.id) FILTER (WHERE d.status = 'delivered') as completed_deliveries
    FROM users u
    LEFT JOIN deliveries d ON u.id = d.delivery_partner_id
    WHERE u.role = 'delivery' AND u.is_active = true
    GROUP BY u.id
    ORDER BY active_deliveries ASC, u.name ASC;
  `;
  
  const result = await pool.query(query);
  
  return result.rows.map(row => ({
    id: row.id,
    firebaseUid: row.firebase_uid,
    name: row.name,
    email: row.email,
    phone: row.phone,
    activeDeliveries: parseInt(row.active_deliveries, 10),
    completedDeliveries: parseInt(row.completed_deliveries, 10)
  }));
}

module.exports = {
  assignDelivery,
  assignDeliveryToOrder,
  acceptDelivery,
  startDelivery,
  completeDelivery,
  updateDeliveryStatus,
  getDeliveryDetails,
  getPartnerDeliveries,
  getAllDeliveries,
  getPendingDeliveries,
  getPartnerStatistics,
  getAvailablePartners
};
