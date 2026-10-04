const pool = require('../config/db');
const logger = require('../utils/logger');
const analyticsService = require('./analyticsService');

/**
 * Scheduler Service
 * Manages automated report generation on schedule
 */

// Store interval IDs for cleanup
let schedulerInterval = null;

/**
 * Calculate next run time based on frequency
 * @param {String} frequency - 'daily', 'weekly', or 'monthly'
 * @param {Date} fromDate - Base date to calculate from (default: now)
 * @returns {Date} Next run timestamp
 */
function calculateNextRun(frequency, fromDate = new Date()) {
  const nextRun = new Date(fromDate);
  
  switch (frequency) {
    case 'daily':
      // Run at 1 AM next day
      nextRun.setDate(nextRun.getDate() + 1);
      nextRun.setHours(1, 0, 0, 0);
      break;
    case 'weekly':
      // Run every Monday at 1 AM
      nextRun.setDate(nextRun.getDate() + (7 - nextRun.getDay() + 1) % 7 || 7);
      nextRun.setHours(1, 0, 0, 0);
      break;
    case 'monthly':
      // Run on the 1st of next month at 1 AM
      nextRun.setMonth(nextRun.getMonth() + 1, 1);
      nextRun.setHours(1, 0, 0, 0);
      break;
    default:
      throw new Error(`Invalid frequency: ${frequency}`);
  }
  
  return nextRun;
}

/**
 * Calculate date range for a scheduled report
 * @param {String} frequency - 'daily', 'weekly', or 'monthly'
 * @returns {Object} { startDate, endDate }
 */
function calculateDateRange(frequency) {
  const endDate = new Date();
  const startDate = new Date();
  
  switch (frequency) {
    case 'daily':
      // Yesterday
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(endDate.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'weekly':
      // Last 7 days
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'monthly':
      // Last month
      startDate.setMonth(startDate.getMonth() - 1, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(0); // Last day of previous month
      endDate.setHours(23, 59, 59, 999);
      break;
    default:
      throw new Error(`Invalid frequency: ${frequency}`);
  }
  
  return { startDate, endDate };
}

/**
 * Generate a scheduled report
 * @param {Object} scheduledReport - Scheduled report configuration
 */
async function generateScheduledReport(scheduledReport) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id, title, report_type, frequency, filters } = scheduledReport;
    
    // Calculate date range
    const { startDate, endDate } = calculateDateRange(frequency);
    
    logger.info(`Generating scheduled report: ${title} (${report_type}) from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    // Calculate analytics
    const analyticsData = await analyticsService.getAnalyticsByType(
      report_type,
      startDate,
      endDate,
      filters || {}
    );
    
    // Generate report title with date range
    const reportTitle = `${title} - ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`;
    
    // Insert report
    const insertQuery = `
      INSERT INTO reports (
        title, 
        type, 
        date_range_start, 
        date_range_end, 
        filters, 
        status, 
        metadata, 
        scheduled_report_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `;
    
    const result = await client.query(insertQuery, [
      reportTitle,
      report_type,
      startDate,
      endDate,
      JSON.stringify(filters || {}),
      'completed',
      JSON.stringify(analyticsData),
      id
    ]);
    
    const reportId = result.rows[0].id;
    
    // Update scheduled report's last_run and next_run
    const nextRun = calculateNextRun(frequency);
    const updateQuery = `
      UPDATE scheduled_reports 
      SET last_run = CURRENT_TIMESTAMP, next_run = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    
    await client.query(updateQuery, [nextRun, id]);
    
    await client.query('COMMIT');
    
    logger.info(`Scheduled report generated successfully: ${reportId} for schedule ${id}`);
    
    return reportId;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(`Error generating scheduled report:`, error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check and run due scheduled reports
 */
async function checkAndRunScheduledReports() {
  try {
    // Get all active scheduled reports that are due
    const query = `
      SELECT * FROM scheduled_reports
      WHERE is_active = true 
        AND next_run <= CURRENT_TIMESTAMP
      ORDER BY next_run ASC
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      logger.debug('No scheduled reports due');
      return;
    }
    
    logger.info(`Found ${result.rows.length} scheduled report(s) due for execution`);
    
    // Process each due report
    for (const scheduledReport of result.rows) {
      try {
        await generateScheduledReport(scheduledReport);
      } catch (error) {
        logger.error(`Failed to generate scheduled report ${scheduledReport.id}:`, error);
        // Continue with other reports even if one fails
      }
    }
  } catch (error) {
    logger.error('Error checking scheduled reports:', error);
  }
}

/**
 * Start the scheduler
 * Checks for due reports every 5 minutes
 */
function startScheduler() {
  if (schedulerInterval) {
    logger.warn('Scheduler already running');
    return;
  }
  
  logger.info('Starting report scheduler');
  
  // Check immediately on start
  checkAndRunScheduledReports();
  
  // Then check every 5 minutes
  schedulerInterval = setInterval(() => {
    checkAndRunScheduledReports();
  }, 5 * 60 * 1000); // 5 minutes
  
  logger.info('Report scheduler started successfully');
}

/**
 * Stop the scheduler
 */
function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    logger.info('Report scheduler stopped');
  }
}

/**
 * Create a new scheduled report
 * @param {Object} config - Scheduled report configuration
 * @param {String} userId - User creating the schedule
 * @returns {Object} Created scheduled report
 */
async function createScheduledReport(config, userId) {
  const { title, reportType, frequency, filters = {} } = config;
  
  // Calculate initial next run
  const nextRun = calculateNextRun(frequency);
  
  const query = `
    INSERT INTO scheduled_reports (
      title,
      report_type,
      frequency,
      filters,
      next_run,
      is_active,
      created_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  
  const result = await pool.query(query, [
    title,
    reportType,
    frequency,
    JSON.stringify(filters),
    nextRun,
    true,
    userId
  ]);
  
  logger.info(`Scheduled report created: ${result.rows[0].id}`);
  
  return result.rows[0];
}

/**
 * Get all scheduled reports
 * @param {Object} filters - Optional filters
 * @returns {Array} List of scheduled reports
 */
async function getAllScheduledReports(filters = {}) {
  let whereConditions = [];
  let queryParams = [];
  let paramIndex = 1;
  
  if (filters.reportType) {
    whereConditions.push(`report_type = $${paramIndex}`);
    queryParams.push(filters.reportType);
    paramIndex++;
  }
  
  if (filters.isActive !== undefined) {
    whereConditions.push(`is_active = $${paramIndex}`);
    queryParams.push(filters.isActive);
    paramIndex++;
  }
  
  const whereClause = whereConditions.length > 0 
    ? `WHERE ${whereConditions.join(' AND ')}` 
    : '';
  
  const query = `
    SELECT * FROM scheduled_reports
    ${whereClause}
    ORDER BY created_at DESC
  `;
  
  const result = await pool.query(query, queryParams);
  return result.rows;
}

/**
 * Get a scheduled report by ID
 * @param {String} id - Scheduled report ID
 * @returns {Object} Scheduled report
 */
async function getScheduledReportById(id) {
  const query = 'SELECT * FROM scheduled_reports WHERE id = $1';
  const result = await pool.query(query, [id]);
  return result.rows[0];
}

/**
 * Update a scheduled report
 * @param {String} id - Scheduled report ID
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated scheduled report
 */
async function updateScheduledReport(id, updates) {
  const allowedFields = ['title', 'frequency', 'filters', 'is_active'];
  const setClause = [];
  const queryParams = [];
  let paramIndex = 1;
  
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      const dbField = field === 'isActive' ? 'is_active' : field;
      
      if (field === 'filters') {
        setClause.push(`${dbField} = $${paramIndex}`);
        queryParams.push(JSON.stringify(updates[field]));
      } else {
        setClause.push(`${dbField} = $${paramIndex}`);
        queryParams.push(updates[field]);
      }
      
      paramIndex++;
    }
  }
  
  // Recalculate next_run if frequency changed
  if (updates.frequency) {
    const nextRun = calculateNextRun(updates.frequency);
    setClause.push(`next_run = $${paramIndex}`);
    queryParams.push(nextRun);
    paramIndex++;
  }
  
  setClause.push(`updated_at = CURRENT_TIMESTAMP`);
  queryParams.push(id);
  
  const query = `
    UPDATE scheduled_reports
    SET ${setClause.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;
  
  const result = await pool.query(query, queryParams);
  
  logger.info(`Scheduled report updated: ${id}`);
  
  return result.rows[0];
}

/**
 * Delete a scheduled report
 * @param {String} id - Scheduled report ID
 */
async function deleteScheduledReport(id) {
  const query = 'DELETE FROM scheduled_reports WHERE id = $1 RETURNING id';
  const result = await pool.query(query, [id]);
  
  logger.info(`Scheduled report deleted: ${id}`);
  
  return result.rows[0];
}

/**
 * Get reports generated by a scheduled report
 * @param {String} scheduledReportId - Scheduled report ID
 * @param {Number} limit - Maximum number of reports to return
 * @returns {Array} Generated reports
 */
async function getGeneratedReports(scheduledReportId, limit = 10) {
  const query = `
    SELECT 
      id,
      title,
      type,
      date_range_start,
      date_range_end,
      status,
      created_at
    FROM reports
    WHERE scheduled_report_id = $1
    ORDER BY created_at DESC
    LIMIT $2
  `;
  
  const result = await pool.query(query, [scheduledReportId, limit]);
  return result.rows;
}

module.exports = {
  startScheduler,
  stopScheduler,
  createScheduledReport,
  getAllScheduledReports,
  getScheduledReportById,
  updateScheduledReport,
  deleteScheduledReport,
  getGeneratedReports,
  checkAndRunScheduledReports, // For testing
  calculateNextRun, // For testing
  calculateDateRange, // For testing
};
