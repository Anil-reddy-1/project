const express = require('express');
const router = express.Router();
const reportController = require('../controller/reportController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rolePermission');
const { validateRequest, validateQuery, schemas, querySchemas } = require('../middleware/validateRequest');

/**
 * Report Routes
 * Base path: /api/v1/reports
 */

// POST /reports - Generate and save a new report
router.post(
  '/',
  authenticate,
  requirePermission('reports', 'generate'),
  validateRequest(schemas.generateReport),
  reportController.generateReport
);

// POST /reports/generate - Generate and save a new report (alias for backward compatibility)
router.post(
  '/generate',
  authenticate,
  requirePermission('reports', 'generate'),
  validateRequest(schemas.generateReport),
  reportController.generateReport
);

// POST /reports/analytics - Get quick analytics without saving
router.post(
  '/analytics',
  authenticate,
  requirePermission('reports', 'view'),
  validateRequest(schemas.quickAnalytics),
  reportController.getQuickAnalytics
);

// GET /reports - Get all reports with filtering and pagination
router.get(
  '/',
  authenticate,
  requirePermission('reports', 'view'),
  validateQuery(querySchemas.reportFilter),
  reportController.getAllReports
);

// GET /reports/:id - Get a specific report by ID
router.get(
  '/:id',
  authenticate,
  requirePermission('reports', 'view'),
  reportController.getReportById
);

// DELETE /reports/:id - Delete a report
router.delete(
  '/:id',
  authenticate,
  requirePermission('reports', 'generate'),
  reportController.deleteReport
);

// GET /reports/:id/download - Download generated report
router.get(
  '/:id/download',
  authenticate,
  requirePermission('reports', 'export'),
  reportController.downloadReport
);

module.exports = router;
