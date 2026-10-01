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

    // Create Products table (full e-commerce schema)
    const createProductsTableQuery = `
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sku VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category_tags JSONB DEFAULT '[]'::jsonb,
        quantity BIGINT NOT NULL DEFAULT 0,
        unit VARCHAR(50) DEFAULT 'unit',
        min_stock BIGINT DEFAULT 0,
        max_stock BIGINT,
        min_order_quantity INTEGER DEFAULT 1,
        price DECIMAL(15,2) DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft')),
        primary_image_url TEXT,
        current_price DECIMAL(15,2),
        previous_price DECIMAL(15,2),
        last_changed TIMESTAMPTZ,
        changed_by UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await client.query(createProductsTableQuery);

    // Create Product Images table
    const createProductImagesTableQuery = `
      CREATE TABLE IF NOT EXISTS product_images (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        cloudinary_public_id VARCHAR(255),
        display_order INTEGER NOT NULL DEFAULT 0,
        is_primary BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await client.query(createProductImagesTableQuery);

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
        user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
        customer_id UUID,
        customer_name VARCHAR(255),
        customer_email VARCHAR(255),
        firebase_uid VARCHAR(128),
        order_number VARCHAR(50),
        total_amount DECIMAL(15,2),
        payment_method VARCHAR(50) DEFAULT 'COD',
        payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
        order_status VARCHAR(50) NOT NULL DEFAULT 'pending',
        status VARCHAR(50) NOT NULL DEFAULT 'confirmed',
        delivery_status VARCHAR(50) NOT NULL DEFAULT 'pending',
        delivery_address JSONB,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await client.query(createOrdersTableQuery);

    // Create Order Items table
    const createOrderItemsTableQuery = `
      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        product_name VARCHAR(255) NOT NULL,
        product_sku VARCHAR(100) NOT NULL,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
        total_price DECIMAL(10, 2) NOT NULL CHECK (total_price >= 0),
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await client.query(createOrderItemsTableQuery);

    // Create Deliveries table
    const createDeliveriesTableQuery = `
      CREATE TABLE IF NOT EXISTS deliveries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        delivery_partner_id UUID REFERENCES users(id) ON DELETE SET NULL,
        partner_id UUID REFERENCES staff(id) ON DELETE SET NULL,
        customer_id UUID,
        customer_name VARCHAR(255),
        customer_phone VARCHAR(30),
        customer_address TEXT,
        delivery_address JSONB,
        partner_name VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        amount DECIMAL(15,2),
        assigned_at TIMESTAMPTZ,
        accepted_at TIMESTAMPTZ,
        started_at TIMESTAMPTZ,
        delivered_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await client.query(createDeliveriesTableQuery);

    // Create Delivery Status History table
    const createDeliveryStatusHistoryTableQuery = `
      CREATE TABLE IF NOT EXISTS delivery_status_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL,
        changed_by UUID,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await client.query(createDeliveryStatusHistoryTableQuery);

    // Create Notifications table
    const createNotificationsTableQuery = `
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        data JSONB DEFAULT '{}',
        read_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await client.query(createNotificationsTableQuery);

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

    // Create debt_payments table
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

    // Create cart_items table
    const createCartItemsTableQuery = `
      CREATE TABLE IF NOT EXISTS cart_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, product_id)
      );
    `;

    await client.query(createCartItemsTableQuery);

    // Create saved_for_later table
    const createSavedForLaterTableQuery = `
      CREATE TABLE IF NOT EXISTS saved_for_later (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, product_id)
      );
    `;

    await client.query(createSavedForLaterTableQuery);

    // Create user_addresses table
    const createUserAddressesTableQuery = `
      CREATE TABLE IF NOT EXISTS user_addresses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(30) NOT NULL,
        address_line1 TEXT NOT NULL,
        address_line2 TEXT,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        postal_code VARCHAR(20) NOT NULL,
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await client.query(createUserAddressesTableQuery);

    // Create Stock Transactions table (audit trail for stock changes during orders)
    const createStockTransactionsTableQuery = `
      CREATE TABLE IF NOT EXISTS stock_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('sale', 'return', 'adjustment', 'restock', 'damage')),
        quantity_change BIGINT NOT NULL,
        quantity_after BIGINT NOT NULL,
        reason TEXT,
        reference_id UUID,
        reference_type VARCHAR(50),
        performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await client.query(createStockTransactionsTableQuery);

    // Create Indexes for performance
    // Ensure newly added columns exist in case tables were created previously
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE RESTRICT;');
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS firebase_uid VARCHAR(128);');
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number VARCHAR(50);');
    await client.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_status VARCHAR(50) DEFAULT 'pending';");
    await client.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'COD';");
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;');
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID;');
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);');
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);');

    await client.query('ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS delivery_partner_id UUID REFERENCES users(id) ON DELETE SET NULL;');
    await client.query('ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS notes TEXT;');
    await client.query('ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;');
    await client.query('ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS customer_id UUID;');
    await client.query('ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);');
    await client.query('ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(30);');
    await client.query('ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS customer_address TEXT;');

    // Sync order_status and delivery_partner_id where needed
    await client.query("UPDATE orders SET order_status = status WHERE order_status IS NULL OR order_status = 'pending';");
    await client.query("UPDATE deliveries SET delivery_partner_id = partner_id WHERE delivery_partner_id IS NULL AND partner_id IS NOT NULL;");

    // Ensure products table has all required columns (for pre-existing tables)
    await client.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;");
    await client.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS category_tags JSONB DEFAULT '[]'::jsonb;");
    await client.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS quantity BIGINT NOT NULL DEFAULT 0;");
    await client.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'unit';");
    await client.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock BIGINT DEFAULT 0;");
    await client.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS max_stock BIGINT;");
    await client.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS min_order_quantity INTEGER DEFAULT 1;");
    await client.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS price DECIMAL(15,2) DEFAULT 0;");
    await client.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'active';");
    await client.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS primary_image_url TEXT;");

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
    await client.query('CREATE INDEX IF NOT EXISTS idx_orders_order_status ON orders(order_status);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_deliveries_order_id ON deliveries(order_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_deliveries_partner_id ON deliveries(partner_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_deliveries_delivery_partner_id ON deliveries(delivery_partner_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_debts_due_date ON debts(due_date);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_cart_items_user_product ON cart_items(user_id, product_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_saved_for_later_user_id ON saved_for_later(user_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_saved_for_later_product_id ON saved_for_later(product_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_user_addresses_is_default ON user_addresses(user_id, is_default);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_product_images_is_primary ON product_images(product_id, is_primary);');

    // ── Data Healing ───────────────────────────────────────────────────────
    // Reset users with legacy/invalid roles to 'buyer'. Valid: admin, buyer, delivery
    await client.query(`
      UPDATE users
      SET role = 'buyer', updated_at = CURRENT_TIMESTAMP
      WHERE role NOT IN ('admin', 'buyer', 'delivery');
    `);

    // Stock transactions indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_stock_transactions_product_id ON stock_transactions(product_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_stock_transactions_reference ON stock_transactions(reference_id, reference_type);');


    await client.query('COMMIT');
    logger.info('Database tables initialized successfully');


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
