const pool = require('../config/db');

/**
 * Delivery Data Access Layer
 */

function mapDeliveryRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    orderId: row.order_id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerAddress: row.customer_address,
    partnerId: row.partner_id,
    partnerName: row.partner_name,
    status: row.status,
    amount: row.amount,
    assignedAt: row.assigned_at,
    acceptedAt: row.accepted_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function createDelivery({ orderId, customerId, customerName, customerPhone, customerAddress, amount }) {
  const query = `
    INSERT INTO deliveries (order_id, customer_id, customer_name, customer_phone, customer_address, amount, status)
    VALUES ($1, $2, $3, $4, $5, $6, 'pending')
    RETURNING *;
  `;
  const values = [orderId, customerId, customerName, customerPhone, customerAddress, amount];
  const result = await pool.query(query, values);
  return mapDeliveryRow(result.rows[0]);
}

async function findDeliveryById(id) {
  const query = 'SELECT * FROM deliveries WHERE id = $1;';
  const result = await pool.query(query, [id]);
  return mapDeliveryRow(result.rows[0]);
}

async function findAllDeliveries({ page = 1, limit = 20, status, partnerId }) {
  const offset = (page - 1) * limit;
  const whereClauses = [];
  const queryParams = [];

  if (status) {
    queryParams.push(status);
    whereClauses.push(`status = $${queryParams.length}`);
  }

  if (partnerId) {
    queryParams.push(partnerId);
    whereClauses.push(`partner_id = $${queryParams.length}`);
  }

  const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countQuery = `SELECT COUNT(*) FROM deliveries ${whereString};`;
  const countResult = await pool.query(countQuery, queryParams);
  const total = parseInt(countResult.rows[0].count, 10);

  const dataParams = [...queryParams, limit, offset];
  const dataQuery = `
    SELECT * FROM deliveries
    ${whereString}
    ORDER BY created_at DESC
    LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length};
  `;
  const dataResult = await pool.query(dataQuery, dataParams);

  return {
    deliveries: dataResult.rows.map(mapDeliveryRow),
    total,
  };
}

async function assignDelivery(id, partnerId) {
  const query = `
    UPDATE deliveries
    SET partner_id = $1, status = 'assigned', assigned_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *;
  `;
  const result = await pool.query(query, [partnerId, id]);
  return mapDeliveryRow(result.rows[0]);
}

async function updateDeliveryStatus(id, status, notes) {
  const setClauses = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
  const queryParams = [status];

  if (status === 'started') {
    setClauses.push(`started_at = CURRENT_TIMESTAMP`);
  } else if (status === 'completed') {
    setClauses.push(`completed_at = CURRENT_TIMESTAMP`);
  }

  queryParams.push(id);

  const query = `
    UPDATE deliveries
    SET ${setClauses.join(', ')}
    WHERE id = $${queryParams.length}
    RETURNING *;
  `;

  const result = await pool.query(query, queryParams);
  return mapDeliveryRow(result.rows[0]);
}

module.exports = {
  createDelivery,
  findDeliveryById,
  findAllDeliveries,
  assignDelivery,
  updateDeliveryStatus,
};
