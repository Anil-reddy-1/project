const { success, created, paginated } = require('../utils/response');
const { NotFoundError } = require('../utils/error');
const orderModel = require('../models/orderModel');
const deliveryModel = require('../models/deliveryModel');
const logger = require('../utils/logger');

/**
 * Order Management Controller
 */

async function getAllOrders(req, res, next) {
  try {
    const { page = 1, limit = 20, status, dateFrom, dateTo } = req.validatedQuery;

    const { orders, total } = await orderModel.findAllOrders({
      page,
      limit,
      status,
      dateFrom,
      dateTo,
    });

    return paginated(res, {
      data: orders.map(order => ({
        id: order.id,
        customer: {
          id: order.customerId,
          name: order.customerName,
          email: order.customerEmail,
        },
        totalAmount: order.totalAmount,
        status: order.status,
        paymentStatus: order.paymentStatus,
        deliveryStatus: order.deliveryStatus,
        createdAt: order.createdAt,
      })),
      page,
      limit,
      total,
      message: 'Orders retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
}

async function getOrderById(req, res, next) {
  try {
    const { id } = req.params;

    const order = await orderModel.findOrderById(id);
    if (!order) {
      throw new NotFoundError('Order not found', 'Order');
    }

    return success(res, {
      data: {
        id: order.id,
        customer: {
          id: order.customerId,
          name: order.customerName,
          email: order.customerEmail,
        },
        totalAmount: order.totalAmount,
        status: order.status,
        paymentStatus: order.paymentStatus,
        deliveryStatus: order.deliveryStatus,
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function createOrder(req, res, next) {
  try {
    const { customerId, customerName, customerEmail, items, deliveryAddress } = req.validatedBody;

    // Calculate total (in real scenario, validate items exist and get prices)
    let totalAmount = 0;
    items.forEach(item => {
      totalAmount += item.quantity * 100; // Placeholder: 100 per item
    });

    const order = await orderModel.createOrder({
      customerId,
      customerName,
      customerEmail,
      totalAmount,
      deliveryAddress,
    });

    logger.info(`Order created: ${order.id}`);

    return created(res, {
      data: {
        id: order.id,
        customer: {
          name: order.customerName,
          email: order.customerEmail,
        },
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt,
      },
      message: 'Order created successfully',
    });
  } catch (error) {
    next(error);
  }
}

async function updateOrderStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, notes } = req.validatedBody;

    const order = await orderModel.findOrderById(id);
    if (!order) {
      throw new NotFoundError('Order not found', 'Order');
    }

    const updated = await orderModel.updateOrderStatus(id, status, notes);

    logger.info(`Order status updated: ${id} -> ${status}`);

    return success(res, {
      data: {
        id: updated.id,
        status: updated.status,
        updatedAt: updated.updatedAt,
      },
      message: 'Order status updated successfully',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
};
