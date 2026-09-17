const pool = require('../config/db');
const logger = require('../utils/logger');

/**
 * Initialize Database Tables
 * Creates required tables, indexes, and constraints if they do not exist.
 */
async function initializeTables() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create extension for UUID generation if PostgreSQL < 13
    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

    // Create Users table (with updated roles: admin, buyer, delivery)
    const createUsersTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        firebase_uid VARCHAR(128) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(30),
        role VARCHAR(50) NOT NULL DEFAULT 'buyer' CHECK (role IN ('admin', 'buyer', 'delivery')),
        department VARCHAR(100),
        avatar_url TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await client.query(createUsersTableQuery);

    // Create Staff table
    const createStaffTableQuery = `
      CREATE TABLE IF NOT EXISTS staff (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(30),
        role VARCHAR(50) NOT NULL CHECK (role IN ('manager', 'seller', 'delivery_partner')),
        status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        availability VARCHAR(50) NOT NULL DEFAULT 'available' CHECK (availability IN ('available', 'busy', 'offline')),
        active_deliveries INT DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await client.query(createStaffTableQuery);

    // Create Stock/Inventory table
    const createStockTableQuery = `
      CREATE TABLE IF NOT EXISTS stock (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sku VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        quantity BIGINT NOT NULL DEFAULT 0,
        unit VARCHAR(50),
        min_stock BIGINT DEFAULT 0,
        max_stock BIGINT,
        price DECIMAL(15,2),
        status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'low-stock', 'out-of-stock')),
        last_updated TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await client.query(createStockTableQuery);

    // Create Stock Adjustments table
    const createStockAdjustmentsTableQuery = `
      CREATE TABLE IF NOT EXISTS stock_adjustments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES stock(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL CHECK (type IN ('add', 'subtract')),
        quantity BIGINT NOT NULL,
        previous_quantity BIGINT NOT NULL,
        new_quantity BIGINT NOT NULL,
        reason VARCHAR(255),
        notes TEXT,
        performed_by UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await client.query(createStockAdjustmentsTableQuery);

    // Create Products/Pricing table
    const createProductsTableQuery = `
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sku VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        current_price DECIMAL(15,2),
        previous_price DECIMAL(15,2),
        last_changed TIMESTAMPTZ,
        changed_by UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await client.query(createProductsTableQuery);

    // Create Price History table
    const createPriceHistoryTableQuery = `
      CREATE TABLE IF NOT EXISTS price_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        previous_price DECIMAL(15,2),
        new_price DECIMAL(15,2),
        reason VARCHAR(255),
        changed_by UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await client.query(createPriceHistoryTableQuery);

    // Create Orders table
    const createOrdersTableQuery = `
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID,
        customer_name VARCHAR(255),
        customer_email VARCHAR(255),
        total_amount DECIMAL(15,2),
        delivery_address JSONB,
        status VARCHAR(50) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'processing', 'completed', 'cancelled')),
        payment_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
        delivery_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'in_progress', 'completed', 'failed')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await client.query(createOrdersTableQuery);

    // Create Deliveries table
    const createDeliveriesTableQuery = `
      CREATE TABLE IF NOT EXISTS deliveries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        customer_id UUID,
        customer_name VARCHAR(255),
        customer_phone VARCHAR(30),
        customer_address TEXT,
        partner_id UUID REFERENCES staff(id) ON DELETE SET NULL,
        partner_name VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'accepted', 'started', 'completed', 'failed')),
        amount DECIMAL(15,2),
        assigned_at TIMESTAMPTZ,
        accepted_at TIMESTAMPTZ,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await client.query(createDeliveriesTableQuery);

    // Create Debts table
    const createDebtsTableQuery = `
      CREATE TABLE IF NOT EXISTS debts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        description VARCHAR(255),
        original_amount DECIMAL(15,2),
        paid_amount DECIMAL(15,2) DEFAULT 0,
        remaining_amount DECIMAL(15,2),
        status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'cleared')),
        due_date TIMESTAMPTZ,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await client.query(createDebtsTableQuery);

    // Create Debt Payments table
    const createDebtPaymentsTableQuery = `
      CREATE TABLE IF NOT EXISTS debt_payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        debt_id UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
        amount DECIMAL(15,2),
        payment_date TIMESTAMPTZ,
        payment_method VARCHAR(100),
        reference_number VARCHAR(255),
        recorded_by UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await client.query(createDebtPaymentsTableQuery);

    // Create Indexes for performance
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_staff_email ON staff(email);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_stock_sku ON stock(sku);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_stock_category ON stock(category);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_deliveries_order_id ON deliveries(order_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_deliveries_partner_id ON deliveries(partner_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_debts_due_date ON debts(due_date);');

    await client.query('COMMIT');
    logger.info('Database tables initialized successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to initialize database tables:', { error: error.message });
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  initializeTables,
};
