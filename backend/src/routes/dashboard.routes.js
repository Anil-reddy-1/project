const express = require('express');
const router = express.Router();
const dashboardController = require('../controller/dashboardController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rolePermission');

/**
 * Dashboard Routes
 * Base path: /api/v1/dashboard
 */

// GET /dashboard/stats - Get dashboard statistics
router.get(
  '/stats',
  authenticate,
  requirePermission('dashboard', 'view'),
  dashboardController.getDashboardStats
);

module.exports = router;
