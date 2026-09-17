const express = require('express');
const router = express.Router();
const stockController = require('../controller/stockController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rolePermission');
const { validateRequest, validateQuery, schemas, querySchemas } = require('../middleware/validateRequest');

/**
 * Stock Routes
 * Base path: /api/v1/stock
 */

// GET /stock - Get all stock items
router.get(
  '/',
  authenticate,
  requirePermission('stock', 'view'),
  validateQuery(querySchemas.stockFilter),
  stockController.getAllStock
);

// GET /stock/:id - Get stock by ID
router.get(
  '/:id',
  authenticate,
  requirePermission('stock', 'view'),
  stockController.getStockById
);

// POST /stock - Create stock item (admin only)
router.post(
  '/',
  authenticate,
  requirePermission('stock', 'create'),
  validateRequest(schemas.createStock),
  stockController.createStock
);

// POST /stock/adjust - Adjust stock levels
router.post(
  '/adjust',
  authenticate,
  requirePermission('stock', 'adjust'),
  validateRequest(schemas.adjustStock),
  stockController.adjustStock
);

// GET /stock/:id/history - Get stock adjustment history
router.get(
  '/:id/history',
  authenticate,
  requirePermission('stock', 'view'),
  stockController.getStockHistory
);

module.exports = router;
