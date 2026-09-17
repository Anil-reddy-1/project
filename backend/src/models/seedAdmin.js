const pool = require('../config/db');
const logger = require('../utils/logger');

/**
 * Seed Admin User
 * Creates a default admin user if no admin exists
 */
async function seedAdminUser() {
  const client = await pool.connect();
  try {
    // Check if any admin user exists
    const adminCheckQuery = 'SELECT COUNT(*) FROM users WHERE role = $1;';
    const adminCheckResult = await client.query(adminCheckQuery, ['admin']);
    const adminCount = parseInt(adminCheckResult.rows[0].count, 10);

    if (adminCount > 0) {
      logger.info('Admin user already exists, skipping seed');
      return;
    }

    // Create default admin user
    const seedQuery = `
      INSERT INTO users (
        firebase_uid,
        email,
        name,
        phone,
        role,
        is_active,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      ON CONFLICT (firebase_uid) DO NOTHING
      RETURNING *;
    `;

    const defaultAdmin = {
      firebase_uid: 'admin_seed_001',
      email: 'admin@example.com',
      name: 'System Administrator',
      phone: '+1234567890',
      role: 'admin',
      is_active: true,
    };

    const result = await client.query(seedQuery, [
      defaultAdmin.firebase_uid,
      defaultAdmin.email,
      defaultAdmin.name,
      defaultAdmin.phone,
      defaultAdmin.role,
      defaultAdmin.is_active,
    ]);

    if (result.rows.length > 0) {
      logger.info('✅ Default admin user created successfully');
      logger.info(`   Email: ${defaultAdmin.email}`);
      logger.info(`   Name: ${defaultAdmin.name}`);
      logger.info(`   Firebase UID: ${defaultAdmin.firebase_uid}`);
      logger.info('   ⚠️  IMPORTANT: Create this user in Firebase Authentication with the same email!');
    } else {
      logger.info('Admin user already exists (conflict on firebase_uid)');
    }
  } catch (error) {
    logger.error('Failed to seed admin user:', { error: error.message });
    // Don't throw error - seeding is optional
  } finally {
    client.release();
  }
}

/**
 * Seed sample data for development
 */
async function seedSampleData() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if sample data already exists
    const stockCheckQuery = 'SELECT COUNT(*) FROM stock;';
    const stockCheckResult = await client.query(stockCheckQuery);
    const stockCount = parseInt(stockCheckResult.rows[0].count, 10);

    if (stockCount > 0) {
      logger.info('Sample data already exists, skipping seed');
      await client.query('COMMIT');
      return;
    }

    // Seed sample staff
    const staffData = [
      ['John Manager', 'manager@example.com', '+1234567891', 'manager', 'active'],
      ['Alice Seller', 'seller@example.com', '+1234567892', 'seller', 'active'],
      ['Bob Delivery', 'delivery@example.com', '+1234567893', 'delivery_partner', 'active'],
    ];

    for (const staff of staffData) {
      await client.query(
        `INSERT INTO staff (name, email, phone, role, status, availability)
         VALUES ($1, $2, $3, $4, $5, 'available')
         ON CONFLICT (email) DO NOTHING;`,
        staff
      );
    }

    // Seed sample stock items
    const stockData = [
      ['SKU001', 'Rice (Basmati)', 'Grains', 500, 'kg', 100, 1000, 120],
      ['SKU002', 'Wheat Flour', 'Grains', 300, 'kg', 50, 500, 80],
      ['SKU003', 'Sugar', 'Groceries', 200, 'kg', 50, 300, 60],
      ['SKU004', 'Cooking Oil', 'Oils', 150, 'liters', 30, 200, 150],
      ['SKU005', 'Lentils (Dal)', 'Grains', 250, 'kg', 50, 400, 100],
    ];

    for (const stock of stockData) {
      await client.query(
        `INSERT INTO stock (sku, name, category, quantity, unit, min_stock, max_stock, price, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
         ON CONFLICT (sku) DO NOTHING;`,
        stock
      );
    }

    // Seed sample products for pricing
    for (const [sku, name, category, , , , , price] of stockData) {
      await client.query(
        `INSERT INTO products (sku, name, category, current_price, previous_price)
         VALUES ($1, $2, $3, $4, $4)
         ON CONFLICT (sku) DO NOTHING;`,
        [sku, name, category, price]
      );
    }

    // Seed a sample buyer user
    await client.query(
      `INSERT INTO users (firebase_uid, email, name, phone, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (firebase_uid) DO NOTHING;`,
      ['buyer_seed_001', 'buyer@example.com', 'John Buyer', '+1234567894', 'buyer', true]
    );

    // Seed a sample delivery user
    await client.query(
      `INSERT INTO users (firebase_uid, email, name, phone, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (firebase_uid) DO NOTHING;`,
      ['delivery_seed_001', 'delivery.user@example.com', 'Mike Delivery', '+1234567895', 'delivery', true]
    );

    await client.query('COMMIT');
    logger.info('✅ Sample data seeded successfully');
    logger.info('   - 3 staff members created');
    logger.info('   - 5 stock items created');
    logger.info('   - 5 products created');
    logger.info('   - 1 buyer user created');
    logger.info('   - 1 delivery user created');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to seed sample data:', { error: error.message });
    // Don't throw error - seeding is optional
  } finally {
    client.release();
  }
}

/**
 * Main seed function
 */
async function seedDatabase() {
  logger.info('🌱 Starting database seeding...');
  
  try {
    await seedAdminUser();
    
    // Only seed sample data in development
    if (process.env.NODE_ENV === 'development') {
      await seedSampleData();
    }
    
    logger.info('🌱 Database seeding completed');
  } catch (error) {
    logger.error('Database seeding failed:', { error: error.message });
  }
}

module.exports = {
  seedDatabase,
  seedAdminUser,
  seedSampleData,
};
