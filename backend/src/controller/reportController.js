const pool = require('../config/db');
const { success } = require('../utils/response');
const { BadRequestError, NotFoundError } = require('../utils/error');
const logger = require('../utils/logger');
const analyticsService = require('../services/analyticsService');

/**
 * Reports Controller
 * Handles report generation, retrieval, and management
 */

/**
 * Generate a new report
 * POST /api/v1/reports
 */
async function generateReport(req, res, next) {
  try {
    const { type, startDate, endDate, filters = {} } = req.validatedBody;
    const userId = req.user?.id;

    // Validate report type
    const validTypes = ['daily_operations', 'sales', 'stock', 'delivery', 'staff_performance', 'debt', 'financial_summary'];
    if (!validTypes.includes(type)) {
      throw new BadRequestError(`Invalid report type. Must be one of: ${validTypes.join(', ')}`);
    }

    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestError('Invalid date format. Use ISO 8601 format (YYYY-MM-DD)');
    }

    if (start > end) {
      throw new BadRequestError('Start date must be before or equal to end date');
    }

    // Generate report title
    const reportTitles = {
      'daily_operations': 'Daily Operations Report',
      'sales': 'Sales Report',
      'stock': 'Stock & Inventory Report',
      'delivery': 'Delivery Performance Report',
      'staff_performance': 'Staff Performance Report',
      'debt': 'Debt Management Report',
      'financial_summary': 'Financial Summary Report'
    };

    const title = `${reportTitles[type]} - ${startDate} to ${endDate}`;

    // Calculate analytics
    logger.info(`Generating ${type} report from ${startDate} to ${endDate}`);
    const analyticsData = await analyticsService.getAnalyticsByType(type, start, end, filters);

    // Store report in database
    const insertQuery = `
      INSERT INTO reports (title, type, date_range_start, date_range_end, filters, status, metadata, generated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      title,
      type,
      start,
      end,
      JSON.stringify(filters),
      'completed',
      JSON.stringify(analyticsData),
      userId
    ]);

    const report = result.rows[0];

    logger.info(`Report generated successfully: ${report.id}`);

    return success(res, {
      data: {
        report: {
          id: report.id,
          title: report.title,
          type: report.type,
          dateRangeStart: report.date_range_start,
          dateRangeEnd: report.date_range_end,
          filters: report.filters,
          status: report.status,
          metadata: report.metadata,
          generatedBy: report.generated_by,
          createdAt: report.created_at,
        },
      },
      message: 'Report generated successfully',
    }, 201);
  } catch (error) {
    logger.error('Error generating report:', error);
    next(error);
  }
}

/**
 * Get all reports with filtering and pagination
 * GET /api/v1/reports
 */
async function getAllReports(req, res, next) {
  try {
    const { 
      type, 
      status, 
      startDate, 
      endDate,
      page = 1, 
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build dynamic query
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (type) {
      whereConditions.push(`type = $${paramIndex}`);
      queryParams.push(type);
      paramIndex++;
    }

    if (status) {
      whereConditions.push(`status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (startDate) {
      whereConditions.push(`date_range_start >= $${paramIndex}`);
      queryParams.push(new Date(startDate));
      paramIndex++;
    }

    if (endDate) {
      whereConditions.push(`date_range_end <= $${paramIndex}`);
      queryParams.push(new Date(endDate));
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // Validate sort column to prevent SQL injection
    const allowedSortColumns = ['created_at', 'title', 'type', 'status'];
    const validSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM reports ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const totalReports = parseInt(countResult.rows[0].count);

    // Get paginated reports
    const reportsQuery = `
      SELECT 
        id, 
        title, 
        type, 
        date_range_start, 
        date_range_end, 
        filters, 
        status, 
        generated_by,
        scheduled_report_id,
        created_at,
        updated_at
      FROM reports 
      ${whereClause}
      ORDER BY ${validSortBy} ${validSortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(parseInt(limit), offset);
    const reportsResult = await pool.query(reportsQuery, queryParams);

    const reports = reportsResult.rows.map(report => ({
      id: report.id,
      title: report.title,
      type: report.type,
      dateRangeStart: report.date_range_start,
      dateRangeEnd: report.date_range_end,
      filters: report.filters,
      status: report.status,
      generatedBy: report.generated_by,
      scheduledReportId: report.scheduled_report_id,
      createdAt: report.created_at,
      updatedAt: report.updated_at,
    }));

    const totalPages = Math.ceil(totalReports / parseInt(limit));

    return success(res, {
      data: {
        reports,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalReports,
          reportsPerPage: parseInt(limit),
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1,
        },
      },
      message: 'Reports retrieved successfully',
    });
  } catch (error) {
    logger.error('Error fetching reports:', error);
    next(error);
  }
}

/**
 * Get a specific report by ID
 * GET /api/v1/reports/:id
 */
async function getReportById(req, res, next) {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        id, 
        title, 
        type, 
        date_range_start, 
        date_range_end, 
        filters, 
        status, 
        metadata,
        generated_by,
        scheduled_report_id,
        created_at,
        updated_at
      FROM reports 
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Report not found', 'Report');
    }

    const report = result.rows[0];

    return success(res, {
      data: {
        report: {
          id: report.id,
          title: report.title,
          type: report.type,
          dateRangeStart: report.date_range_start,
          dateRangeEnd: report.date_range_end,
          filters: report.filters,
          status: report.status,
          metadata: report.metadata,
          generatedBy: report.generated_by,
          scheduledReportId: report.scheduled_report_id,
          createdAt: report.created_at,
          updatedAt: report.updated_at,
        },
      },
      message: 'Report retrieved successfully',
    });
  } catch (error) {
    logger.error('Error fetching report:', error);
    next(error);
  }
}

/**
 * Delete a report
 * DELETE /api/v1/reports/:id
 */
async function deleteReport(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Check if report exists and user has permission
    const checkQuery = 'SELECT id, generated_by FROM reports WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      throw new NotFoundError('Report not found', 'Report');
    }

    // Delete the report
    const deleteQuery = 'DELETE FROM reports WHERE id = $1 RETURNING id';
    const deleteResult = await pool.query(deleteQuery, [id]);

    logger.info(`Report deleted: ${id} by user ${userId}`);

    return success(res, {
      data: {
        reportId: deleteResult.rows[0].id,
      },
      message: 'Report deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting report:', error);
    next(error);
  }
}

/**
 * Download a report (placeholder for future CSV/PDF export)
 * GET /api/v1/reports/:id/download
 */
async function downloadReport(req, res, next) {
  try {
    const { id } = req.params;
    const { format = 'json' } = req.query;

    // Get report data
    const query = 'SELECT * FROM reports WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Report not found', 'Report');
    }

    const report = result.rows[0];

    if (format === 'json') {
      // Return JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="report-${id}.json"`);
      return res.send(JSON.stringify(report, null, 2));
    }

    // Future: Add CSV and PDF export formats
    throw new BadRequestError('Only JSON format is currently supported. CSV and PDF export coming soon.');
  } catch (error) {
    logger.error('Error downloading report:', error);
    next(error);
  }
}

/**
 * Get quick analytics without saving as report
 * POST /api/v1/reports/analytics
 */
async function getQuickAnalytics(req, res, next) {
  try {
    const { type, startDate, endDate, filters = {} } = req.validatedBody;

    // Validate report type
    const validTypes = ['daily_operations', 'sales', 'stock', 'delivery', 'staff_performance', 'debt', 'financial_summary'];
    if (!validTypes.includes(type)) {
      throw new BadRequestError(`Invalid report type. Must be one of: ${validTypes.join(', ')}`);
    }

    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestError('Invalid date format. Use ISO 8601 format (YYYY-MM-DD)');
    }

    // Calculate analytics without saving
    const analyticsData = await analyticsService.getAnalyticsByType(type, start, end, filters);

    return success(res, {
      data: {
        type,
        dateRangeStart: start,
        dateRangeEnd: end,
        analytics: analyticsData,
      },
      message: 'Analytics calculated successfully',
    });
  } catch (error) {
    logger.error('Error calculating analytics:', error);
    next(error);
  }
}

module.exports = {
  generateReport,
  getAllReports,
  getReportById,
  deleteReport,
  downloadReport,
  getQuickAnalytics,
};
