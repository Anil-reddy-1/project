const express = require('express');
const router = express.Router();
const scheduledReportController = require('../controller/scheduledReportController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rolePermission');
const { validateRequest, schemas } = require('../middleware/validateRequest');

/**
 * Scheduled Report Routes
 * Base path: /api/v1/scheduled-reports
 */

// POST /scheduled-reports - Create a new scheduled report
router.post(
  '/',
  authenticate,
  requirePermission('reports', 'generate'),
  validateRequest(schemas.createScheduledReport),
  scheduledReportController.createScheduledReport
);

// GET /scheduled-reports - Get all scheduled reports
router.get(
  '/',
  authenticate,
  requirePermission('reports', 'view'),
  scheduledReportController.getAllScheduledReports
);

// GET /scheduled-reports/:id - Get a specific scheduled report
router.get(
  '/:id',
  authenticate,
  requirePermission('reports', 'view'),
  scheduledReportController.getScheduledReportById
);

// PATCH /scheduled-reports/:id - Update a scheduled report
router.patch(
  '/:id',
  authenticate,
  requirePermission('reports', 'generate'),
  validateRequest(schemas.updateScheduledReport),
  scheduledReportController.updateScheduledReport
);

// DELETE /scheduled-reports/:id - Delete a scheduled report
router.delete(
  '/:id',
  authenticate,
  requirePermission('reports', 'generate'),
  scheduledReportController.deleteScheduledReport
);

// POST /scheduled-reports/:id/toggle - Toggle active status
router.post(
  '/:id/toggle',
  authenticate,
  requirePermission('reports', 'generate'),
  scheduledReportController.toggleScheduledReport
);

// POST /scheduled-reports/:id/run - Manually trigger a scheduled report
router.post(
  '/:id/run',
  authenticate,
  requirePermission('reports', 'generate'),
  scheduledReportController.runScheduledReport
);

module.exports = router;
