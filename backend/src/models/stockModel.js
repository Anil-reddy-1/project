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

/**
 * Validate stock availability for multiple items
 * Returns array of items with stock validation results
 */
async function validateStockAvailability(items) {
  const results = [];
  
  for (const item of items) {
    const query = `
      SELECT id, sku, name, quantity, status
      FROM products
      WHERE id = $1;
    `;
    
    const result = await pool.query(query, [item.productId]);
    
    if (result.rows.length === 0) {
      results.push({
        productId: item.productId,
        requestedQuantity: item.quantity,
        available: false,
        reason: 'Product not found'
      });
      continue;
    }
    
    const product = result.rows[0];
    
    if (product.status !== 'active') {
      results.push({
        productId: item.productId,
        productName: product.name,
        requestedQuantity: item.quantity,
        availableQuantity: parseInt(product.quantity, 10),
        available: false,
        reason: 'Product is inactive'
      });
      continue;
    }
    
    const availableQty = parseInt(product.quantity, 10);
    const requestedQty = parseInt(item.quantity, 10);
    
    results.push({
      productId: item.productId,
      productName: product.name,
      productSku: product.sku,
      requestedQuantity: requestedQty,
      availableQuantity: availableQty,
      available: availableQty >= requestedQty,
      reason: availableQty >= requestedQty ? null : 'Insufficient stock'
    });
  }
  
  return results;
}

/**
 * Deduct stock for a product (used during order placement)
 * Must be called within a transaction
 */
async function deductStock(productId, quantity, reason, referenceId, client) {
  // Get current product quantity with row lock
  const getQuery = `
    SELECT id, quantity
    FROM products
    WHERE id = $1
    FOR UPDATE;
  `;
  
  const getResult = await client.query(getQuery, [productId]);
  
  if (getResult.rows.length === 0) {
    throw new Error(`Product ${productId} not found`);
  }
  
  const currentQuantity = parseInt(getResult.rows[0].quantity, 10);
  const newQuantity = currentQuantity - quantity;
  
  if (newQuantity < 0) {
    throw new Error(`Insufficient stock for product ${productId}. Available: ${currentQuantity}, Requested: ${quantity}`);
  }
  
  // Update product quantity
  const updateQuery = `
    UPDATE products
    SET quantity = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *;
  `;
  
  await client.query(updateQuery, [newQuantity, productId]);
  
  // Create stock transaction record
  const transactionQuery = `
    INSERT INTO stock_transactions (
      product_id, transaction_type, quantity_change, quantity_after,
      reason, reference_id, reference_type, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
    RETURNING *;
  `;
  
  const transactionResult = await client.query(transactionQuery, [
    productId,
    'sale',
    -quantity,
    newQuantity,
    reason,
    referenceId,
    'order'
  ]);
  
  return {
    productId,
    previousQuantity: currentQuantity,
    newQuantity,
    quantityDeducted: quantity,
    transactionId: transactionResult.rows[0].id
  };
}

/**
 * Restore stock for a product (used for order cancellation/returns)
 * Must be called within a transaction
 */
async function restoreStock(productId, quantity, reason, referenceId, client) {
  // Get current product quantity with row lock
  const getQuery = `
    SELECT id, quantity
    FROM products
    WHERE id = $1
    FOR UPDATE;
  `;
  
  const getResult = await client.query(getQuery, [productId]);
  
  if (getResult.rows.length === 0) {
    throw new Error(`Product ${productId} not found`);
  }
  
  const currentQuantity = parseInt(getResult.rows[0].quantity, 10);
  const newQuantity = currentQuantity + quantity;
  
  // Update product quantity
  const updateQuery = `
    UPDATE products
    SET quantity = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *;
  `;
  
  await client.query(updateQuery, [newQuantity, productId]);
  
  // Create stock transaction record
  const transactionQuery = `
    INSERT INTO stock_transactions (
      product_id, transaction_type, quantity_change, quantity_after,
      reason, reference_id, reference_type, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
    RETURNING *;
  `;
  
  const transactionResult = await client.query(transactionQuery, [
    productId,
    'return',
    quantity,
    newQuantity,
    reason,
    referenceId,
    'order'
  ]);
  
  return {
    productId,
    previousQuantity: currentQuantity,
    newQuantity,
    quantityRestored: quantity,
    transactionId: transactionResult.rows[0].id
  };
}

/**
 * Get stock transaction history for an order
 */
async function getStockTransactionsByOrder(orderId) {
  const query = `
    SELECT 
      st.*,
      p.name as product_name,
      p.sku as product_sku
    FROM stock_transactions st
    INNER JOIN products p ON st.product_id = p.id
    WHERE st.reference_id = $1 AND st.reference_type = 'order'
    ORDER BY st.created_at;
  `;
  
  const result = await pool.query(query, [orderId]);
  
  return result.rows.map(row => ({
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    productSku: row.product_sku,
    transactionType: row.transaction_type,
    quantityChange: parseInt(row.quantity_change, 10),
    quantityAfter: parseInt(row.quantity_after, 10),
    reason: row.reason,
    createdAt: row.created_at
  }));
}

module.exports = {
  createStock,
  findStockById,
  findAllStock,
  updateStock,
  adjustStock,
  getStockHistory,
  validateStockAvailability,
  deductStock,
  restoreStock,
  getStockTransactionsByOrder
};
