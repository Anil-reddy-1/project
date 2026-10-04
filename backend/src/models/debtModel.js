const pool = require('../config/db');

/**
 * Debt & Payables Data Access Layer
 */

function mapDebtRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    description: row.description,
    creditorName: row.creditor_name,
    invoiceNumber: row.invoice_number,
    referenceNumber: row.reference_number,
    priority: row.priority,
    type: row.type || 'payable',
    originalAmount: parseFloat(row.original_amount) || 0,
    paidAmount: parseFloat(row.paid_amount) || 0,
    remainingAmount: parseFloat(row.remaining_amount) || 0,
    status: row.status,
    dueDate: row.due_date,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function createDebt({ description, creditorName, invoiceNumber, referenceNumber, priority, type, amount, dueDate, notes }) {
  const query = `
    INSERT INTO debts (description, creditor_name, invoice_number, reference_number, priority, type, original_amount, paid_amount, remaining_amount, status, due_date, notes)
    VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $7, 'pending', $8, $9)
    RETURNING *;
  `;
  const values = [description, creditorName, invoiceNumber, referenceNumber, priority || 'medium', type || 'payable', amount, dueDate, notes];
  const result = await pool.query(query, values);
  return mapDebtRow(result.rows[0]);
}

async function findDebtById(id) {
  const query = 'SELECT * FROM debts WHERE id = $1;';
  const result = await pool.query(query, [id]);
  return mapDebtRow(result.rows[0]);
}

async function findAllDebts({ page = 1, limit = 20, status, type, overdue = false }) {
  const offset = (page - 1) * limit;
  const whereClauses = [];
  const queryParams = [];

  if (status) {
    queryParams.push(status);
    whereClauses.push(`status = $${queryParams.length}`);
  }

  if (type) {
    queryParams.push(type);
    whereClauses.push(`type = $${queryParams.length}`);
  }

  if (overdue) {
    whereClauses.push(`due_date < CURRENT_TIMESTAMP AND status != 'cleared'`);
  }

  const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countQuery = `SELECT COUNT(*) FROM debts ${whereString};`;
  const countResult = await pool.query(countQuery, queryParams);
  const total = parseInt(countResult.rows[0].count, 10);

  const dataParams = [...queryParams, limit, offset];
  const dataQuery = `
    SELECT * FROM debts
    ${whereString}
    ORDER BY due_date ASC
    LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length};
  `;
  const dataResult = await pool.query(dataQuery, dataParams);

  return {
    debts: dataResult.rows.map(mapDebtRow),
    total,
  };
}

async function recordPayment(debtId, amount, paymentDate, paymentMethod, referenceNumber, recordedBy) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get current debt
    const debtResult = await client.query('SELECT paid_amount, remaining_amount, original_amount FROM debts WHERE id = $1 FOR UPDATE', [debtId]);
    if (debtResult.rows.length === 0) {
      throw new Error('Debt not found');
    }

    const debt = debtResult.rows[0];
    const newPaidAmount = debt.paid_amount + amount;
    const newRemainingAmount = debt.remaining_amount - amount;

    if (newRemainingAmount < 0) {
      throw new Error('Payment exceeds remaining amount');
    }

    const newStatus = newRemainingAmount === 0 ? 'cleared' : (newPaidAmount > 0 ? 'partial' : 'pending');

    // Update debt
    await client.query(
      `UPDATE debts
       SET paid_amount = $1, remaining_amount = $2, status = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [newPaidAmount, newRemainingAmount, newStatus, debtId]
    );

    // Record payment
    const paymentResult = await client.query(
      `INSERT INTO debt_payments (debt_id, amount, payment_date, payment_method, reference_number, recorded_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *;`,
      [debtId, amount, paymentDate, paymentMethod, referenceNumber, recordedBy]
    );

    await client.query('COMMIT');

    return {
      id: paymentResult.rows[0].id,
      debtId: paymentResult.rows[0].debt_id,
      amount: paymentResult.rows[0].amount,
      previousBalance: debt.remaining_amount,
      newBalance: newRemainingAmount,
      paymentDate: paymentResult.rows[0].payment_date,
      recordedBy: paymentResult.rows[0].recorded_by,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getDebtSummary(type) {
  const typeFilter = type ? `WHERE type = '${type}'` : '';
  const query = `
    SELECT
      SUM(CASE WHEN status != 'cleared' THEN remaining_amount ELSE 0 END) as total_pending,
      SUM(CASE WHEN status = 'partial' THEN remaining_amount ELSE 0 END) as total_partial,
      SUM(paid_amount) as total_cleared,
      COUNT(CASE WHEN due_date < CURRENT_TIMESTAMP AND status != 'cleared' THEN 1 END) as overdue_count
    FROM debts ${typeFilter};
  `;
  const result = await pool.query(query);
  return result.rows[0];
}

module.exports = {
  createDebt,
  findDebtById,
  findAllDebts,
  recordPayment,
  getDebtSummary,
};
