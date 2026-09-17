-- =====================================================
-- Migration: Unified Products Table
-- Description: Consolidate stock and products tables into unified products table
--              Add product_images and wishlists tables
-- Date: 2026-09-17
-- =====================================================

BEGIN;

-- Create unified products table
CREATE TABLE IF NOT EXISTS products_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_tags JSONB DEFAULT '[]'::jsonb,  -- Array of category tags
    quantity BIGINT NOT NULL DEFAULT 0,
    unit VARCHAR(50),
    min_stock BIGINT DEFAULT 0,
    max_stock BIGINT,
    min_order_quantity INT DEFAULT 1,
    price DECIMAL(15,2),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    primary_image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create product_images table for multiple images
CREATE TABLE IF NOT EXISTS product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products_new(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    cloudinary_public_id VARCHAR(255),
    display_order INT NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create wishlists table
CREATE TABLE IF NOT EXISTS wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products_new(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id)
);

-- Migrate data from existing stock table to products_new
INSERT INTO products_new (
    id, sku, name, description, category_tags, quantity, unit, 
    min_stock, max_stock, price, status, created_at, updated_at
)
SELECT 
    id,
    sku,
    name,
    NULL as description,  -- No description in old stock table
    CASE 
        WHEN category IS NOT NULL THEN jsonb_build_array(category)
        ELSE '[]'::jsonb
    END as category_tags,
    quantity,
    unit,
    min_stock,
    max_stock,
    price,
    CASE 
        WHEN status IN ('active', 'low-stock', 'out-of-stock') THEN 'active'
        ELSE 'inactive'
    END as status,
    created_at,
    updated_at
FROM stock
WHERE sku NOT IN (SELECT sku FROM products_new)
ON CONFLICT (sku) DO NOTHING;

-- Update stock_adjustments table to reference new products table
ALTER TABLE stock_adjustments 
    DROP CONSTRAINT IF EXISTS stock_adjustments_product_id_fkey;

ALTER TABLE stock_adjustments 
    ADD CONSTRAINT stock_adjustments_product_id_fkey 
    FOREIGN KEY (product_id) 
    REFERENCES products_new(id) 
    ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_new_sku ON products_new(sku);
CREATE INDEX IF NOT EXISTS idx_products_new_status ON products_new(status);
CREATE INDEX IF NOT EXISTS idx_products_new_category_tags ON products_new USING GIN(category_tags);
CREATE INDEX IF NOT EXISTS idx_products_new_quantity ON products_new(quantity);
CREATE INDEX IF NOT EXISTS idx_products_new_created_at ON products_new(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_display_order ON product_images(product_id, display_order);

CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_product_id ON wishlists(product_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_user_product ON wishlists(user_id, product_id);

-- Drop old tables (after backup confirmation)
DROP TABLE IF EXISTS price_history CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS stock CASCADE;

-- Rename products_new to products
ALTER TABLE products_new RENAME TO products;

-- Recreate indexes with correct names after rename
DROP INDEX IF EXISTS idx_products_new_sku;
DROP INDEX IF EXISTS idx_products_new_status;
DROP INDEX IF EXISTS idx_products_new_category_tags;
DROP INDEX IF EXISTS idx_products_new_quantity;
DROP INDEX IF EXISTS idx_products_new_created_at;

CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_category_tags ON products USING GIN(category_tags);
CREATE INDEX IF NOT EXISTS idx_products_quantity ON products(quantity);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- =====================================================
-- Migration completed successfully
-- =====================================================
