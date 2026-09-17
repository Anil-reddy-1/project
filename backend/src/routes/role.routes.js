const express = require('express');
const router = express.Router();
const roleController = require('../controller/roleController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rolePermission');

/**
 * Role Routes
 * Base path: /api/v1/roles
 */

// GET /roles - Get all roles (admin only)
router.get(
  '/',
  authenticate,
  requirePermission('users', 'view'), // Using users.view as proxy for roles.view
  roleController.getAllRoles
);

// GET /roles/:id - Get role by ID
router.get(
  '/:id',
  authenticate,
  requirePermission('users', 'view'),
  roleController.getRoleById
);

module.exports = router;
