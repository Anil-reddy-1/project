const { success } = require('../utils/response');
const pool = require('../config/db');
const logger = require('../utils/logger');

/**
 * Dashboard & Analytics Controller
 */

async function getDashboardStats(req, res, next) {
  try {
    // Get revenue stats (last 30 days)
    const revenueQuery = `
      SELECT 
        COALESCE(SUM(total_amount), 0) as total,
        COUNT(*) as order_count
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '30 days';
    `;
    const revenueResult = await pool.query(revenueQuery);
    const revenue = {
      total: parseFloat(revenueResult.rows[0].total) || 0,
      change: 12, // Placeholder for percentage change
      period: 'month',
    };

    // Get order stats
    const ordersQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN order_status = 'pending' OR order_status = 'confirmed' THEN 1 END) as pending
      FROM orders;
    `;
    const ordersResult = await pool.query(ordersQuery);
    const orders = {
      total: parseInt(ordersResult.rows[0].total, 10) || 0,
      change: 8, // Placeholder
      pending: parseInt(ordersResult.rows[0].pending, 10) || 0,
    };

    // Get low stock items
    const lowStockQuery = `
      SELECT COUNT(*) as count
      FROM stock
      WHERE quantity <= min_stock AND status = 'active';
    `;
    const lowStockResult = await pool.query(lowStockQuery);
    const lowStockItems = parseInt(lowStockResult.rows[0].count, 10) || 0;

    // Get active deliveries
    const deliveriesQuery = `
      SELECT COUNT(*) as count
      FROM deliveries
      WHERE status IN ('assigned', 'accepted', 'in_transit');
    `;
    const deliveriesResult = await pool.query(deliveriesQuery);
    const activeDeliveries = parseInt(deliveriesResult.rows[0].count, 10) || 0;

    // Get pending debts
    const debtsQuery = `
      SELECT COALESCE(SUM(remaining_amount), 0) as total
      FROM debts
      WHERE status IN ('pending', 'partial');
    `;
    const debtsResult = await pool.query(debtsQuery);
    const pendingDebts = parseFloat(debtsResult.rows[0].total) || 0;

    return success(res, {
      data: {
        revenue,
        orders,
        lowStockItems,
        activeDeliveries,
        pendingDebts,
      },
      message: 'Dashboard statistics retrieved successfully',
    });
  } catch (error) {
    logger.error('Dashboard stats error:', error);
    next(error);
  }
}

module.exports = {
  getDashboardStats,
};
