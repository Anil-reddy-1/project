const pool = require('../config/db');

/**
 * Delivery Data Access Layer
 * Handles delivery and delivery_status_history database operations
 */

/**
 * Map database row to delivery object with camelCase naming
 */
function mapDeliveryRow(row) {
  if (!row) return null;
  
  return {
    id: row.id,
    orderId: row.order_id,
    deliveryPartnerId: row.delivery_partner_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    deliveryAddress: row.delivery_address,
    status: row.status,
    assignedAt: row.assigned_at,
    acceptedAt: row.accepted_at,
    startedAt: row.started_at,
    deliveredAt: row.delivered_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Map delivery status history row
 */
function mapStatusHistoryRow(row) {
  if (!row) return null;
  
  return {
    id: row.id,
    deliveryId: row.delivery_id,
    status: row.status,
    changedBy: row.changed_by,
    notes: row.notes,
    createdAt: row.created_at
  };
}

/**
 * Create delivery (usually done automatically by trigger when order is confirmed)
 * Can also be called manually if needed
 */
async function createDelivery(deliveryData, client = null) {
  const shouldManageConnection = !client;
  const dbClient = client || await pool.connect();
  
  try {
    const query = `
      INSERT INTO deliveries (
        order_id, customer_name, customer_phone, 
        delivery_address, status, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    
    const values = [
      deliveryData.orderId,
      deliveryData.customerName,
      deliveryData.customerPhone,
      JSON.stringify(deliveryData.deliveryAddress),
      deliveryData.status || 'pending',
      deliveryData.notes || null
    ];
    
    const result = await dbClient.query(query, values);
    return mapDeliveryRow(result.rows[0]);
  } finally {
    if (shouldManageConnection) {
      dbClient.release();
    }
  }
}

/**
 * Find delivery by ID
 */
async function findDeliveryById(deliveryId) {
  const query = 'SELECT * FROM deliveries WHERE id = $1;';
  const result = await pool.query(query, [deliveryId]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return mapDeliveryRow(result.rows[0]);
}

/**
 * Find delivery by order ID
 */
async function findDeliveryByOrderId(orderId) {
  const query = 'SELECT * FROM deliveries WHERE order_id = $1;';
  const result = await pool.query(query, [orderId]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return mapDeliveryRow(result.rows[0]);
}

/**
 * Find deliveries by partner ID (for delivery partner's view)
 */
async function findDeliveriesByPartnerId(partnerId, { page = 1, limit = 20, status } = {}) {
  const offset = (page - 1) * limit;
  const whereClauses = ['delivery_partner_id = $1'];
  const queryParams = [partnerId];
  
  if (status) {
    queryParams.push(status);
    whereClauses.push(`status = $${queryParams.length}`);
  }
  
  const whereString = whereClauses.join(' AND ');
  
  // Count total
  const countQuery = `SELECT COUNT(*) FROM deliveries WHERE ${whereString};`;
  const countResult = await pool.query(countQuery, queryParams);
  const total = parseInt(countResult.rows[0].count, 10);
  
  // Fetch deliveries with order details
  const dataParams = [...queryParams, limit, offset];
  const dataQuery = `
    SELECT 
      d.*,
      o.order_number,
      o.total_amount,
      o.order_status
    FROM deliveries d
    INNER JOIN orders o ON d.order_id = o.id
    WHERE ${whereString}
    ORDER BY d.created_at DESC
    LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length};
  `;
  const dataResult = await pool.query(dataQuery, dataParams);
  
  const deliveries = dataResult.rows.map(row => ({
    ...mapDeliveryRow(row),
    orderNumber: row.order_number,
    totalAmount: parseFloat(row.total_amount),
    orderStatus: row.order_status
  }));
  
  return {
    deliveries,
    total,
    page,
    limit
  };
}

/**
 * Find pending deliveries (unassigned deliveries for admin)
 */
async function findPendingDeliveries({ page = 1, limit = 20, status } = {}) {
  const offset = (page - 1) * limit;
  const whereClauses = [];
  const queryParams = [];
  
  if (status) {
    queryParams.push(status);
    whereClauses.push(`d.status = $${queryParams.length}`);
  } else {
    // Default to pending/unassigned deliveries
    whereClauses.push(`d.status IN ('pending', 'assigned')`);
  }
  
  const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  
  // Count total
  const countQuery = `
    SELECT COUNT(*) 
    FROM deliveries d
    ${whereString};
  `;
  const countResult = await pool.query(countQuery, queryParams);
  const total = parseInt(countResult.rows[0].count, 10);
  
  // Fetch deliveries with order and customer details
  const dataParams = [...queryParams, limit, offset];
  const dataQuery = `
    SELECT 
      d.*,
      o.order_number,
      o.total_amount,
      o.order_status,
      o.firebase_uid as customer_firebase_uid,
      u.name as customer_db_name,
      u.email as customer_email,
      partner.name as partner_name,
      partner.email as partner_email
    FROM deliveries d
    INNER JOIN orders o ON d.order_id = o.id
    LEFT JOIN users u ON o.user_id = u.id
    LEFT JOIN users partner ON d.delivery_partner_id = partner.id
    ${whereString}
    ORDER BY d.created_at DESC
    LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length};
  `;
  const dataResult = await pool.query(dataQuery, dataParams);
  
  const deliveries = dataResult.rows.map(row => ({
    ...mapDeliveryRow(row),
    orderNumber: row.order_number,
    totalAmount: parseFloat(row.total_amount),
    orderStatus: row.order_status,
    customerFirebaseUid: row.customer_firebase_uid,
    customerDbName: row.customer_db_name,
    customerEmail: row.customer_email,
    partnerName: row.partner_name,
    partnerEmail: row.partner_email
  }));
  
  return {
    deliveries,
    total,
    page,
    limit
  };
}

/**
 * Find all deliveries (admin view) with filters
 */
async function findAllDeliveries({ page = 1, limit = 20, status, partnerId, dateFrom, dateTo } = {}) {
  const offset = (page - 1) * limit;
  const whereClauses = [];
  const queryParams = [];
  
  if (status) {
    queryParams.push(status);
    whereClauses.push(`d.status = $${queryParams.length}`);
  }
  
  if (partnerId) {
    queryParams.push(partnerId);
    whereClauses.push(`d.delivery_partner_id = $${queryParams.length}`);
  }
  
  if (dateFrom) {
    queryParams.push(new Date(dateFrom));
    whereClauses.push(`d.created_at >= $${queryParams.length}`);
  }
  
  if (dateTo) {
    queryParams.push(new Date(dateTo));
    whereClauses.push(`d.created_at <= $${queryParams.length}`);
  }
  
  const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  
  // Count total
  const countQuery = `SELECT COUNT(*) FROM deliveries d ${whereString};`;
  const countResult = await pool.query(countQuery, queryParams);
  const total = parseInt(countResult.rows[0].count, 10);
  
  // Fetch deliveries with full details
  const dataParams = [...queryParams, limit, offset];
  const dataQuery = `
    SELECT 
      d.*,
      o.order_number,
      o.total_amount,
      o.order_status,
      o.firebase_uid as customer_firebase_uid,
      u.name as customer_db_name,
      u.email as customer_email,
      partner.name as partner_name,
      partner.email as partner_email
    FROM deliveries d
    INNER JOIN orders o ON d.order_id = o.id
    LEFT JOIN users u ON o.user_id = u.id
    LEFT JOIN users partner ON d.delivery_partner_id = partner.id
    ${whereString}
    ORDER BY d.created_at DESC
    LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length};
  `;
  const dataResult = await pool.query(dataQuery, dataParams);
  
  const deliveries = dataResult.rows.map(row => ({
    ...mapDeliveryRow(row),
    orderNumber: row.order_number,
    totalAmount: parseFloat(row.total_amount),
    orderStatus: row.order_status,
    customerFirebaseUid: row.customer_firebase_uid,
    customerDbName: row.customer_db_name,
    customerEmail: row.customer_email,
    partnerName: row.partner_name,
    partnerEmail: row.partner_email
  }));
  
  return {
    deliveries,
    total,
    page,
    limit
  };
}

/**
 * Assign delivery to a partner
 * Updates status to 'assigned' and sets delivery_partner_id
 */
async function assignDeliveryPartner(deliveryId, partnerId, client = null) {
  const shouldManageConnection = !client;
  const dbClient = client || await pool.connect();
  
  try {
    const query = `
      UPDATE deliveries
      SET 
        delivery_partner_id = $1,
        status = 'assigned',
        assigned_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *;
    `;
    
    const result = await dbClient.query(query, [partnerId, deliveryId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return mapDeliveryRow(result.rows[0]);
  } finally {
    if (shouldManageConnection) {
      dbClient.release();
    }
  }
}

/**
 * Update delivery status
 * Automatically updates corresponding timestamp fields
 * Note: The trigger in the database handles status history creation
 */
async function updateDeliveryStatus(deliveryId, status, userId, notes = null, client = null) {
  const shouldManageConnection = !client;
  const dbClient = client || await pool.connect();
  
  try {
    const query = `
      UPDATE deliveries
      SET 
        status = $1,
        notes = COALESCE($2, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *;
    `;
    
    const result = await dbClient.query(query, [status, notes, deliveryId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return mapDeliveryRow(result.rows[0]);
  } finally {
    if (shouldManageConnection) {
      dbClient.release();
    }
  }
}

/**
 * Get delivery status history
 */
async function getDeliveryStatusHistory(deliveryId) {
  const query = `
    SELECT 
      dsh.*,
      u.name as changed_by_name,
      u.email as changed_by_email
    FROM delivery_status_history dsh
    LEFT JOIN users u ON dsh.changed_by::uuid = u.id
    WHERE dsh.delivery_id = $1
    ORDER BY dsh.created_at ASC;
  `;
  
  const result = await pool.query(query, [deliveryId]);
  
  return result.rows.map(row => ({
    ...mapStatusHistoryRow(row),
    changedByName: row.changed_by_name,
    changedByEmail: row.changed_by_email
  }));
}

/**
 * Create status history record manually
 * (Usually handled by trigger, but can be called explicitly if needed)
 */
async function createStatusHistory(deliveryId, status, changedBy, notes = null, client = null) {
  const shouldManageConnection = !client;
  const dbClient = client || await pool.connect();
  
  try {
    const query = `
      INSERT INTO delivery_status_history (
        delivery_id, status, changed_by, notes
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    
    const result = await dbClient.query(query, [deliveryId, status, changedBy, notes]);
    return mapStatusHistoryRow(result.rows[0]);
  } finally {
    if (shouldManageConnection) {
      dbClient.release();
    }
  }
}

/**
 * Get delivery statistics for a partner
 */
async function getPartnerDeliveryStats(partnerId) {
  const query = `
    SELECT 
      COUNT(*) as total_deliveries,
      COUNT(*) FILTER (WHERE status = 'assigned') as assigned_deliveries,
      COUNT(*) FILTER (WHERE status = 'accepted') as accepted_deliveries,
      COUNT(*) FILTER (WHERE status = 'in_transit') as in_transit_deliveries,
      COUNT(*) FILTER (WHERE status = 'delivered') as delivered_deliveries,
      COUNT(*) FILTER (WHERE status = 'failed') as failed_deliveries
    FROM deliveries
    WHERE delivery_partner_id = $1;
  `;
  
  const result = await pool.query(query, [partnerId]);
  
  return {
    totalDeliveries: parseInt(result.rows[0].total_deliveries, 10),
    assignedDeliveries: parseInt(result.rows[0].assigned_deliveries, 10),
    acceptedDeliveries: parseInt(result.rows[0].accepted_deliveries, 10),
    inTransitDeliveries: parseInt(result.rows[0].in_transit_deliveries, 10),
    deliveredDeliveries: parseInt(result.rows[0].delivered_deliveries, 10),
    failedDeliveries: parseInt(result.rows[0].failed_deliveries, 10)
  };
}

module.exports = {
  createDelivery,
  findDeliveryById,
  findDeliveryByOrderId,
  findDeliveriesByPartnerId,
  findPendingDeliveries,
  findAllDeliveries,
  assignDeliveryPartner,
  updateDeliveryStatus,
  getDeliveryStatusHistory,
  createStatusHistory,
  getPartnerDeliveryStats,
  mapDeliveryRow,
  mapStatusHistoryRow
};
