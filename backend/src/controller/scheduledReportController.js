const { success } = require('../utils/response');
const { BadRequestError, NotFoundError } = require('../utils/error');
const logger = require('../utils/logger');
const schedulerService = require('../services/schedulerService');

/**
 * Scheduled Reports Controller
 * Manages automated report scheduling
 */

/**
 * Create a new scheduled report
 * POST /api/v1/scheduled-reports
 */
async function createScheduledReport(req, res, next) {
  try {
    const { title, reportType, frequency, filters } = req.validatedBody;
    const userId = req.user?.id;

    // Validate report type
    const validTypes = ['daily_operations', 'sales', 'stock', 'delivery', 'staff_performance', 'debt', 'financial_summary'];
    if (!validTypes.includes(reportType)) {
      throw new BadRequestError(`Invalid report type. Must be one of: ${validTypes.join(', ')}`);
    }

    // Validate frequency
    const validFrequencies = ['daily', 'weekly', 'monthly'];
    if (!validFrequencies.includes(frequency)) {
      throw new BadRequestError(`Invalid frequency. Must be one of: ${validFrequencies.join(', ')}`);
    }

    const scheduledReport = await schedulerService.createScheduledReport({
      title,
      reportType,
      frequency,
      filters: filters || {}
    }, userId);

    return success(res, {
      data: {
        scheduledReport: {
          id: scheduledReport.id,
          title: scheduledReport.title,
          reportType: scheduledReport.report_type,
          frequency: scheduledReport.frequency,
          filters: scheduledReport.filters,
          lastRun: scheduledReport.last_run,
          nextRun: scheduledReport.next_run,
          isActive: scheduledReport.is_active,
          createdBy: scheduledReport.created_by,
          createdAt: scheduledReport.created_at,
        }
      },
      message: 'Scheduled report created successfully',
    }, 201);
  } catch (error) {
    logger.error('Error creating scheduled report:', error);
    next(error);
  }
}

/**
 * Get all scheduled reports
 * GET /api/v1/scheduled-reports
 */
async function getAllScheduledReports(req, res, next) {
  try {
    const { reportType, isActive } = req.query;

    const filters = {};
    if (reportType) filters.reportType = reportType;
    if (isActive !== undefined) filters.isActive = isActive === 'true';

    const scheduledReports = await schedulerService.getAllScheduledReports(filters);

    const formattedReports = scheduledReports.map(report => ({
      id: report.id,
      title: report.title,
      reportType: report.report_type,
      frequency: report.frequency,
      filters: report.filters,
      lastRun: report.last_run,
      nextRun: report.next_run,
      isActive: report.is_active,
      createdBy: report.created_by,
      createdAt: report.created_at,
      updatedAt: report.updated_at,
    }));

    return success(res, {
      data: {
        scheduledReports: formattedReports,
        total: formattedReports.length,
      },
      message: 'Scheduled reports retrieved successfully',
    });
  } catch (error) {
    logger.error('Error fetching scheduled reports:', error);
    next(error);
  }
}

/**
 * Get a specific scheduled report
 * GET /api/v1/scheduled-reports/:id
 */
async function getScheduledReportById(req, res, next) {
  try {
    const { id } = req.params;

    const scheduledReport = await schedulerService.getScheduledReportById(id);

    if (!scheduledReport) {
      throw new NotFoundError('Scheduled report not found', 'ScheduledReport');
    }

    // Get generated reports history
    const generatedReports = await schedulerService.getGeneratedReports(id, 10);

    return success(res, {
      data: {
        scheduledReport: {
          id: scheduledReport.id,
          title: scheduledReport.title,
          reportType: scheduledReport.report_type,
          frequency: scheduledReport.frequency,
          filters: scheduledReport.filters,
          lastRun: scheduledReport.last_run,
          nextRun: scheduledReport.next_run,
          isActive: scheduledReport.is_active,
          createdBy: scheduledReport.created_by,
          createdAt: scheduledReport.created_at,
          updatedAt: scheduledReport.updated_at,
        },
        generatedReports: generatedReports.map(report => ({
          id: report.id,
          title: report.title,
          type: report.type,
          dateRangeStart: report.date_range_start,
          dateRangeEnd: report.date_range_end,
          status: report.status,
          createdAt: report.created_at,
        })),
      },
      message: 'Scheduled report retrieved successfully',
    });
  } catch (error) {
    logger.error('Error fetching scheduled report:', error);
    next(error);
  }
}

/**
 * Update a scheduled report
 * PATCH /api/v1/scheduled-reports/:id
 */
async function updateScheduledReport(req, res, next) {
  try {
    const { id } = req.params;
    const updates = req.validatedBody;

    // Check if scheduled report exists
    const existing = await schedulerService.getScheduledReportById(id);
    if (!existing) {
      throw new NotFoundError('Scheduled report not found', 'ScheduledReport');
    }

    const updatedReport = await schedulerService.updateScheduledReport(id, updates);

    return success(res, {
      data: {
        scheduledReport: {
          id: updatedReport.id,
          title: updatedReport.title,
          reportType: updatedReport.report_type,
          frequency: updatedReport.frequency,
          filters: updatedReport.filters,
          lastRun: updatedReport.last_run,
          nextRun: updatedReport.next_run,
          isActive: updatedReport.is_active,
          createdBy: updatedReport.created_by,
          createdAt: updatedReport.created_at,
          updatedAt: updatedReport.updated_at,
        }
      },
      message: 'Scheduled report updated successfully',
    });
  } catch (error) {
    logger.error('Error updating scheduled report:', error);
    next(error);
  }
}

/**
 * Delete a scheduled report
 * DELETE /api/v1/scheduled-reports/:id
 */
async function deleteScheduledReport(req, res, next) {
  try {
    const { id } = req.params;

    // Check if scheduled report exists
    const existing = await schedulerService.getScheduledReportById(id);
    if (!existing) {
      throw new NotFoundError('Scheduled report not found', 'ScheduledReport');
    }

    await schedulerService.deleteScheduledReport(id);

    return success(res, {
      data: {
        scheduledReportId: id,
      },
      message: 'Scheduled report deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting scheduled report:', error);
    next(error);
  }
}

/**
 * Toggle scheduled report active status
 * POST /api/v1/scheduled-reports/:id/toggle
 */
async function toggleScheduledReport(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await schedulerService.getScheduledReportById(id);
    if (!existing) {
      throw new NotFoundError('Scheduled report not found', 'ScheduledReport');
    }

    const updatedReport = await schedulerService.updateScheduledReport(id, {
      isActive: !existing.is_active
    });

    return success(res, {
      data: {
        scheduledReport: {
          id: updatedReport.id,
          isActive: updatedReport.is_active,
        }
      },
      message: `Scheduled report ${updatedReport.is_active ? 'enabled' : 'disabled'} successfully`,
    });
  } catch (error) {
    logger.error('Error toggling scheduled report:', error);
    next(error);
  }
}

/**
 * Manually trigger a scheduled report (run now)
 * POST /api/v1/scheduled-reports/:id/run
 */
async function runScheduledReport(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await schedulerService.getScheduledReportById(id);
    if (!existing) {
      throw new NotFoundError('Scheduled report not found', 'ScheduledReport');
    }

    // Manually trigger report generation
    const reportId = await schedulerService.checkAndRunScheduledReports();

    return success(res, {
      data: {
        message: 'Scheduled report execution triggered',
        scheduledReportId: id,
      },
      message: 'Report generation started',
    });
  } catch (error) {
    logger.error('Error running scheduled report:', error);
    next(error);
  }
}

module.exports = {
  createScheduledReport,
  getAllScheduledReports,
  getScheduledReportById,
  updateScheduledReport,
  deleteScheduledReport,
  toggleScheduledReport,
  runScheduledReport,
};
