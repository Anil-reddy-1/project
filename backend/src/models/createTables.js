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

    // Create Users table
    const createUsersTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        firebase_uid VARCHAR(128) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(30),
        role VARCHAR(50) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'faculty', 'admin')),
        department VARCHAR(100),
        avatar_url TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await client.query(createUsersTableQuery);

    // Create Indexes for performance
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);');

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
