const express = require('express');
const router = express.Router();
const pricingController = require('../controller/pricingController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rolePermission');
const { validateRequest, schemas } = require('../middleware/validateRequest');

/**
 * Pricing Routes
 * Base path: /api/v1/pricing
 *
 * Pricing model:
 *   cost_price          → private (admin only, never exposed to buyers)
 *   display_price       → MRP / reference price (strikethrough in buyer UI)
 *   selling_price       → actual buyer-facing price
 *   minimum_margin_pct  → floor threshold for margin alerts
 */

// GET /pricing/stats — Dashboard summary stats
router.get(
  '/stats',
  authenticate,
  requirePermission('pricing', 'view'),
  pricingController.getPricingStats
);

// GET /pricing/export — Download pricing CSV (admin only, includes cost price)
router.get(
  '/export',
  authenticate,
  requirePermission('pricing', 'view'),
  pricingController.exportPricing
);

// POST /pricing/suggest — Calculate suggested selling price from cost + target margin
router.post(
  '/suggest',
  authenticate,
  requirePermission('pricing', 'view'),
  validateRequest(schemas.suggestSellingPrice),
  pricingController.suggestSellingPrice
);

// PUT /pricing/bulk — Bulk adjust selling_price and/or display_price
router.put(
  '/bulk',
  authenticate,
  requirePermission('pricing', 'update'),
  validateRequest(schemas.bulkUpdatePrice),
  pricingController.bulkUpdatePrices
);

// GET /pricing — All product pricing (admin view, includes cost_price)
router.get(
  '/',
  authenticate,
  requirePermission('pricing', 'view'),
  pricingController.getAllPricing
);

// GET /pricing/:id/history — Price change audit log
router.get(
  '/:id/history',
  authenticate,
  requirePermission('pricing', 'view'),
  pricingController.getPriceHistory
);

// PUT /pricing/:id — Update cost, display, or selling price for a product
router.put(
  '/:id',
  authenticate,
  requirePermission('pricing', 'update'),
  validateRequest(schemas.updatePrice),
  pricingController.updateProductPrice
);

module.exports = router;
