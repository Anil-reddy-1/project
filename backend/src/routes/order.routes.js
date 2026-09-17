const express = require('express');
const router = express.Router();
const orderController = require('../controller/orderController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rolePermission');
const { validateRequest, validateQuery, schemas, querySchemas } = require('../middleware/validateRequest');

/**
 * Order Routes
 * Base path: /api/v1/orders
 */

// GET /orders - Get all orders
router.get(
  '/',
  authenticate,
  requirePermission('orders', 'view'),
  validateQuery(querySchemas.orderFilter),
  orderController.getAllOrders
);

// GET /orders/:id - Get order by ID
router.get(
  '/:id',
  authenticate,
  requirePermission('orders', 'view'),
  orderController.getOrderById
);

// POST /orders - Create new order
router.post(
  '/',
  authenticate,
  requirePermission('orders', 'create'),
  validateRequest(schemas.createOrder),
  orderController.createOrder
);

// PATCH /orders/:id/status - Update order status
router.patch(
  '/:id/status',
  authenticate,
  requirePermission('orders', 'update'),
  validateRequest(schemas.updateOrderStatus),
  orderController.updateOrderStatus
);

module.exports = router;
