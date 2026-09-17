const express = require('express');
const router = express.Router();
const pricingController = require('../controller/pricingController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rolePermission');
const { validateRequest, schemas } = require('../middleware/validateRequest');

/**
 * Pricing Routes
 * Base path: /api/v1/pricing
 */

// GET /pricing - Get all product pricing
router.get(
  '/',
  authenticate,
  requirePermission('pricing', 'view'),
  pricingController.getAllPricing
);

// PUT /pricing/:id - Update product price
router.put(
  '/:id',
  authenticate,
  requirePermission('pricing', 'update'),
  validateRequest(schemas.updatePrice),
  pricingController.updateProductPrice
);

// GET /pricing/:id/history - Get price change history
router.get(
  '/:id/history',
  authenticate,
  requirePermission('pricing', 'view'),
  pricingController.getPriceHistory
);

module.exports = router;
