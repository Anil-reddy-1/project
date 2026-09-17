const pool = require('../config/db');

/**
 * Staff Data Access Layer
 */

function mapStaffRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    status: row.status,
    availability: row.availability,
    activeDeliveries: row.active_deliveries || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function createStaff({ name, email, phone, role, status = 'active' }) {
  const query = `
    INSERT INTO staff (name, email, phone, role, status, availability)
    VALUES ($1, $2, $3, $4, $5, 'available')
    RETURNING *;
  `;
  const values = [name, email, phone, role, status];
  const result = await pool.query(query, values);
  return mapStaffRow(result.rows[0]);
}

async function findStaffById(id) {
  const query = 'SELECT * FROM staff WHERE id = $1;';
  const result = await pool.query(query, [id]);
  return mapStaffRow(result.rows[0]);
}

async function findAllStaff({ page = 1, limit = 20, role, status, availability }) {
  const offset = (page - 1) * limit;
  const whereClauses = [];
  const queryParams = [];

  if (role) {
    queryParams.push(role);
    whereClauses.push(`role = $${queryParams.length}`);
  }

  if (status) {
    queryParams.push(status);
    whereClauses.push(`status = $${queryParams.length}`);
  }

  if (availability) {
    queryParams.push(availability);
    whereClauses.push(`availability = $${queryParams.length}`);
  }

  const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countQuery = `SELECT COUNT(*) FROM staff ${whereString};`;
  const countResult = await pool.query(countQuery, queryParams);
  const total = parseInt(countResult.rows[0].count, 10);

  const dataParams = [...queryParams, limit, offset];
  const dataQuery = `
    SELECT * FROM staff
    ${whereString}
    ORDER BY created_at DESC
    LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length};
  `;
  const dataResult = await pool.query(dataQuery, dataParams);

  return {
    staff: dataResult.rows.map(mapStaffRow),
    total,
  };
}

async function updateStaffAvailability(id, availability) {
  const query = `
    UPDATE staff
    SET availability = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *;
  `;
  const result = await pool.query(query, [availability, id]);
  return mapStaffRow(result.rows[0]);
}

module.exports = {
  createStaff,
  findStaffById,
  findAllStaff,
  updateStaffAvailability,
};
