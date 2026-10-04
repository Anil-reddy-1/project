const pool = require('../config/db');
const logger = require('../utils/logger');

/**
 * Analytics Service
 * Calculates metrics and analytics for various report types from database tables
 */

/**
 * Calculate Sales Analytics
 * Includes: revenue totals, order counts, average order value, top products, sales trends
 * @param {Date} startDate - Start date for the report period
 * @param {Date} endDate - End date for the report period
 * @param {Object} filters - Additional filters (category, status, etc.)
 * @returns {Object} Sales analytics data
 */
async function calculateSalesAnalytics(startDate, endDate, filters = {}) {
  const client = await pool.connect();
  try {
    const analytics = {};

    // Total Revenue and Order Count
    const revenueQuery = `
      SELECT 
        COUNT(DISTINCT o.id) as total_orders,
        COALESCE(SUM(o.total_amount), 0) as total_revenue,
        COALESCE(AVG(o.total_amount), 0) as average_order_value,
        COUNT(DISTINCT o.customer_id) as unique_customers
      FROM orders o
      WHERE o.created_at >= $1 AND o.created_at <= $2
        AND o.order_status NOT IN ('cancelled', 'failed')
    `;
    
    const revenueResult = await client.query(revenueQuery, [startDate, endDate]);
    analytics.summary = revenueResult.rows[0];

    // Sales by Status
    const statusQuery = `
      SELECT 
        o.order_status as status,
        COUNT(*) as count,
        COALESCE(SUM(o.total_amount), 0) as revenue
      FROM orders o
      WHERE o.created_at >= $1 AND o.created_at <= $2
      GROUP BY o.order_status
      ORDER BY count DESC
    `;
    
    const statusResult = await client.query(statusQuery, [startDate, endDate]);
    analytics.ordersByStatus = statusResult.rows;

    // Top Products by Revenue
    const topProductsQuery = `
      SELECT 
        p.id,
        p.name,
        p.sku,
        SUM(oi.quantity) as units_sold,
        COALESCE(SUM(oi.total_price), 0) as revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      WHERE o.created_at >= $1 AND o.created_at <= $2
        AND o.order_status NOT IN ('cancelled', 'failed')
      GROUP BY p.id, p.name, p.sku
      ORDER BY revenue DESC
      LIMIT 10
    `;
    
    const topProductsResult = await client.query(topProductsQuery, [startDate, endDate]);
    analytics.topProducts = topProductsResult.rows;

    // Sales Trend (Daily)
    const trendQuery = `
      SELECT 
        DATE(o.created_at) as date,
        COUNT(DISTINCT o.id) as orders,
        COALESCE(SUM(o.total_amount), 0) as revenue
      FROM orders o
      WHERE o.created_at >= $1 AND o.created_at <= $2
        AND o.order_status NOT IN ('cancelled', 'failed')
      GROUP BY DATE(o.created_at)
      ORDER BY date ASC
    `;
    
    const trendResult = await client.query(trendQuery, [startDate, endDate]);
    analytics.dailyTrend = trendResult.rows;

    // Sales by Payment Method
    const paymentMethodQuery = `
      SELECT 
        o.payment_method,
        COUNT(*) as count,
        COALESCE(SUM(o.total_amount), 0) as revenue
      FROM orders o
      WHERE o.created_at >= $1 AND o.created_at <= $2
        AND o.order_status NOT IN ('cancelled', 'failed')
      GROUP BY o.payment_method
      ORDER BY revenue DESC
    `;
    
    const paymentMethodResult = await client.query(paymentMethodQuery, [startDate, endDate]);
    analytics.paymentMethods = paymentMethodResult.rows;

    // Category Analysis (from product category_tags JSONB)
    const categoryQuery = `
      SELECT 
        jsonb_array_elements_text(p.category_tags) as category,
        COUNT(DISTINCT oi.order_id) as orders,
        SUM(oi.quantity) as units_sold,
        COALESCE(SUM(oi.total_price), 0) as revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      WHERE o.created_at >= $1 AND o.created_at <= $2
        AND o.order_status NOT IN ('cancelled', 'failed')
        AND jsonb_array_length(p.category_tags) > 0
      GROUP BY category
      ORDER BY revenue DESC
      LIMIT 10
    `;
    
    const categoryResult = await client.query(categoryQuery, [startDate, endDate]);
    analytics.topCategories = categoryResult.rows;

    return analytics;
  } catch (error) {
    logger.error('Error calculating sales analytics:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Calculate Stock Analytics
 * Includes: inventory value, low stock items, out of stock, stock turnover, category distribution
 * @param {Date} startDate - Start date for the report period
 * @param {Date} endDate - End date for the report period
 * @param {Object} filters - Additional filters
 * @returns {Object} Stock analytics data
 */
async function calculateStockAnalytics(startDate, endDate, filters = {}) {
  const client = await pool.connect();
  try {
    const analytics = {};

    // Current Inventory Summary
    const inventoryQuery = `
      SELECT 
        COUNT(*) as total_products,
        COALESCE(SUM(quantity), 0) as total_units,
        COALESCE(SUM(quantity * COALESCE(cost_price, price, 0)), 0) as inventory_value,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_products,
        COUNT(CASE WHEN quantity = 0 THEN 1 END) as out_of_stock_count,
        COUNT(CASE WHEN quantity > 0 AND quantity <= min_stock THEN 1 END) as low_stock_count
      FROM products
    `;
    
    const inventoryResult = await client.query(inventoryQuery);
    analytics.summary = inventoryResult.rows[0];

    // Low Stock Items
    const lowStockQuery = `
      SELECT 
        id,
        sku,
        name,
        quantity,
        min_stock,
        unit,
        COALESCE(price, 0) as price
      FROM products
      WHERE quantity > 0 AND quantity <= min_stock
      ORDER BY (quantity::float / NULLIF(min_stock, 0)) ASC
      LIMIT 20
    `;
    
    const lowStockResult = await client.query(lowStockQuery);
    analytics.lowStockItems = lowStockResult.rows;

    // Out of Stock Items
    const outOfStockQuery = `
      SELECT 
        id,
        sku,
        name,
        quantity,
        min_stock,
        unit,
        COALESCE(price, 0) as price,
        updated_at as last_updated
      FROM products
      WHERE quantity = 0 AND status = 'active'
      ORDER BY updated_at DESC
      LIMIT 20
    `;
    
    const outOfStockResult = await client.query(outOfStockQuery);
    analytics.outOfStockItems = outOfStockResult.rows;

    // Stock by Category
    const categoryQuery = `
      SELECT 
        jsonb_array_elements_text(category_tags) as category,
        COUNT(*) as product_count,
        COALESCE(SUM(quantity), 0) as total_units,
        COALESCE(SUM(quantity * COALESCE(cost_price, price, 0)), 0) as category_value
      FROM products
      WHERE jsonb_array_length(category_tags) > 0
      GROUP BY category
      ORDER BY category_value DESC
    `;
    
    const categoryResult = await client.query(categoryQuery);
    analytics.categoryDistribution = categoryResult.rows;

    // Stock Movements (during the period)
    const movementsQuery = `
      SELECT 
        DATE(sa.created_at) as date,
        sa.type,
        COUNT(*) as transaction_count,
        SUM(sa.quantity) as total_quantity
      FROM stock_adjustments sa
      WHERE sa.created_at >= $1 AND sa.created_at <= $2
      GROUP BY DATE(sa.created_at), sa.type
      ORDER BY date DESC
    `;
    
    const movementsResult = await client.query(movementsQuery, [startDate, endDate]);
    analytics.stockMovements = movementsResult.rows;

    // Top Value Products
    const topValueQuery = `
      SELECT 
        id,
        sku,
        name,
        quantity,
        COALESCE(cost_price, price, 0) as unit_value,
        (quantity * COALESCE(cost_price, price, 0)) as total_value
      FROM products
      WHERE quantity > 0
      ORDER BY total_value DESC
      LIMIT 10
    `;
    
    const topValueResult = await client.query(topValueQuery);
    analytics.topValueProducts = topValueResult.rows;

    // Stock Turnover (products sold during period vs current stock)
    const turnoverQuery = `
      SELECT 
        p.id,
        p.sku,
        p.name,
        p.quantity as current_stock,
        COALESCE(SUM(oi.quantity), 0) as units_sold,
        CASE 
          WHEN p.quantity > 0 THEN ROUND((COALESCE(SUM(oi.quantity), 0)::numeric / p.quantity), 2)
          ELSE 0
        END as turnover_ratio
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id
        AND o.created_at >= $1 AND o.created_at <= $2
        AND o.order_status NOT IN ('cancelled', 'failed')
      WHERE p.quantity > 0
      GROUP BY p.id, p.sku, p.name, p.quantity
      ORDER BY turnover_ratio DESC
      LIMIT 20
    `;
    
    const turnoverResult = await client.query(turnoverQuery, [startDate, endDate]);
    analytics.stockTurnover = turnoverResult.rows;

    return analytics;
  } catch (error) {
    logger.error('Error calculating stock analytics:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Calculate Delivery Analytics
 * Includes: total deliveries, on-time rate, average delivery time, partner performance
 * @param {Date} startDate - Start date for the report period
 * @param {Date} endDate - End date for the report period
 * @param {Object} filters - Additional filters
 * @returns {Object} Delivery analytics data
 */
async function calculateDeliveryAnalytics(startDate, endDate, filters = {}) {
  const client = await pool.connect();
  try {
    const analytics = {};

    // Delivery Summary
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_deliveries,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_count,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count,
        COUNT(CASE WHEN status IN ('pending', 'assigned', 'accepted', 'in_transit') THEN 1 END) as in_progress_count,
        COALESCE(AVG(
          CASE 
            WHEN delivered_at IS NOT NULL AND assigned_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (delivered_at - assigned_at)) / 3600
          END
        ), 0) as avg_delivery_hours
      FROM deliveries
      WHERE created_at >= $1 AND created_at <= $2
    `;
    
    const summaryResult = await client.query(summaryQuery, [startDate, endDate]);
    analytics.summary = summaryResult.rows[0];

    // Delivery Status Breakdown
    const statusQuery = `
      SELECT 
        status,
        COUNT(*) as count,
        ROUND((COUNT(*)::numeric / (SELECT COUNT(*) FROM deliveries WHERE created_at >= $1 AND created_at <= $2)) * 100, 2) as percentage
      FROM deliveries
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY status
      ORDER BY count DESC
    `;
    
    const statusResult = await client.query(statusQuery, [startDate, endDate]);
    analytics.statusBreakdown = statusResult.rows;

    // Partner Performance
    const partnerQuery = `
      SELECT 
        COALESCE(s.name, d.partner_name, 'Unassigned') as partner_name,
        d.partner_id,
        COUNT(*) as total_deliveries,
        COUNT(CASE WHEN d.status = 'delivered' THEN 1 END) as successful_deliveries,
        COUNT(CASE WHEN d.status = 'failed' THEN 1 END) as failed_deliveries,
        ROUND(
          (COUNT(CASE WHEN d.status = 'delivered' THEN 1 END)::numeric / NULLIF(COUNT(*), 0)) * 100, 
          2
        ) as success_rate,
        COALESCE(AVG(
          CASE 
            WHEN d.delivered_at IS NOT NULL AND d.assigned_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (d.delivered_at - d.assigned_at)) / 3600
          END
        ), 0) as avg_delivery_hours
      FROM deliveries d
      LEFT JOIN staff s ON d.partner_id = s.id
      WHERE d.created_at >= $1 AND d.created_at <= $2
      GROUP BY partner_name, d.partner_id
      ORDER BY total_deliveries DESC
      LIMIT 20
    `;
    
    const partnerResult = await client.query(partnerQuery, [startDate, endDate]);
    analytics.partnerPerformance = partnerResult.rows;

    // Daily Delivery Trend
    const trendQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
      FROM deliveries
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;
    
    const trendResult = await client.query(trendQuery, [startDate, endDate]);
    analytics.dailyTrend = trendResult.rows;

    // Delivery Time Distribution (bucketed)
    const timeDistributionQuery = `
      SELECT 
        CASE 
          WHEN delivery_hours < 2 THEN 'Under 2 hours'
          WHEN delivery_hours >= 2 AND delivery_hours < 4 THEN '2-4 hours'
          WHEN delivery_hours >= 4 AND delivery_hours < 8 THEN '4-8 hours'
          WHEN delivery_hours >= 8 AND delivery_hours < 24 THEN '8-24 hours'
          ELSE 'Over 24 hours'
        END as time_bucket,
        COUNT(*) as count
      FROM (
        SELECT 
          EXTRACT(EPOCH FROM (delivered_at - assigned_at)) / 3600 as delivery_hours
        FROM deliveries
        WHERE created_at >= $1 AND created_at <= $2
          AND delivered_at IS NOT NULL 
          AND assigned_at IS NOT NULL
          AND status = 'delivered'
      ) sub
      GROUP BY time_bucket
      ORDER BY 
        CASE time_bucket
          WHEN 'Under 2 hours' THEN 1
          WHEN '2-4 hours' THEN 2
          WHEN '4-8 hours' THEN 3
          WHEN '8-24 hours' THEN 4
          ELSE 5
        END
    `;
    
    const timeDistributionResult = await client.query(timeDistributionQuery, [startDate, endDate]);
    analytics.deliveryTimeDistribution = timeDistributionResult.rows;

    return analytics;
  } catch (error) {
    logger.error('Error calculating delivery analytics:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Calculate Staff Performance Analytics
 * Includes: active staff count, availability distribution, workload per staff
 * @param {Date} startDate - Start date for the report period
 * @param {Date} endDate - End date for the report period
 * @param {Object} filters - Additional filters
 * @returns {Object} Staff analytics data
 */
async function calculateStaffAnalytics(startDate, endDate, filters = {}) {
  const client = await pool.connect();
  try {
    const analytics = {};

    // Staff Summary
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_staff,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_staff,
        COUNT(CASE WHEN availability = 'available' THEN 1 END) as available_staff,
        COUNT(CASE WHEN availability = 'busy' THEN 1 END) as busy_staff,
        COUNT(CASE WHEN role = 'delivery_partner' THEN 1 END) as delivery_partners
      FROM staff
    `;
    
    const summaryResult = await client.query(summaryQuery);
    analytics.summary = summaryResult.rows[0];

    // Staff by Role
    const roleQuery = `
      SELECT 
        role,
        COUNT(*) as count,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count
      FROM staff
      GROUP BY role
      ORDER BY count DESC
    `;
    
    const roleResult = await client.query(roleQuery);
    analytics.staffByRole = roleResult.rows;

    // Staff Availability Distribution
    const availabilityQuery = `
      SELECT 
        availability,
        COUNT(*) as count,
        ROUND((COUNT(*)::numeric / (SELECT COUNT(*) FROM staff WHERE status = 'active')) * 100, 2) as percentage
      FROM staff
      WHERE status = 'active'
      GROUP BY availability
      ORDER BY count DESC
    `;
    
    const availabilityResult = await client.query(availabilityQuery);
    analytics.availabilityDistribution = availabilityResult.rows;

    // Delivery Partner Workload (deliveries handled during period)
    const workloadQuery = `
      SELECT 
        s.id,
        s.name,
        s.email,
        s.availability,
        s.active_deliveries as current_active,
        COUNT(d.id) as period_deliveries,
        COUNT(CASE WHEN d.status = 'delivered' THEN 1 END) as successful_deliveries,
        ROUND(
          (COUNT(CASE WHEN d.status = 'delivered' THEN 1 END)::numeric / NULLIF(COUNT(d.id), 0)) * 100, 
          2
        ) as success_rate
      FROM staff s
      LEFT JOIN deliveries d ON s.id = d.partner_id
        AND d.created_at >= $1 AND d.created_at <= $2
      WHERE s.role = 'delivery_partner' AND s.status = 'active'
      GROUP BY s.id, s.name, s.email, s.availability, s.active_deliveries
      ORDER BY period_deliveries DESC
    `;
    
    const workloadResult = await client.query(workloadQuery, [startDate, endDate]);
    analytics.deliveryPartnerWorkload = workloadResult.rows;

    // Staff Performance Metrics
    const performanceQuery = `
      SELECT 
        s.id,
        s.name,
        s.role,
        COUNT(d.id) as total_tasks,
        COUNT(CASE WHEN d.status = 'delivered' THEN 1 END) as completed_tasks,
        COALESCE(AVG(
          CASE 
            WHEN d.delivered_at IS NOT NULL AND d.assigned_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (d.delivered_at - d.assigned_at)) / 3600
          END
        ), 0) as avg_completion_hours
      FROM staff s
      LEFT JOIN deliveries d ON s.id = d.partner_id
        AND d.created_at >= $1 AND d.created_at <= $2
      WHERE s.status = 'active'
      GROUP BY s.id, s.name, s.role
      HAVING COUNT(d.id) > 0
      ORDER BY completed_tasks DESC
      LIMIT 20
    `;
    
    const performanceResult = await client.query(performanceQuery, [startDate, endDate]);
    analytics.staffPerformance = performanceResult.rows;

    return analytics;
  } catch (error) {
    logger.error('Error calculating staff analytics:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Calculate Debt Analytics
 * Includes: total outstanding, overdue amounts, payment history, aging analysis
 * @param {Date} startDate - Start date for the report period
 * @param {Date} endDate - End date for the report period
 * @param {Object} filters - Additional filters
 * @returns {Object} Debt analytics data
 */
async function calculateDebtAnalytics(startDate, endDate, filters = {}) {
  const client = await pool.connect();
  try {
    const analytics = {};

    // Debt Summary
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_debts,
        COALESCE(SUM(original_amount), 0) as total_original,
        COALESCE(SUM(paid_amount), 0) as total_paid,
        COALESCE(SUM(remaining_amount), 0) as total_outstanding,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'partial' THEN 1 END) as partial_count,
        COUNT(CASE WHEN status = 'cleared' THEN 1 END) as cleared_count,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_count,
        COALESCE(SUM(CASE WHEN status = 'overdue' THEN remaining_amount ELSE 0 END), 0) as overdue_amount
      FROM debts
      WHERE created_at >= $1 AND created_at <= $2
    `;
    
    const summaryResult = await client.query(summaryQuery, [startDate, endDate]);
    analytics.summary = summaryResult.rows[0];

    // Debt by Status
    const statusQuery = `
      SELECT 
        status,
        COUNT(*) as count,
        COALESCE(SUM(remaining_amount), 0) as outstanding_amount,
        ROUND((COUNT(*)::numeric / (SELECT COUNT(*) FROM debts WHERE created_at >= $1 AND created_at <= $2)) * 100, 2) as percentage
      FROM debts
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY status
      ORDER BY outstanding_amount DESC
    `;
    
    const statusResult = await client.query(statusQuery, [startDate, endDate]);
    analytics.debtsByStatus = statusResult.rows;

    // Debt by Type (Payable vs Receivable)
    const typeQuery = `
      SELECT 
        type,
        COUNT(*) as count,
        COALESCE(SUM(original_amount), 0) as original_amount,
        COALESCE(SUM(remaining_amount), 0) as outstanding_amount
      FROM debts
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY type
      ORDER BY outstanding_amount DESC
    `;
    
    const typeResult = await client.query(typeQuery, [startDate, endDate]);
    analytics.debtsByType = typeResult.rows;

    // Debt by Priority
    const priorityQuery = `
      SELECT 
        priority,
        COUNT(*) as count,
        COALESCE(SUM(remaining_amount), 0) as outstanding_amount
      FROM debts
      WHERE created_at >= $1 AND created_at <= $2
        AND status NOT IN ('cleared')
      GROUP BY priority
      ORDER BY 
        CASE priority
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
          ELSE 4
        END
    `;
    
    const priorityResult = await client.query(priorityQuery, [startDate, endDate]);
    analytics.debtsByPriority = priorityResult.rows;

    // Aging Analysis (current date vs due date)
    const agingQuery = `
      SELECT 
        CASE 
          WHEN due_date IS NULL THEN 'No Due Date'
          WHEN due_date > CURRENT_DATE THEN 'Not Due'
          WHEN due_date >= CURRENT_DATE - INTERVAL '30 days' THEN '0-30 days overdue'
          WHEN due_date >= CURRENT_DATE - INTERVAL '60 days' THEN '31-60 days overdue'
          WHEN due_date >= CURRENT_DATE - INTERVAL '90 days' THEN '61-90 days overdue'
          ELSE 'Over 90 days overdue'
        END as aging_bucket,
        COUNT(*) as count,
        COALESCE(SUM(remaining_amount), 0) as outstanding_amount
      FROM debts
      WHERE created_at >= $1 AND created_at <= $2
        AND status NOT IN ('cleared')
      GROUP BY aging_bucket
      ORDER BY 
        CASE aging_bucket
          WHEN 'Not Due' THEN 1
          WHEN 'No Due Date' THEN 2
          WHEN '0-30 days overdue' THEN 3
          WHEN '31-60 days overdue' THEN 4
          WHEN '61-90 days overdue' THEN 5
          ELSE 6
        END
    `;
    
    const agingResult = await client.query(agingQuery, [startDate, endDate]);
    analytics.agingAnalysis = agingResult.rows;

    // Top Creditors by Outstanding Amount
    const creditorsQuery = `
      SELECT 
        creditor_name,
        COUNT(*) as debt_count,
        COALESCE(SUM(original_amount), 0) as total_borrowed,
        COALESCE(SUM(paid_amount), 0) as total_paid,
        COALESCE(SUM(remaining_amount), 0) as outstanding_amount
      FROM debts
      WHERE created_at >= $1 AND created_at <= $2
        AND status NOT IN ('cleared')
      GROUP BY creditor_name
      ORDER BY outstanding_amount DESC
      LIMIT 10
    `;
    
    const creditorsResult = await client.query(creditorsQuery, [startDate, endDate]);
    analytics.topCreditors = creditorsResult.rows;

    // Payment History (during period)
    const paymentHistoryQuery = `
      SELECT 
        DATE(dp.payment_date) as date,
        COUNT(*) as payment_count,
        COALESCE(SUM(dp.amount), 0) as total_paid
      FROM debt_payments dp
      JOIN debts d ON dp.debt_id = d.id
      WHERE dp.payment_date >= $1 AND dp.payment_date <= $2
      GROUP BY DATE(dp.payment_date)
      ORDER BY date ASC
    `;
    
    const paymentHistoryResult = await client.query(paymentHistoryQuery, [startDate, endDate]);
    analytics.paymentHistory = paymentHistoryResult.rows;

    // Upcoming Due Dates (next 30 days from end date)
    const upcomingQuery = `
      SELECT 
        id,
        creditor_name,
        description,
        remaining_amount,
        due_date,
        priority,
        status
      FROM debts
      WHERE due_date > $2 AND due_date <= $2 + INTERVAL '30 days'
        AND status NOT IN ('cleared')
      ORDER BY due_date ASC
      LIMIT 20
    `;
    
    const upcomingResult = await client.query(upcomingQuery, [startDate, endDate]);
    analytics.upcomingDueDates = upcomingResult.rows;

    return analytics;
  } catch (error) {
    logger.error('Error calculating debt analytics:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Calculate Daily Operations Summary
 * Includes: daily order summary, stock movements, delivery completions, revenue by day
 * @param {Date} startDate - Start date for the report period
 * @param {Date} endDate - End date for the report period
 * @param {Object} filters - Additional filters
 * @returns {Object} Daily operations analytics data
 */
async function calculateDailyOperationsAnalytics(startDate, endDate, filters = {}) {
  const client = await pool.connect();
  try {
    const analytics = {};

    // Daily Summary
    const dailySummaryQuery = `
      SELECT 
        DATE(day) as date,
        COALESCE(order_count, 0) as orders,
        COALESCE(revenue, 0) as revenue,
        COALESCE(delivery_count, 0) as deliveries,
        COALESCE(completed_deliveries, 0) as completed_deliveries
      FROM generate_series($1::date, $2::date, '1 day'::interval) day
      LEFT JOIN (
        SELECT 
          DATE(created_at) as order_date,
          COUNT(*) as order_count,
          SUM(total_amount) as revenue
        FROM orders
        WHERE created_at >= $1 AND created_at <= $2
          AND order_status NOT IN ('cancelled', 'failed')
        GROUP BY DATE(created_at)
      ) orders ON DATE(day) = order_date
      LEFT JOIN (
        SELECT 
          DATE(created_at) as delivery_date,
          COUNT(*) as delivery_count,
          COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed_deliveries
        FROM deliveries
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY DATE(created_at)
      ) deliveries ON DATE(day) = delivery_date
      ORDER BY date ASC
    `;
    
    const dailySummaryResult = await client.query(dailySummaryQuery, [startDate, endDate]);
    analytics.dailySummary = dailySummaryResult.rows;

    // Period Totals
    const totalsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM orders WHERE created_at >= $1 AND created_at <= $2 AND order_status NOT IN ('cancelled', 'failed')) as total_orders,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE created_at >= $1 AND created_at <= $2 AND order_status NOT IN ('cancelled', 'failed')) as total_revenue,
        (SELECT COUNT(*) FROM deliveries WHERE created_at >= $1 AND created_at <= $2) as total_deliveries,
        (SELECT COUNT(*) FROM deliveries WHERE created_at >= $1 AND created_at <= $2 AND status = 'delivered') as completed_deliveries,
        (SELECT COUNT(*) FROM stock_adjustments WHERE created_at >= $1 AND created_at <= $2) as stock_adjustments,
        (SELECT COUNT(DISTINCT customer_id) FROM orders WHERE created_at >= $1 AND created_at <= $2) as unique_customers
    `;
    
    const totalsResult = await client.query(totalsQuery, [startDate, endDate]);
    analytics.periodTotals = totalsResult.rows[0];

    // Hourly Activity Pattern (for operational insights)
    const hourlyQuery = `
      SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as order_count
      FROM orders
      WHERE created_at >= $1 AND created_at <= $2
        AND order_status NOT IN ('cancelled', 'failed')
      GROUP BY hour
      ORDER BY hour ASC
    `;
    
    const hourlyResult = await client.query(hourlyQuery, [startDate, endDate]);
    analytics.hourlyPattern = hourlyResult.rows;

    // Stock Movements Summary
    const stockMovementsQuery = `
      SELECT 
        type,
        COUNT(*) as count,
        SUM(quantity) as total_quantity
      FROM stock_adjustments
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY type
      ORDER BY count DESC
    `;
    
    const stockMovementsResult = await client.query(stockMovementsQuery, [startDate, endDate]);
    analytics.stockMovementsSummary = stockMovementsResult.rows;

    // Recent Critical Stock Alerts
    const stockAlertsQuery = `
      SELECT 
        id,
        sku,
        name,
        quantity,
        min_stock,
        status
      FROM products
      WHERE quantity = 0 OR (quantity > 0 AND quantity <= min_stock)
      ORDER BY 
        CASE 
          WHEN quantity = 0 THEN 0
          ELSE (quantity::float / NULLIF(min_stock, 0))
        END ASC
      LIMIT 10
    `;
    
    const stockAlertsResult = await client.query(stockAlertsQuery);
    analytics.stockAlerts = stockAlertsResult.rows;

    return analytics;
  } catch (error) {
    logger.error('Error calculating daily operations analytics:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Calculate Financial Summary Analytics
 * Includes: total revenue, expenses (if tracked), profit margins, period comparisons
 * @param {Date} startDate - Start date for the report period
 * @param {Date} endDate - End date for the report period
 * @param {Object} filters - Additional filters
 * @returns {Object} Financial summary analytics data
 */
async function calculateFinancialSummaryAnalytics(startDate, endDate, filters = {}) {
  const client = await pool.connect();
  try {
    const analytics = {};

    // Revenue Summary
    const revenueQuery = `
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(AVG(total_amount), 0) as average_order_value,
        COUNT(*) as total_transactions,
        COUNT(DISTINCT customer_id) as unique_customers
      FROM orders
      WHERE created_at >= $1 AND created_at <= $2
        AND order_status NOT IN ('cancelled', 'failed')
    `;
    
    const revenueResult = await client.query(revenueQuery, [startDate, endDate]);
    analytics.revenue = revenueResult.rows[0];

    // Cost of Goods Sold (COGS) - based on products sold
    const cogsQuery = `
      SELECT 
        COALESCE(SUM(oi.quantity * COALESCE(p.cost_price, p.price * 0.6, 0)), 0) as total_cogs,
        COALESCE(SUM(oi.total_price), 0) as total_sales,
        COALESCE(SUM(oi.total_price) - SUM(oi.quantity * COALESCE(p.cost_price, p.price * 0.6, 0)), 0) as gross_profit
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      WHERE o.created_at >= $1 AND o.created_at <= $2
        AND o.order_status NOT IN ('cancelled', 'failed')
    `;
    
    const cogsResult = await client.query(cogsQuery, [startDate, endDate]);
    analytics.costAnalysis = cogsResult.rows[0];

    // Calculate profit margin
    const totalSales = parseFloat(analytics.costAnalysis.total_sales) || 0;
    const grossProfit = parseFloat(analytics.costAnalysis.gross_profit) || 0;
    analytics.costAnalysis.gross_profit_margin = totalSales > 0 
      ? ((grossProfit / totalSales) * 100).toFixed(2)
      : '0.00';

    // Outstanding Debts (expenses/payables)
    const debtsQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'payable' THEN remaining_amount ELSE 0 END), 0) as payables,
        COALESCE(SUM(CASE WHEN type = 'receivable' THEN remaining_amount ELSE 0 END), 0) as receivables,
        COUNT(CASE WHEN type = 'payable' AND status != 'cleared' THEN 1 END) as pending_payables,
        COUNT(CASE WHEN type = 'receivable' AND status != 'cleared' THEN 1 END) as pending_receivables
      FROM debts
    `;
    
    const debtsResult = await client.query(debtsQuery);
    analytics.debts = debtsResult.rows[0];

    // Inventory Value
    const inventoryQuery = `
      SELECT 
        COALESCE(SUM(quantity * COALESCE(cost_price, price, 0)), 0) as inventory_value,
        COUNT(*) as product_count
      FROM products
      WHERE quantity > 0 AND status = 'active'
    `;
    
    const inventoryResult = await client.query(inventoryQuery);
    analytics.inventory = inventoryResult.rows[0];

    // Period Comparison (compare with previous period of same length)
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - daysDiff);
    const previousEndDate = new Date(startDate);

    const comparisonQuery = `
      SELECT 
        COALESCE(SUM(total_amount), 0) as previous_revenue,
        COUNT(*) as previous_orders,
        COALESCE(AVG(total_amount), 0) as previous_avg_order_value
      FROM orders
      WHERE created_at >= $1 AND created_at < $2
        AND order_status NOT IN ('cancelled', 'failed')
    `;
    
    const comparisonResult = await client.query(comparisonQuery, [previousStartDate, previousEndDate]);
    analytics.previousPeriod = comparisonResult.rows[0];

    // Calculate growth percentages
    const currentRevenue = parseFloat(analytics.revenue.total_revenue) || 0;
    const previousRevenue = parseFloat(analytics.previousPeriod.previous_revenue) || 0;
    const currentOrders = parseInt(analytics.revenue.total_transactions) || 0;
    const previousOrders = parseInt(analytics.previousPeriod.previous_orders) || 0;

    analytics.growth = {
      revenue_growth: previousRevenue > 0 
        ? (((currentRevenue - previousRevenue) / previousRevenue) * 100).toFixed(2)
        : '0.00',
      orders_growth: previousOrders > 0 
        ? (((currentOrders - previousOrders) / previousOrders) * 100).toFixed(2)
        : '0.00'
    };

    // Payment Methods Revenue Breakdown
    const paymentMethodsQuery = `
      SELECT 
        payment_method,
        COUNT(*) as transaction_count,
        COALESCE(SUM(total_amount), 0) as revenue
      FROM orders
      WHERE created_at >= $1 AND created_at <= $2
        AND order_status NOT IN ('cancelled', 'failed')
      GROUP BY payment_method
      ORDER BY revenue DESC
    `;
    
    const paymentMethodsResult = await client.query(paymentMethodsQuery, [startDate, endDate]);
    analytics.paymentMethods = paymentMethodsResult.rows;

    // Revenue by Date
    const revenueTrendQuery = `
      SELECT 
        DATE(created_at) as date,
        COALESCE(SUM(total_amount), 0) as revenue,
        COUNT(*) as orders
      FROM orders
      WHERE created_at >= $1 AND created_at <= $2
        AND order_status NOT IN ('cancelled', 'failed')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;
    
    const revenueTrendResult = await client.query(revenueTrendQuery, [startDate, endDate]);
    analytics.revenueTrend = revenueTrendResult.rows;

    // Key Financial Ratios
    analytics.ratios = {
      current_assets: currentRevenue + parseFloat(analytics.inventory.inventory_value) + parseFloat(analytics.debts.receivables),
      current_liabilities: parseFloat(analytics.debts.payables),
      working_capital: (currentRevenue + parseFloat(analytics.inventory.inventory_value) + parseFloat(analytics.debts.receivables)) - parseFloat(analytics.debts.payables),
      inventory_turnover: parseFloat(analytics.inventory.inventory_value) > 0 
        ? (parseFloat(analytics.costAnalysis.total_cogs) / parseFloat(analytics.inventory.inventory_value)).toFixed(2)
        : '0.00'
    };

    return analytics;
  } catch (error) {
    logger.error('Error calculating financial summary analytics:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get all analytics for a given report type
 * @param {String} reportType - Type of report (sales, stock, delivery, etc.)
 * @param {Date} startDate - Start date for the report period
 * @param {Date} endDate - End date for the report period
 * @param {Object} filters - Additional filters
 * @returns {Object} Analytics data for the specified report type
 */
async function getAnalyticsByType(reportType, startDate, endDate, filters = {}) {
  switch (reportType) {
    case 'sales':
      return await calculateSalesAnalytics(startDate, endDate, filters);
    case 'stock':
      return await calculateStockAnalytics(startDate, endDate, filters);
    case 'delivery':
      return await calculateDeliveryAnalytics(startDate, endDate, filters);
    case 'staff_performance':
      return await calculateStaffAnalytics(startDate, endDate, filters);
    case 'debt':
      return await calculateDebtAnalytics(startDate, endDate, filters);
    case 'daily_operations':
      return await calculateDailyOperationsAnalytics(startDate, endDate, filters);
    case 'financial_summary':
      return await calculateFinancialSummaryAnalytics(startDate, endDate, filters);
    default:
      throw new Error(`Unknown report type: ${reportType}`);
  }
}

module.exports = {
  calculateSalesAnalytics,
  calculateStockAnalytics,
  calculateDeliveryAnalytics,
  calculateStaffAnalytics,
  calculateDebtAnalytics,
  calculateDailyOperationsAnalytics,
  calculateFinancialSummaryAnalytics,
  getAnalyticsByType
};
