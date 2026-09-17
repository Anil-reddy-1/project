const pool = require('../config/db');

/**
 * User Data Access Layer (DAL)
 * Interacts directly with PostgreSQL database using parametrized queries.
 */

/**
 * Map PostgreSQL row to JavaScript user object
 */
function mapUserRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    firebaseUid: row.firebase_uid,
    email: row.email,
    name: row.name,
    phone: row.phone || null,
    role: row.role,
    department: row.department || null,
    avatarUrl: row.avatar_url || null,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Create a new user record in database
 */
async function createUser({ firebaseUid, email, name, phone = null, role = 'buyer', department = null, avatarUrl = null }) {
  const query = `
    INSERT INTO users (firebase_uid, email, name, phone, role, department, avatar_url)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `;
  const values = [firebaseUid, email.toLowerCase().trim(), name.trim(), phone, role.toLowerCase(), department, avatarUrl];
  const result = await pool.query(query, values);
  return mapUserRow(result.rows[0]);
}

/**
 * Find user by ID (UUID or ID string)
 */
async function findUserById(id) {
  const query = 'SELECT * FROM users WHERE id = $1;';
  const result = await pool.query(query, [id]);
  return mapUserRow(result.rows[0]);
}

/**
 * Find user by Firebase UID
 */
async function findUserByFirebaseUid(firebaseUid) {
  const query = 'SELECT * FROM users WHERE firebase_uid = $1;';
  const result = await pool.query(query, [firebaseUid]);
  return mapUserRow(result.rows[0]);
}

/**
 * Find user by Email
 */
async function findUserByEmail(email) {
  const query = 'SELECT * FROM users WHERE LOWER(email) = LOWER($1);';
  const result = await pool.query(query, [email.trim()]);
  return mapUserRow(result.rows[0]);
}

/**
 * Find users with pagination, role filtering, and search
 */
async function findAllUsers({ page = 1, limit = 10, role, search, isActive }) {
  const offset = (page - 1) * limit;
  const whereClauses = [];
  const queryParams = [];

  if (role) {
    queryParams.push(role.toLowerCase());
    whereClauses.push(`role = $${queryParams.length}`);
  }

  if (typeof isActive === 'boolean') {
    queryParams.push(isActive);
    whereClauses.push(`is_active = $${queryParams.length}`);
  }

  if (search && search.trim()) {
    queryParams.push(`%${search.trim().toLowerCase()}%`);
    whereClauses.push(`(LOWER(name) LIKE $${queryParams.length} OR LOWER(email) LIKE $${queryParams.length})`);
  }

  const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Get total count
  const countQuery = `SELECT COUNT(*) FROM users ${whereString};`;
  const countResult = await pool.query(countQuery, queryParams);
  const total = parseInt(countResult.rows[0].count, 10);

  // Fetch paginated rows
  const dataParams = [...queryParams, limit, offset];
  const dataQuery = `
    SELECT * FROM users
    ${whereString}
    ORDER BY created_at DESC
    LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length};
  `;
  const dataResult = await pool.query(dataQuery, dataParams);

  return {
    users: dataResult.rows.map(mapUserRow),
    total,
  };
}

/**
 * Dynamically update user fields with parameterization
 */
async function updateUser(id, updateFields) {
  const setClauses = [];
  const queryParams = [];

  const allowedFields = {
    name: 'name',
    phone: 'phone',
    role: 'role',
    department: 'department',
    avatarUrl: 'avatar_url',
    isActive: 'is_active',
  };

  Object.keys(updateFields).forEach((key) => {
    if (allowedFields[key] && updateFields[key] !== undefined) {
      queryParams.push(key === 'role' ? String(updateFields[key]).toLowerCase() : updateFields[key]);
      setClauses.push(`${allowedFields[key]} = $${queryParams.length}`);
    }
  });

  if (setClauses.length === 0) {
    return findUserById(id);
  }

  // Always update updated_at timestamp
  setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
  queryParams.push(id);

  const query = `
    UPDATE users
    SET ${setClauses.join(', ')}
    WHERE id = $${queryParams.length}
    RETURNING *;
  `;

  const result = await pool.query(query, queryParams);
  return mapUserRow(result.rows[0]);
}

/**
 * Upsert user profile from Firebase sync
 */
async function upsertFirebaseUser({ firebaseUid, email, name, avatarUrl, role = 'buyer' }) {
  const query = `
    INSERT INTO users (firebase_uid, email, name, avatar_url, role)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (firebase_uid) DO UPDATE
    SET email = EXCLUDED.email,
        name = COALESCE(users.name, EXCLUDED.name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
        updated_at = CURRENT_TIMESTAMP
    RETURNING *;
  `;
  const values = [firebaseUid, email.toLowerCase().trim(), name ? name.trim() : 'User', avatarUrl, role.toLowerCase()];
  const result = await pool.query(query, values);
  return mapUserRow(result.rows[0]);
}

/**
 * Soft delete user (sets is_active = false)
 */
async function softDeleteUser(id) {
  const query = `
    UPDATE users
    SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *;
  `;
  const result = await pool.query(query, [id]);
  return mapUserRow(result.rows[0]);
}

/**
 * Hard delete user record
 */
async function deleteUser(id) {
  const query = 'DELETE FROM users WHERE id = $1 RETURNING *;';
  const result = await pool.query(query, [id]);
  return mapUserRow(result.rows[0]);
}

module.exports = {
  createUser,
  findUserById,
  findUserByFirebaseUid,
  findUserByEmail,
  findAllUsers,
  updateUser,
  upsertFirebaseUser,
  softDeleteUser,
  deleteUser,
};
