const express = require('express');
const router = express.Router();
const staffController = require('../controller/staffController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rolePermission');
const { validateRequest, validateQuery, schemas, querySchemas } = require('../middleware/validateRequest');

/**
 * Staff Routes
 * Base path: /api/v1/staff
 */

// GET /staff - Get all staff
router.get(
  '/',
  authenticate,
  requirePermission('staff', 'view'),
  validateQuery(querySchemas.staffFilter),
  staffController.getAllStaff
);

// GET /staff/:id - Get staff by ID
router.get(
  '/:id',
  authenticate,
  requirePermission('staff', 'view'),
  staffController.getStaffById
);

// POST /staff - Create staff
router.post(
  '/',
  authenticate,
  requirePermission('staff', 'create'),
  validateRequest(schemas.createStaff),
  staffController.createStaff
);

// PUT /staff/:id - Update staff
router.put(
  '/:id',
  authenticate,
  requirePermission('staff', 'update'),
  validateRequest(schemas.updateStaff),
  staffController.updateStaff
);

// DELETE /staff/:id - Delete staff
router.delete(
  '/:id',
  authenticate,
  requirePermission('staff', 'delete'),
  staffController.deleteStaff
);

// PATCH /staff/:id/availability - Update staff availability
router.patch(
  '/:id/availability',
  authenticate,
  requirePermission('staff', 'update'),
  validateRequest(schemas.updateStaffAvailability),
  staffController.updateStaffAvailability
);

module.exports = router;
