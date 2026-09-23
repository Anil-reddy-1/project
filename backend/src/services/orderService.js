const pool = require('../config/db');
const orderModel = require('../models/orderModel');
const cartModel = require('../models/cartModel');
const addressModel = require('../models/addressModel');
const stockModel = require('../models/stockModel');
const userModel = require('../models/userModel');
const notificationService = require('./notificationService');
const { NotFoundError, BadRequestError, ForbiddenError, ConflictError } = require('../utils/error');

/**
 * Order Business Logic Service
 * Handles order creation, validation, stock deduction, and order management
 */

/**
 * Place a new order from user's cart
 * - Validates cart is not empty
 * - Validates address exists
 * - Validates stock availability
 * - Creates order with order items
 * - Deducts stock
 * - Clears cart
 * - Returns order details
 */
async function placeOrder(userId, firebaseUid, { addressId, paymentMethod = 'COD', notes }) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Get user's cart
    const cartItems = await cartModel.getUserCart(userId);
    
    if (!cartItems || cartItems.length === 0) {
      throw new BadRequestError('Cart is empty. Please add items to cart before placing order.');
    }
    
    // 2. Validate address exists and belongs to user
    const address = await addressModel.getAddressById(addressId, userId);
    
    if (!address) {
      throw new NotFoundError('Delivery address not found or does not belong to user.', 'Address');
    }
    
    // 3. Prepare items for stock validation
    const itemsToValidate = cartItems.map(item => ({
      productId: item.product.id,
      quantity: item.quantity
    }));
    
    // 4. Validate stock availability
    const stockValidation = await stockModel.validateStockAvailability(itemsToValidate);
    
    const unavailableItems = stockValidation.filter(item => !item.available);
    
    if (unavailableItems.length > 0) {
      const errorDetails = unavailableItems.map(item => 
        `${item.productName}: ${item.reason} (Available: ${item.availableQuantity}, Requested: ${item.requestedQuantity})`
      ).join('; ');
      
      throw new BadRequestError(`Stock not available for some items: ${errorDetails}`);
    }
    
    // 5. Calculate total amount
    let totalAmount = 0;
    const orderItemsData = [];
    
    for (const cartItem of cartItems) {
      const itemTotal = parseFloat(cartItem.product.price) * cartItem.quantity;
      totalAmount += itemTotal;
      
      orderItemsData.push({
        productId: cartItem.product.id,
        productName: cartItem.product.name,
        productSku: cartItem.product.sku,
        quantity: cartItem.quantity,
        unitPrice: parseFloat(cartItem.product.price),
        totalPrice: itemTotal
      });
    }
    
    // 6. Create order
    const orderData = {
      userId,
      firebaseUid,
      totalAmount,
      paymentMethod: paymentMethod || 'COD',
      paymentStatus: 'pending',
      orderStatus: 'confirmed', // Set to confirmed immediately for COD
      deliveryAddress: {
        name: address.name,
        phone: address.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode
      },
      notes: notes || null
    };
    
    const order = await orderModel.createOrder(orderData, orderItemsData, client);
    
    // 7. Deduct stock for each item
    for (const item of orderItemsData) {
      await stockModel.deductStock(
        item.productId,
        item.quantity,
        `Order ${order.orderNumber}`,
        order.id,
        client
      );
    }
    
    // 8. Clear user's cart
    await client.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
    
    await client.query('COMMIT');
    
    // 9. Send order confirmation notification (non-blocking)
    notificationService.sendOrderConfirmation(userId, order).catch(err => {
      console.error('Failed to send order confirmation notification:', err);
    });
    
    return order;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get order details with permission check
 * - Admins can view any order
 * - Buyers can only view their own orders
 */
async function getOrderDetails(orderId, userId, userRole) {
  const order = await orderModel.findOrderById(orderId);
  
  if (!order) {
    throw new NotFoundError(`Order with ID '${orderId}' not found.`, 'Order');
  }
  
  // Permission check: admin can view all, buyer can only view own
  if (userRole !== 'admin' && order.userId !== userId) {
    throw new ForbiddenError('You do not have permission to view this order.');
  }
  
  return order;
}

/**
 * Get order by order number with permission check
 */
async function getOrderByNumber(orderNumber, userId, userRole) {
  const order = await orderModel.findOrderByOrderNumber(orderNumber);
  
  if (!order) {
    throw new NotFoundError(`Order with number '${orderNumber}' not found.`, 'Order');
  }
  
  // Permission check
  if (userRole !== 'admin' && order.userId !== userId) {
    throw new ForbiddenError('You do not have permission to view this order.');
  }
  
  return order;
}

/**
 * Get user's orders with pagination and filters
 */
async function getUserOrders(userId, { page = 1, limit = 20, status, dateFrom, dateTo } = {}) {
  return await orderModel.findOrdersByUserId(userId, {
    page: parseInt(page, 10) || 1,
    limit: Math.min(100, parseInt(limit, 10) || 20),
    status,
    dateFrom,
    dateTo
  });
}

/**
 * Get all orders (admin only) with pagination and filters
 */
async function getAllOrders({ page = 1, limit = 20, status, paymentStatus, dateFrom, dateTo, search } = {}) {
  return await orderModel.findAllOrders({
    page: parseInt(page, 10) || 1,
    limit: Math.min(100, parseInt(limit, 10) || 20),
    status,
    paymentStatus,
    dateFrom,
    dateTo,
    search
  });
}

/**
 * Update order status (admin only)
 * Validates status transitions
 */
async function updateOrderStatus(orderId, newStatus, userId, userRole, notes = null) {
  // Only admins can update order status
  if (userRole !== 'admin') {
    throw new ForbiddenError('Only administrators can update order status.');
  }
  
  const order = await orderModel.findOrderById(orderId);
  
  if (!order) {
    throw new NotFoundError(`Order with ID '${orderId}' not found.`, 'Order');
  }
  
  // Validate status transition
  const validStatuses = ['pending', 'confirmed', 'assigned', 'delivered', 'completed', 'cancelled'];
  
  if (!validStatuses.includes(newStatus)) {
    throw new BadRequestError(`Invalid order status. Valid statuses: ${validStatuses.join(', ')}`);
  }
  
  // Business rules for status transitions
  const currentStatus = order.orderStatus;
  
  // Can't change completed or cancelled orders
  if (currentStatus === 'completed' || currentStatus === 'cancelled') {
    throw new BadRequestError(`Cannot change status of ${currentStatus} orders.`);
  }
  
  // Can't go backwards in status (except cancellation)
  const statusOrder = {
    'pending': 0,
    'confirmed': 1,
    'assigned': 2,
    'delivered': 3,
    'completed': 4,
    'cancelled': -1
  };
  
  if (newStatus !== 'cancelled' && statusOrder[newStatus] < statusOrder[currentStatus]) {
    throw new BadRequestError(`Cannot change order status from ${currentStatus} to ${newStatus}.`);
  }
  
  // Update order status
  const updatedOrder = await orderModel.updateOrderStatus(orderId, newStatus, notes);
  
  return updatedOrder;
}

/**
 * Cancel order
 * - Can only cancel if order is pending or confirmed
 * - Restores stock
 */
async function cancelOrder(orderId, userId, userRole, reason) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const order = await orderModel.findOrderById(orderId);
    
    if (!order) {
      throw new NotFoundError(`Order with ID '${orderId}' not found.`, 'Order');
    }
    
    // Permission check: user can cancel own orders, admin can cancel any
    if (userRole !== 'admin' && order.userId !== userId) {
      throw new ForbiddenError('You do not have permission to cancel this order.');
    }
    
    // Can only cancel pending or confirmed orders
    if (!['pending', 'confirmed'].includes(order.orderStatus)) {
      throw new BadRequestError(`Cannot cancel order with status '${order.orderStatus}'. Only pending or confirmed orders can be cancelled.`);
    }
    
    // Restore stock for each item
    for (const item of order.items) {
      await stockModel.restoreStock(
        item.productId,
        item.quantity,
        `Order ${order.orderNumber} cancelled: ${reason}`,
        order.id,
        client
      );
    }
    
    // Update order status to cancelled
    await client.query(
      `UPDATE orders SET order_status = 'cancelled', notes = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [`Cancelled: ${reason}`, orderId]
    );
    
    await client.query('COMMIT');
    
    return await orderModel.findOrderById(orderId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get user order statistics
 */
async function getUserOrderStatistics(userId) {
  return await orderModel.getUserOrderStats(userId);
}

/**
 * Validate order before placement
 * Returns validation errors if any
 */
async function validateOrderPlacement(userId, addressId) {
  const errors = [];
  
  // Check cart
  const cartItems = await cartModel.getUserCart(userId);
  if (!cartItems || cartItems.length === 0) {
    errors.push('Cart is empty');
  }
  
  // Check address
  const address = await addressModel.getAddressById(addressId, userId);
  if (!address) {
    errors.push('Invalid delivery address');
  }
  
  // Check stock
  if (cartItems && cartItems.length > 0) {
    const itemsToValidate = cartItems.map(item => ({
      productId: item.product.id,
      quantity: item.quantity
    }));
    
    const stockValidation = await stockModel.validateStockAvailability(itemsToValidate);
    const unavailableItems = stockValidation.filter(item => !item.available);
    
    if (unavailableItems.length > 0) {
      unavailableItems.forEach(item => {
        errors.push(`${item.productName}: ${item.reason}`);
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  placeOrder,
  getOrderDetails,
  getOrderByNumber,
  getUserOrders,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
  getUserOrderStatistics,
  validateOrderPlacement
};
