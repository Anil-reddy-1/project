-- =====================================================
-- Migration: Fix User ID Types for Firebase Integration
-- Description: Change user_id from UUID to VARCHAR to support Firebase UIDs
--              Create users table with Firebase UID as primary key
-- Date: 2026-09-19
-- =====================================================

BEGIN;

-- Create users table with Firebase UID (string) as primary key
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(128) PRIMARY KEY,  -- Firebase UID
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    photo_url TEXT,
    role VARCHAR(50) NOT NULL DEFAULT 'buyer' CHECK (role IN ('buyer', 'seller', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMPTZ
);

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Drop existing foreign key constraints
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_user_id_fkey;
ALTER TABLE saved_for_later DROP CONSTRAINT IF EXISTS saved_for_later_user_id_fkey;
ALTER TABLE user_addresses DROP CONSTRAINT IF EXISTS user_addresses_user_id_fkey;
ALTER TABLE wishlists DROP CONSTRAINT IF EXISTS wishlists_user_id_fkey;

-- Change user_id columns from UUID to VARCHAR
ALTER TABLE cart_items ALTER COLUMN user_id TYPE VARCHAR(128);
ALTER TABLE saved_for_later ALTER COLUMN user_id TYPE VARCHAR(128);
ALTER TABLE user_addresses ALTER COLUMN user_id TYPE VARCHAR(128);
ALTER TABLE wishlists ALTER COLUMN user_id TYPE VARCHAR(128);

-- Re-add foreign key constraints pointing to users table
ALTER TABLE cart_items 
    ADD CONSTRAINT cart_items_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE saved_for_later 
    ADD CONSTRAINT saved_for_later_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_addresses 
    ADD CONSTRAINT user_addresses_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE wishlists 
    ADD CONSTRAINT wishlists_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Create trigger for users table updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- =====================================================
-- Migration completed successfully
-- Notes:
-- - users table now uses VARCHAR(128) for Firebase UID
-- - All user_id foreign keys updated to VARCHAR(128)
-- - Foreign key constraints maintained for data integrity
-- - Indexes created for common query patterns
-- =====================================================
