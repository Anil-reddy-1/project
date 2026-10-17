const pool = require('../config/db');
const deliveryModel = require('../models/deliveryModel');
const orderModel = require('../models/orderModel');
const userModel = require('../models/userModel');
const notificationService = require('./notificationService');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/error');
const {
  PICKUP_OTP_TTL_MS,
  DELIVERY_OTP_TTL_MS,
  generateOtp,
  isExpired,
  needsNewOtp,
} = require('../utils/otp');

/**
 * COD orders that haven't been paid online require the partner to collect cash at the door.
 */
function orderNeedsCashCollection(order) {
  const method = (order.paymentMethod || '').toLowerCase();
  const isCOD = method.includes('cod') || method.includes('cash');
  const isPaid = (order.paymentStatus || '').toLowerCase() === 'paid';
  return isCOD && !isPaid;
}

/**
 * Validate the buyer's delivery OTP entered by the delivery partner at the door.
 */
function assertValidDeliveryOtp(order, otp) {
  if (!order.deliveryOtp) {
    throw new BadRequestError('No active delivery OTP for this order. Ask the customer or supervisor to regenerate it.');
  }
  if (!otp) {
    throw new BadRequestError('Buyer Delivery OTP is required to complete delivery');
  }
  if (isExpired(order.deliveryOtpExpiresAt)) {
    throw new BadRequestError('Delivery OTP has expired. Ask the customer to regenerate it from their order page.');
  }
  if (order.deliveryOtp !== String(otp).trim()) {
    throw new BadRequestError('Invalid Buyer Delivery OTP. Please verify with the customer and try again.');
  }
}

/**
 * Move the order to 'assigned' and issue its OTPs: the pickup OTP (supervisor → partner)
 * and the buyer's delivery OTP, so the buyer already has it when the partner arrives.
 * Still-valid OTPs are kept so a reassignment doesn't invalidate codes already shared.
 * Returns the buyer's active delivery OTP.
 */
async function assignOrderAndIssueOtps(order, client) {
  const newPickupOtp = needsNewOtp(order.pickupOtp, order.pickupOtpExpiresAt) ? generateOtp() : null;
  const newDeliveryOtp =
    !order.deliveryOtpVerifiedAt && needsNewOtp(order.deliveryOtp, order.deliveryOtpExpiresAt)
      ? generateOtp()
      : null;

  const generated = [newPickupOtp && 'Pickup OTP', newDeliveryOtp && 'Buyer delivery OTP'].filter(Boolean);
  const note = generated.length ? `Order assigned. ${generated.join(' and ')} generated.` : null;

  await client.query(
    `UPDATE orders
     SET order_status = 'assigned',
         pickup_otp = COALESCE($1, pickup_otp),
         pickup_otp_expires_at = COALESCE($2, pickup_otp_expires_at),
         delivery_otp = COALESCE($3, delivery_otp),
         delivery_otp_expires_at = COALESCE($4, delivery_otp_expires_at),
         notes = CASE WHEN $5::text IS NULL THEN notes ELSE COALESCE(notes || E'\\n', '') || $5::text END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $6`,
    [
      newPickupOtp,
      newPickupOtp ? new Date(Date.now() + PICKUP_OTP_TTL_MS) : null,
      newDeliveryOtp,
      newDeliveryOtp ? new Date(Date.now() + DELIVERY_OTP_TTL_MS) : null,
      note,
      order.id,
    ]
  );

  return newDeliveryOtp || order.deliveryOtp;
}

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
    
    const order = await orderModel.findOrderById(delivery.orderId);
    if (!order) {
      throw new NotFoundError('Order not found', 'Order');
    }

    // Assign delivery
    const updatedDelivery = await deliveryModel.assignDeliveryPartner(deliveryId, partnerId, client);

    // Sync order status to 'assigned' and issue pickup + buyer delivery OTPs
    const deliveryOtp = await assignOrderAndIssueOtps(order, client);

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
    
    // 2. Notify buyer about assignment, including their delivery OTP
    notificationService.sendDeliveryStatusUpdate(order.userId, 'assigned', {
      id: deliveryId,
      orderId: delivery.orderId,
      orderNumber: order.orderNumber,
      deliveryOtp
    }).catch(err => console.error('Failed to send delivery status notification:', err));

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

    // Sync order status and issue OTPs. A direct assignment can happen before the order
    // was packed (the step that normally generates the pickup OTP), so both OTPs are
    // ensured here.
    const deliveryOtp = await assignOrderAndIssueOtps(order, client);

    // Status history
    await deliveryModel.createStatusHistory(
      delivery.id, 'assigned', adminId,
      `Assigned to ${partner.name || partner.email}`, client
    );

    await client.query('COMMIT');

    // Non-blocking notifications
    notificationService.sendDeliveryAssigned(partnerId, {
      id: delivery.id, orderId,
      orderNumber: order.orderNumber,
      customerName: delivery.customerName,
      deliveryAddress: delivery.deliveryAddress
    }).catch(err => console.error('Notification error:', err));

    notificationService.sendDeliveryStatusUpdate(order.userId, 'assigned', {
      id: delivery.id,
      orderId,
      orderNumber: order.orderNumber,
      deliveryOtp
    }).catch(err => console.error('Failed to send delivery status notification:', err));

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

    // Verify supervisor pickup OTP if one was generated
    if (order.pickupOtp) {
      if (!otp) {
        throw new BadRequestError('Pickup OTP is required to start delivery');
      }
      if (isExpired(order.pickupOtpExpiresAt)) {
        throw new BadRequestError('Pickup OTP has expired. Please ask the supervisor to regenerate it.');
      }
      if (order.pickupOtp !== otp.trim()) {
        throw new BadRequestError('Invalid Pickup OTP');
      }
    }

    // Check current status
    if (delivery.status !== 'accepted') {
      throw new BadRequestError(`Cannot start delivery with status '${delivery.status}'. Only accepted deliveries can be started.`);
    }

    // The buyer's delivery OTP is normally issued at assignment — keep it so the code the
    // buyer already has stays valid. Only issue a new one if it's missing or expired.
    const reuseDeliveryOtp = !needsNewOtp(order.deliveryOtp, order.deliveryOtpExpiresAt);
    const deliveryOtp = reuseDeliveryOtp ? order.deliveryOtp : generateOtp();
    const deliveryOtpExpiresAt = reuseDeliveryOtp
      ? order.deliveryOtpExpiresAt
      : new Date(Date.now() + DELIVERY_OTP_TTL_MS);

    // Update order: clear pickup OTP, ensure buyer delivery OTP, update status to in_transit
    await client.query(
      `UPDATE orders
       SET pickup_otp = NULL,
           pickup_otp_expires_at = NULL,
           delivery_otp = $1,
           delivery_otp_expires_at = $2,
           order_status = 'in_transit',
           notes = COALESCE(notes || E'\n', '') || $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [
        deliveryOtp,
        deliveryOtpExpiresAt,
        reuseDeliveryOtp
          ? 'Order picked up by delivery partner.'
          : 'Order picked up by delivery partner. Buyer delivery OTP generated.',
        delivery.orderId
      ]
    );

    // Update delivery to in_transit
    const updatedDelivery = await deliveryModel.updateDeliveryStatus(
      deliveryId,
      'in_transit',
      partnerId,
      notes || 'Delivery started / Order picked up',
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

    // Notify buyer with the delivery verification OTP
    notificationService.sendDeliveryStatusUpdate(order.userId, 'in_transit', {
      id: deliveryId,
      orderId: delivery.orderId,
      orderNumber: order.orderNumber,
      deliveryOtp
    }).catch(err => console.error('Failed to send pickup notification:', err));
    
    return updatedDelivery;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Verify the buyer's delivery OTP at the door (delivery partner)
 * - Prepaid orders: the delivery is completed right away.
 * - COD orders: the OTP is marked verified and the delivery stays in transit; the partner
 *   (and buyer) are notified that ₹X cash must now be collected. The partner then calls
 *   completeDelivery with cashCollected = true.
 */
async function verifyDeliveryOtp(deliveryId, partnerId, otp) {
  const delivery = await deliveryModel.findDeliveryById(deliveryId);

  if (!delivery) {
    throw new NotFoundError('Delivery not found', 'Delivery');
  }
  if (delivery.deliveryPartnerId !== partnerId) {
    throw new ForbiddenError('This delivery is not assigned to you');
  }
  if (delivery.status !== 'in_transit') {
    throw new BadRequestError(`Cannot verify OTP for a delivery with status '${delivery.status}'. Only in-transit deliveries can be verified.`);
  }

  const order = await orderModel.findOrderById(delivery.orderId);
  if (!order) {
    throw new NotFoundError('Order not found', 'Order');
  }

  // Nothing to collect — verifying the OTP is the last step of the delivery.
  if (!orderNeedsCashCollection(order)) {
    const completed = await completeDelivery(deliveryId, partnerId, null, otp, false);
    return { delivery: completed, otpVerified: true, needsCashCollection: false, delivered: true };
  }

  const result = { otpVerified: true, needsCashCollection: true, delivered: false, amount: order.totalAmount };

  // Already verified (e.g. the partner refreshed the page) — don't re-notify.
  if (order.deliveryOtpVerifiedAt) {
    return { ...result, delivery };
  }

  assertValidDeliveryOtp(order, otp);

  const update = await pool.query(
    `UPDATE orders
     SET delivery_otp_verified_at = CURRENT_TIMESTAMP,
         delivery_otp = NULL,
         delivery_otp_expires_at = NULL,
         notes = COALESCE(notes || E'\n', '') || $1,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2 AND delivery_otp_verified_at IS NULL
     RETURNING id;`,
    ['Buyer delivery OTP verified. Awaiting cash collection.', order.id]
  );

  if (update.rowCount > 0) {
    await deliveryModel.createStatusHistory(
      deliveryId,
      'in_transit',
      partnerId,
      `Buyer OTP verified — collecting ₹${order.totalAmount} cash`,
      pool
    );

    const notifyData = {
      id: order.id,
      deliveryId,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
    };
    notificationService.sendCollectCashPrompt(partnerId, notifyData)
      .catch(err => console.error('Failed to send collect-cash prompt:', err));
    notificationService.sendBuyerPayCashPrompt(order.userId, notifyData)
      .catch(err => console.error('Failed to send pay-cash prompt to buyer:', err));
  }

  return { ...result, delivery };
}

/**
 * Complete delivery (delivery partner)
 * - Requires the buyer OTP to be verified (either earlier via verifyDeliveryOtp, or in
 *   this call via `otp`)
 * - COD orders require the partner to confirm the cash was collected
 * - Mark delivery as delivered
 * - Updates status from 'in_transit' to 'delivered'
 * - Syncs order status to 'delivered'
 */
async function completeDelivery(deliveryId, partnerId, notes = null, otp = null, cashCollected = false) {
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

    // Fetch associated order to verify buyer delivery OTP
    const order = await orderModel.findOrderById(delivery.orderId);
    if (!order) {
      throw new NotFoundError('Order not found', 'Order');
    }

    // Verify OTP between buyer and delivery partner (unless already verified at the door)
    if (!order.deliveryOtpVerifiedAt) {
      assertValidDeliveryOtp(order, otp);
    }

    // Cash-on-delivery orders that haven't been paid online require the partner
    // to explicitly confirm they collected the cash from the buyer.
    const needsCashCollection = orderNeedsCashCollection(order);

    if (needsCashCollection && !cashCollected) {
      throw new BadRequestError('Please confirm you have collected the cash from the customer before completing this delivery.');
    }

    // Update to delivered
    const updatedDelivery = await deliveryModel.updateDeliveryStatus(
      deliveryId,
      'delivered',
      partnerId,
      notes || 'Delivery completed',
      client
    );

    // Sync order status to delivered, clear delivery_otp
    await client.query(
      `UPDATE orders
       SET order_status = 'delivered',
           delivery_otp = NULL,
           delivery_otp_expires_at = NULL,
           delivery_otp_verified_at = COALESCE(delivery_otp_verified_at, CURRENT_TIMESTAMP),
           notes = COALESCE(notes || E'\n', '') || $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [
        needsCashCollection
          ? 'Delivered with buyer OTP verification. Cash collected by delivery partner — awaiting handover.'
          : 'Delivery completed with buyer OTP verification.',
        delivery.orderId
      ]
    );

    // Cash is now with the delivery partner — keep the order in a distinct
    // "pending cash handover" state until a supervisor confirms receipt.
    if (needsCashCollection) {
      await orderModel.markCashPendingHandover(delivery.orderId, client);
    }

    // Create status history
    await deliveryModel.createStatusHistory(
      deliveryId,
      'delivered',
      partnerId,
      notes || 'Delivery completed successfully with buyer OTP verification',
      client
    );

    await client.query('COMMIT');

    // Send notification to buyer (non-blocking)
    notificationService.sendDeliveryStatusUpdate(order.userId, 'delivered', {
      id: deliveryId,
      orderId: delivery.orderId,
      orderNumber: order.orderNumber
    }).catch(err => console.error('Failed to send delivery completed notification:', err));

    // Notify supervisors that cash needs to be collected from this partner (non-blocking)
    if (needsCashCollection) {
      userModel.findUserById(partnerId)
        .catch(() => null)
        .then(partner => notificationService.notifySupervisorsCashPending({
          id: order.id,
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          partnerName: partner?.name || partner?.email,
        }))
        .catch(err => console.error('Failed to notify supervisors about pending cash handover:', err));
    }

    return { ...updatedDelivery, cashHandoverStatus: needsCashCollection ? 'pending' : null };
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
async function updateDeliveryStatus(deliveryId, newStatus, userId, userRole, notes = null, otp = null) {
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

    const order = await orderModel.findOrderById(delivery.orderId);

    // If transitioning to in_transit, generate buyer delivery OTP if not already set
    let generatedDeliveryOtp = null;
    if (newStatus === 'in_transit' && order) {
      generatedDeliveryOtp = order.deliveryOtp || String(Math.floor(100000 + Math.random() * 900000));
      const otpExpires = order.deliveryOtpExpiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000);
      await client.query(
        `UPDATE orders 
         SET pickup_otp = NULL, 
             pickup_otp_expires_at = NULL,
             delivery_otp = $1, 
             delivery_otp_expires_at = $2,
             order_status = 'in_transit',
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $3`,
        [generatedDeliveryOtp, otpExpires, delivery.orderId]
      );
    }

    // If transitioning to delivered, verify buyer delivery OTP
    if (newStatus === 'delivered' && order && userRole !== 'admin') {
      if (order.deliveryOtp) {
        if (!otp) {
          throw new BadRequestError('Buyer Delivery OTP is required to complete delivery');
        }
        if (order.deliveryOtpExpiresAt && new Date(order.deliveryOtpExpiresAt) < new Date()) {
          throw new BadRequestError('Delivery OTP has expired. Please contact support.');
        }
        if (order.deliveryOtp !== otp.trim()) {
          throw new BadRequestError('Invalid Buyer Delivery OTP. Please verify with the customer and try again.');
        }
      }
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
    let orderStatus = null;
    if (newStatus === 'assigned') {
      orderStatus = 'assigned';
    } else if (newStatus === 'delivered') {
      orderStatus = 'delivered';
      await client.query(
        `UPDATE orders 
         SET order_status = 'delivered', 
             delivery_otp = NULL, 
             delivery_otp_expires_at = NULL, 
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [delivery.orderId]
      );
    }
    
    if (orderStatus && newStatus !== 'delivered') {
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

    if (newStatus === 'in_transit' && order && generatedDeliveryOtp) {
      notificationService.sendDeliveryStatusUpdate(order.userId, 'in_transit', {
        id: deliveryId,
        orderId: delivery.orderId,
        orderNumber: order.orderNumber,
        deliveryOtp: generatedDeliveryOtp
      }).catch(err => console.error('Failed to send pickup notification:', err));
    } else if (newStatus === 'delivered' && order) {
      notificationService.sendDeliveryStatusUpdate(order.userId, 'delivered', {
        id: deliveryId,
        orderId: delivery.orderId,
        orderNumber: order.orderNumber
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
 * Get delivery details with permission check
 * Includes order items, total amount, payment info for delivery partner
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
  
  // Fetch associated order with items for delivery partner visibility
  let orderDetails = {};
  try {
    const orderQuery = `
      SELECT
        o.id, o.order_number, o.total_amount,
        o.payment_method, o.payment_status, o.order_status, o.notes as order_notes,
        o.cash_handover_status, o.cash_handover_at, o.delivery_otp_verified_at
      FROM orders o
      WHERE o.id = $1
    `;
    const orderResult = await pool.query(orderQuery, [delivery.orderId]);
    
    if (orderResult.rows.length > 0) {
      const orderRow = orderResult.rows[0];
      
      // Fetch order items
      const itemsQuery = `
        SELECT 
          oi.id, oi.product_id, oi.product_name, oi.product_sku,
          oi.quantity, oi.unit_price, oi.total_price
        FROM order_items oi
        WHERE oi.order_id = $1
        ORDER BY oi.created_at ASC
      `;
      const itemsResult = await pool.query(itemsQuery, [delivery.orderId]);
      
      orderDetails = {
        orderNumber: orderRow.order_number,
        totalAmount: parseFloat(orderRow.total_amount),
        paymentMethod: orderRow.payment_method,
        paymentStatus: orderRow.payment_status,
        orderStatus: orderRow.order_status,
        orderNotes: orderRow.order_notes,
        cashHandoverStatus: orderRow.cash_handover_status || null,
        cashHandoverAt: orderRow.cash_handover_at || null,
        deliveryOtpVerifiedAt: orderRow.delivery_otp_verified_at || null,
        orderItems: itemsResult.rows.map(item => ({
          id: item.id,
          productId: item.product_id,
          productName: item.product_name,
          productSku: item.product_sku,
          quantity: item.quantity,
          unitPrice: parseFloat(item.unit_price),
          totalPrice: parseFloat(item.total_price),
        })),
      };
    }
  } catch (err) {
    // Non-critical — delivery still works without order details
    console.error('[DeliveryService] Error fetching order details:', err.message);
  }
  
  return {
    ...delivery,
    ...orderDetails,
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
      COUNT(d.id) FILTER (WHERE ${deliveryModel.SUCCESSFUL_DELIVERY_SQL}) as completed_deliveries
    FROM users u
    LEFT JOIN deliveries d ON u.id = d.delivery_partner_id
    LEFT JOIN orders o ON o.id = d.order_id
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
  verifyDeliveryOtp,
  completeDelivery,
  updateDeliveryStatus,
  getDeliveryDetails,
  getPartnerDeliveries,
  getAllDeliveries,
  getPendingDeliveries,
  getPartnerStatistics,
  getAvailablePartners
};
