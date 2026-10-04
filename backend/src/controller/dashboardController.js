const { success } = require('../utils/response');
const pool = require('../config/db');
const logger = require('../utils/logger');

/**
 * Dashboard & Analytics Controller
 */

async function getDashboardStats(req, res, next) {
  const client = await pool.connect();
  
  try {
    // Get current period (last 30 days) and previous period for comparison
    const currentPeriodStart = new Date();
    currentPeriodStart.setDate(currentPeriodStart.getDate() - 30);
    
    const previousPeriodStart = new Date();
    previousPeriodStart.setDate(previousPeriodStart.getDate() - 60);
    
    const previousPeriodEnd = new Date();
    previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 30);

    // Get revenue stats with period comparison
    const revenueQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN created_at >= $1 THEN total_amount ELSE 0 END), 0) as current_revenue,
        COALESCE(SUM(CASE WHEN created_at >= $2 AND created_at < $3 THEN total_amount ELSE 0 END), 0) as previous_revenue,
        COUNT(CASE WHEN created_at >= $1 THEN 1 END) as current_orders
      FROM orders
      WHERE created_at >= $2
        AND order_status NOT IN ('cancelled', 'failed');
    `;
    const revenueResult = await client.query(revenueQuery, [
      currentPeriodStart,
      previousPeriodStart,
      previousPeriodEnd
    ]);
    
    const currentRevenue = parseFloat(revenueResult.rows[0].current_revenue) || 0;
    const previousRevenue = parseFloat(revenueResult.rows[0].previous_revenue) || 0;
    const revenueChange = previousRevenue > 0 
      ? parseFloat((((currentRevenue - previousRevenue) / previousRevenue) * 100).toFixed(1))
      : 0;

    const revenue = {
      total: currentRevenue,
      change: revenueChange,
      period: 'month',
    };

    // Get order stats with period comparison
    const ordersQuery = `
      SELECT 
        COUNT(CASE WHEN created_at >= $1 THEN 1 END) as current_total,
        COUNT(CASE WHEN created_at >= $2 AND created_at < $3 THEN 1 END) as previous_total,
        COUNT(CASE WHEN order_status IN ('pending', 'confirmed') THEN 1 END) as pending
      FROM orders
      WHERE created_at >= $2;
    `;
    const ordersResult = await client.query(ordersQuery, [
      currentPeriodStart,
      previousPeriodStart,
      previousPeriodEnd
    ]);
    
    const currentOrders = parseInt(ordersResult.rows[0].current_total, 10) || 0;
    const previousOrders = parseInt(ordersResult.rows[0].previous_total, 10) || 0;
    const ordersChange = previousOrders > 0 
      ? parseFloat((((currentOrders - previousOrders) / previousOrders) * 100).toFixed(1))
      : 0;

    const orders = {
      total: currentOrders,
      change: ordersChange,
      pending: parseInt(ordersResult.rows[0].pending, 10) || 0,
    };

    // Get low stock items (from products table)
    const lowStockQuery = `
      SELECT COUNT(*) as count
      FROM products
      WHERE quantity <= min_stock 
        AND quantity > 0
        AND status = 'active';
    `;
    const lowStockResult = await client.query(lowStockQuery);
    const lowStockItems = parseInt(lowStockResult.rows[0].count, 10) || 0;

    // Get out of stock items
    const outOfStockQuery = `
      SELECT COUNT(*) as count
      FROM products
      WHERE quantity = 0
        AND status = 'active';
    `;
    const outOfStockResult = await client.query(outOfStockQuery);
    const outOfStockItems = parseInt(outOfStockResult.rows[0].count, 10) || 0;

    // Get active deliveries
    const deliveriesQuery = `
      SELECT COUNT(*) as count
      FROM deliveries
      WHERE status IN ('pending', 'assigned', 'accepted', 'in_transit');
    `;
    const deliveriesResult = await client.query(deliveriesQuery);
    const activeDeliveries = parseInt(deliveriesResult.rows[0].count, 10) || 0;

    // Get pending debts
    const debtsQuery = `
      SELECT COALESCE(SUM(remaining_amount), 0) as total
      FROM debts
      WHERE status IN ('pending', 'partial', 'overdue')
        AND type = 'payable';
    `;
    const debtsResult = await client.query(debtsQuery);
    const pendingDebts = parseFloat(debtsResult.rows[0].total) || 0;

    // Get additional insights for analytics
    const insightsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM orders WHERE created_at >= NOW() - INTERVAL '24 hours' AND order_status NOT IN ('cancelled', 'failed')) as orders_today,
        (SELECT COUNT(DISTINCT customer_id) FROM orders WHERE created_at >= $1) as active_customers,
        (SELECT COALESCE(AVG(total_amount), 0) FROM orders WHERE created_at >= $1 AND order_status NOT IN ('cancelled', 'failed')) as avg_order_value,
        (SELECT COUNT(*) FROM deliveries WHERE status = 'delivered' AND delivered_at >= $1) as completed_deliveries
    `;
    const insightsResult = await client.query(insightsQuery, [currentPeriodStart]);
    
    const insights = {
      ordersToday: parseInt(insightsResult.rows[0].orders_today, 10) || 0,
      activeCustomers: parseInt(insightsResult.rows[0].active_customers, 10) || 0,
      avgOrderValue: parseFloat(insightsResult.rows[0].avg_order_value) || 0,
      completedDeliveries: parseInt(insightsResult.rows[0].completed_deliveries, 10) || 0,
    };

    return success(res, {
      data: {
        revenue,
        orders,
        lowStockItems,
        outOfStockItems,
        activeDeliveries,
        pendingDebts,
        insights,
      },
      message: 'Dashboard statistics retrieved successfully',
    });
  } catch (error) {
    logger.error('Dashboard stats error:', error);
    next(error);
  } finally {
    client.release();
  }
}

module.exports = {
  getDashboardStats,
};
