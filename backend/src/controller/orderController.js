const orderService = require('../services/orderService');
const logger = require('../utils/logger');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/error');

/**
 * Order Controller
 * Handles order management endpoints
 */

/**
 * Place a new order from cart
 * POST /api/v1/orders
 * Body: { addressId, paymentMethod, notes }
 */
async function createOrder(req, res, next) {
  try {
    const userId = req.user.dbId;
    const firebaseUid = req.user.uid;
    const { addressId, paymentMethod, notes } = req.body;
    
    // Validate input
    if (!addressId) {
      throw new BadRequestError('Delivery address ID is required');
    }
    
    // Place order
    const order = await orderService.placeOrder(userId, firebaseUid, {
      addressId,
      paymentMethod: paymentMethod || 'COD',
      notes
    });
    
    logger.info('Order created successfully', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      userId,
      totalAmount: order.totalAmount
    });
    
    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: {
        order
      }
    });
  } catch (error) {
    logger.error('Create order error:', {
      error: error.message,
      userId: req.user?.dbId,
      stack: error.stack
    });
    next(error);
  }
}

/**
 * Get user's orders
 * GET /api/v1/orders/me
 * Query: page, limit, status, dateFrom, dateTo
 */
async function getMyOrders(req, res, next) {
  try {
    const userId = req.user.dbId;
    const { page, limit, status, dateFrom, dateTo } = req.query;
    
    const result = await orderService.getUserOrders(userId, {
      page,
      limit,
      status,
      dateFrom,
      dateTo
    });
    
    res.status(200).json({
      success: true,
      message: 'Orders retrieved successfully',
      data: result
    });
  } catch (error) {
    logger.error('Get my orders error:', {
      error: error.message,
      userId: req.user?.dbId
    });
    next(error);
  }
}

/**
 * Get all orders (admin only)
 * GET /api/v1/orders
 * Query: page, limit, status, paymentStatus, dateFrom, dateTo, search
 */
async function getAllOrders(req, res, next) {
  try {
    const { page, limit, status, paymentStatus, dateFrom, dateTo, search } = req.query;
    
    const result = await orderService.getAllOrders({
      page,
      limit,
      status,
      paymentStatus,
      dateFrom,
      dateTo,
      search
    });
    
    res.status(200).json({
      success: true,
      message: 'All orders retrieved successfully',
      data: result
    });
  } catch (error) {
    logger.error('Get all orders error:', {
      error: error.message,
      userId: req.user?.dbId
    });
    next(error);
  }
}

/**
 * Get order by ID
 * GET /api/v1/orders/:id
 */
async function getOrderById(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.dbId;
    const userRole = req.user.role;
    
    const order = await orderService.getOrderDetails(id, userId, userRole);
    
    res.status(200).json({
      success: true,
      message: 'Order retrieved successfully',
      data: {
        order
      }
    });
  } catch (error) {
    logger.error('Get order by ID error:', {
      error: error.message,
      orderId: req.params.id,
      userId: req.user?.dbId
    });
    next(error);
  }
}

/**
 * Get order by order number
 * GET /api/v1/orders/number/:orderNumber
 */
async function getOrderByNumber(req, res, next) {
  try {
    const { orderNumber } = req.params;
    const userId = req.user.dbId;
    const userRole = req.user.role;
    
    const order = await orderService.getOrderByNumber(orderNumber, userId, userRole);
    
    res.status(200).json({
      success: true,
      message: 'Order retrieved successfully',
      data: {
        order
      }
    });
  } catch (error) {
    logger.error('Get order by number error:', {
      error: error.message,
      orderNumber: req.params.orderNumber,
      userId: req.user?.dbId
    });
    next(error);
  }
}

/**
 * Update order status (admin only)
 * PATCH /api/v1/orders/:id/status
 * Body: { status, notes }
 */
async function updateOrderStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const userId = req.user.dbId;
    const userRole = req.user.role;
    
    if (!status) {
      throw new BadRequestError('Status is required');
    }
    
    const order = await orderService.updateOrderStatus(id, status, userId, userRole, notes);
    
    logger.info('Order status updated', {
      orderId: id,
      newStatus: status,
      updatedBy: userId
    });
    
    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: {
        order
      }
    });
  } catch (error) {
    logger.error('Update order status error:', {
      error: error.message,
      orderId: req.params.id,
      userId: req.user?.dbId
    });
    next(error);
  }
}

/**
 * Cancel order
 * POST /api/v1/orders/:id/cancel
 * Body: { reason }
 */
async function cancelOrder(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.dbId;
    const userRole = req.user.role;
    
    if (!reason) {
      throw new BadRequestError('Cancellation reason is required');
    }
    
    const order = await orderService.cancelOrder(id, userId, userRole, reason);
    
    logger.info('Order cancelled', {
      orderId: id,
      cancelledBy: userId,
      reason
    });
    
    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: {
        order
      }
    });
  } catch (error) {
    logger.error('Cancel order error:', {
      error: error.message,
      orderId: req.params.id,
      userId: req.user?.dbId
    });
    next(error);
  }
}

/**
 * Get order statistics for current user
 * GET /api/v1/orders/stats/me
 */
async function getMyOrderStats(req, res, next) {
  try {
    const userId = req.user.dbId;
    
    const stats = await orderService.getUserOrderStatistics(userId);
    
    res.status(200).json({
      success: true,
      message: 'Order statistics retrieved successfully',
      data: stats
    });
  } catch (error) {
    logger.error('Get order stats error:', {
      error: error.message,
      userId: req.user?.dbId
    });
    next(error);
  }
}

/**
 * Validate order placement (pre-checkout validation)
 * POST /api/v1/orders/validate
 * Body: { addressId }
 */
async function validateOrder(req, res, next) {
  try {
    const userId = req.user.dbId;
    const { addressId } = req.body;
    
    if (!addressId) {
      throw new BadRequestError('Address ID is required for validation');
    }
    
    const validation = await orderService.validateOrderPlacement(userId, addressId);
    
    res.status(200).json({
      success: true,
      message: 'Order validation completed',
      data: validation
    });
  } catch (error) {
    logger.error('Validate order error:', {
      error: error.message,
      userId: req.user?.dbId
    });
    next(error);
  }
}

/**
 * Mark order as preparing (supervisor only)
 * POST /api/v1/orders/:id/prepare
 */
async function markAsPreparing(req, res, next) {
  try {
    const { id } = req.params;
    const supervisorId = req.user.dbId;
    
    const order = await orderService.markAsPreparing(id, supervisorId);
    
    logger.info('Order marked as preparing', {
      orderId: id,
      supervisorId
    });
    
    res.status(200).json({
      success: true,
      message: 'Order is now being prepared',
      data: { order }
    });
  } catch (error) {
    logger.error('Mark as preparing error:', {
      error: error.message,
      orderId: req.params.id,
      userId: req.user?.dbId
    });
    next(error);
  }
}

/**
 * Mark order as packed (supervisor only)
 * Generates OTP for delivery partner verification
 * POST /api/v1/orders/:id/pack
 */
async function markAsPacked(req, res, next) {
  try {
    const { id } = req.params;
    const supervisorId = req.user.dbId;
    
    const order = await orderService.markAsPacked(id, supervisorId);
    
    logger.info('Order marked as packed, OTP generated', {
      orderId: id,
      supervisorId
    });
    
    res.status(200).json({
      success: true,
      message: 'Order packed successfully. OTP generated for delivery partner verification.',
      data: { order }
    });
  } catch (error) {
    logger.error('Mark as packed error:', {
      error: error.message,
      orderId: req.params.id,
      userId: req.user?.dbId
    });
    next(error);
  }
}

/**
 * Verify pickup OTP (delivery partner)
 * POST /api/v1/orders/:id/verify-otp
 * Body: { otp }
 */
async function verifyPickupOtp(req, res, next) {
  try {
    const { id } = req.params;
    const { otp } = req.body;
    const deliveryPartnerId = req.user.dbId;
    
    if (!otp) {
      throw new BadRequestError('OTP is required');
    }
    
    const order = await orderService.verifyPickupOtp(id, otp, deliveryPartnerId);
    
    logger.info('Pickup OTP verified', {
      orderId: id,
      deliveryPartnerId
    });
    
    res.status(200).json({
      success: true,
      message: 'OTP verified successfully. Order is ready for delivery.',
      data: { order }
    });
  } catch (error) {
    logger.error('Verify OTP error:', {
      error: error.message,
      orderId: req.params.id,
      userId: req.user?.dbId
    });
    next(error);
  }
}

module.exports = {
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  getOrderByNumber,
  updateOrderStatus,
  cancelOrder,
  getMyOrderStats,
  validateOrder,
  markAsPreparing,
  markAsPacked,
  verifyPickupOtp
};
