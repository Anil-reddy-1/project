const express = require('express');
const router = express.Router();
const debtController = require('../controller/debtController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rolePermission');
const { validateRequest, validateQuery, schemas, querySchemas } = require('../middleware/validateRequest');

/**
 * Debt & Payables Routes
 * Base path: /api/v1/debts
 */

// GET /debts - Get all debts
router.get(
  '/',
  authenticate,
  requirePermission('debts', 'view'),
  validateQuery(querySchemas.debtFilter),
  debtController.getAllDebts
);

// GET /debts/:id - Get debt by ID
router.get(
  '/:id',
  authenticate,
  requirePermission('debts', 'view'),
  debtController.getDebtById
);

// POST /debts - Create new debt
router.post(
  '/',
  authenticate,
  requirePermission('debts', 'create'),
  validateRequest(schemas.createDebt),
  debtController.createDebt
);

// POST /debts/:id/payment - Record debt payment
router.post(
  '/:id/payment',
  authenticate,
  requirePermission('debts', 'record_payment'),
  validateRequest(schemas.recordPayment),
  debtController.recordPayment
);

module.exports = router;
