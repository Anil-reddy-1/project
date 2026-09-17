const express = require('express');
const router = express.Router();
const reportController = require('../controller/reportController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rolePermission');
const { validateRequest, schemas } = require('../middleware/validateRequest');

/**
 * Report Routes
 * Base path: /api/v1/reports
 */

// POST /reports/generate - Generate business report
router.post(
  '/generate',
  authenticate,
  requirePermission('reports', 'generate'),
  validateRequest(schemas.generateReport),
  reportController.generateReport
);

// GET /reports/:id/download - Download generated report
router.get(
  '/:id/download',
  authenticate,
  requirePermission('reports', 'export'),
  reportController.downloadReport
);

module.exports = router;
