const express = require('express');
const router = express.Router();
const deliveryController = require('../controller/deliveryController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rolePermission');
const { validateRequest, validateQuery, schemas, querySchemas } = require('../middleware/validateRequest');

/**
 * Delivery Routes
 * Base path: /api/v1/deliveries
 */

// GET /deliveries - Get all deliveries
router.get(
  '/',
  authenticate,
  requirePermission('deliveries', 'view'),
  validateQuery(querySchemas.deliveryFilter),
  deliveryController.getAllDeliveries
);

// GET /deliveries/:id - Get delivery by ID
router.get(
  '/:id',
  authenticate,
  requirePermission('deliveries', 'view'),
  deliveryController.getDeliveryById
);

// POST /deliveries/:id/assign - Assign delivery to partner
router.post(
  '/:id/assign',
  authenticate,
  requirePermission('deliveries', 'assign'),
  validateRequest(schemas.assignDelivery),
  deliveryController.assignDelivery
);

// PATCH /deliveries/:id/status - Update delivery status
router.patch(
  '/:id/status',
  authenticate,
  requirePermission('deliveries', 'update'),
  validateRequest(schemas.updateDeliveryStatus),
  deliveryController.updateDeliveryStatus
);

module.exports = router;
