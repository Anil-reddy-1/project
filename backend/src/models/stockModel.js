const pool = require('../config/db');

/**
 * Stock/Inventory Data Access Layer
 */

function mapStockRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    category: row.category,
    quantity: row.quantity,
    unit: row.unit,
    minStock: row.min_stock,
    maxStock: row.max_stock,
    price: row.price,
    status: row.status,
    lastUpdated: row.last_updated,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function createStock({ sku, name, category, quantity, unit, minStock, maxStock, price }) {
  const query = `
    INSERT INTO stock (sku, name, category, quantity, unit, min_stock, max_stock, price, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
    RETURNING *;
  `;
  const values = [sku, name, category, quantity, unit, minStock, maxStock, price];
  const result = await pool.query(query, values);
  return mapStockRow(result.rows[0]);
}

async function findStockById(id) {
  const query = 'SELECT * FROM stock WHERE id = $1;';
  const result = await pool.query(query, [id]);
  return mapStockRow(result.rows[0]);
}

async function findAllStock({ page = 1, limit = 20, search, status, category }) {
  const offset = (page - 1) * limit;
  const whereClauses = [];
  const queryParams = [];

  if (status) {
    queryParams.push(status);
    whereClauses.push(`status = $${queryParams.length}`);
  }

  if (category) {
    queryParams.push(category);
    whereClauses.push(`category = $${queryParams.length}`);
  }

  if (search) {
    queryParams.push(`%${search.toLowerCase()}%`);
    whereClauses.push(`(LOWER(name) LIKE $${queryParams.length} OR LOWER(sku) LIKE $${queryParams.length})`);
  }

  const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countQuery = `SELECT COUNT(*) FROM stock ${whereString};`;
  const countResult = await pool.query(countQuery, queryParams);
  const total = parseInt(countResult.rows[0].count, 10);

  const dataParams = [...queryParams, limit, offset];
  const dataQuery = `
    SELECT * FROM stock
    ${whereString}
    ORDER BY created_at DESC
    LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length};
  `;
  const dataResult = await pool.query(dataQuery, dataParams);

  return {
    items: dataResult.rows.map(mapStockRow),
    total,
  };
}

async function updateStock(id, updateFields) {
  const setClauses = [];
  const queryParams = [];

  const allowedFields = {
    name: 'name',
    quantity: 'quantity',
    minStock: 'min_stock',
    maxStock: 'max_stock',
    price: 'price',
    status: 'status',
    category: 'category',
  };

  Object.keys(updateFields).forEach((key) => {
    if (allowedFields[key] && updateFields[key] !== undefined) {
      queryParams.push(updateFields[key]);
      setClauses.push(`${allowedFields[key]} = $${queryParams.length}`);
    }
  });

  if (setClauses.length === 0) {
    return findStockById(id);
  }

  setClauses.push('updated_at = CURRENT_TIMESTAMP');
  queryParams.push(id);

  const query = `
    UPDATE stock
    SET ${setClauses.join(', ')}
    WHERE id = $${queryParams.length}
    RETURNING *;
  `;

  const result = await pool.query(query, queryParams);
  return mapStockRow(result.rows[0]);
}

async function adjustStock(productId, type, quantity, reason, notes, performedBy) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get current stock
    const currentResult = await client.query('SELECT quantity FROM stock WHERE id = $1 FOR UPDATE', [productId]);
    if (currentResult.rows.length === 0) {
      throw new Error('Stock not found');
    }

    const previousQuantity = currentResult.rows[0].quantity;
    let newQuantity;

    if (type === 'add') {
      newQuantity = previousQuantity + quantity;
    } else if (type === 'subtract') {
      newQuantity = previousQuantity - quantity;
      if (newQuantity < 0) {
        throw new Error('Insufficient stock');
      }
    } else {
      throw new Error('Invalid adjustment type');
    }

    // Update stock
    await client.query(
      'UPDATE stock SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newQuantity, productId]
    );

    // Record adjustment
    const adjResult = await client.query(
      `INSERT INTO stock_adjustments (product_id, type, quantity, previous_quantity, new_quantity, reason, notes, performed_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *;`,
      [productId, type, quantity, previousQuantity, newQuantity, reason, notes, performedBy]
    );

    await client.query('COMMIT');
    return {
      id: adjResult.rows[0].id,
      productId: adjResult.rows[0].product_id,
      type: adjResult.rows[0].type,
      quantity: adjResult.rows[0].quantity,
      previousQuantity: adjResult.rows[0].previous_quantity,
      newQuantity: adjResult.rows[0].new_quantity,
      reason: adjResult.rows[0].reason,
      performedBy: adjResult.rows[0].performed_by,
      timestamp: adjResult.rows[0].created_at,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getStockHistory(productId, limit = 50) {
  const query = `
    SELECT * FROM stock_adjustments
    WHERE product_id = $1
    ORDER BY created_at DESC
    LIMIT $2;
  `;
  const result = await pool.query(query, [productId, limit]);
  return result.rows.map(row => ({
    id: row.id,
    type: row.type,
    quantity: row.quantity,
    previousQuantity: row.previous_quantity,
    newQuantity: row.new_quantity,
    reason: row.reason,
    performedBy: row.performed_by,
    timestamp: row.created_at,
  }));
}

module.exports = {
  createStock,
  findStockById,
  findAllStock,
  updateStock,
  adjustStock,
  getStockHistory,
};
