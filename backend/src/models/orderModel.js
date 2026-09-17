const pool = require('../config/db');

/**
 * Order Data Access Layer
 */

function mapOrderRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    totalAmount: row.total_amount,
    status: row.status,
    paymentStatus: row.payment_status,
    deliveryStatus: row.delivery_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function createOrder({ customerId, customerName, customerEmail, totalAmount, deliveryAddress }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders (customer_id, customer_name, customer_email, total_amount, delivery_address, status, payment_status, delivery_status)
       VALUES ($1, $2, $3, $4, $5, 'confirmed', 'pending', 'pending')
       RETURNING *;`,
      [customerId, customerName, customerEmail, totalAmount, JSON.stringify(deliveryAddress)]
    );

    await client.query('COMMIT');
    return mapOrderRow(orderResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function findOrderById(id) {
  const query = 'SELECT * FROM orders WHERE id = $1;';
  const result = await pool.query(query, [id]);
  return mapOrderRow(result.rows[0]);
}

async function findAllOrders({ page = 1, limit = 20, status, dateFrom, dateTo }) {
  const offset = (page - 1) * limit;
  const whereClauses = [];
  const queryParams = [];

  if (status) {
    queryParams.push(status);
    whereClauses.push(`status = $${queryParams.length}`);
  }

  if (dateFrom) {
    queryParams.push(new Date(dateFrom));
    whereClauses.push(`created_at >= $${queryParams.length}`);
  }

  if (dateTo) {
    queryParams.push(new Date(dateTo));
    whereClauses.push(`created_at <= $${queryParams.length}`);
  }

  const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countQuery = `SELECT COUNT(*) FROM orders ${whereString};`;
  const countResult = await pool.query(countQuery, queryParams);
  const total = parseInt(countResult.rows[0].count, 10);

  const dataParams = [...queryParams, limit, offset];
  const dataQuery = `
    SELECT * FROM orders
    ${whereString}
    ORDER BY created_at DESC
    LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length};
  `;
  const dataResult = await pool.query(dataQuery, dataParams);

  return {
    orders: dataResult.rows.map(mapOrderRow),
    total,
  };
}

async function updateOrderStatus(id, status, notes) {
  const query = `
    UPDATE orders
    SET status = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *;
  `;
  const result = await pool.query(query, [status, id]);
  return mapOrderRow(result.rows[0]);
}

module.exports = {
  createOrder,
  findOrderById,
  findAllOrders,
  updateOrderStatus,
};
