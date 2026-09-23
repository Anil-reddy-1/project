-- =====================================================
-- Migration: Orders and Deliveries Management
-- Description: Create tables for order management, delivery workflow,
--              and stock transaction tracking
-- Date: 2026-09-20
-- =====================================================

BEGIN;

-- Update users table to add 'delivery' role if needed
-- Note: Run this manually if needed: 
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
-- ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('buyer', 'seller', 'admin', 'delivery'));

-- Create orders table for order management
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    firebase_uid VARCHAR(128) NOT NULL,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
    payment_method VARCHAR(50) NOT NULL DEFAULT 'COD',
    payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    order_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    delivery_address JSONB NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_payment_status CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    CONSTRAINT valid_order_status CHECK (order_status IN ('pending', 'confirmed', 'assigned', 'delivered', 'completed', 'cancelled'))
);

-- Create order_items table for order line items
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

-- Create deliveries table for delivery management
CREATE TABLE IF NOT EXISTS deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE RESTRICT,
    delivery_partner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(30) NOT NULL,
    delivery_address JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    assigned_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_delivery_status CHECK (status IN ('pending', 'assigned', 'accepted', 'in_transit', 'delivered', 'failed'))
);

-- Create delivery_status_history table for audit trail
CREATE TABLE IF NOT EXISTS delivery_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    changed_by UUID NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add index for changed_by (allows 'system' value at application level)
CREATE INDEX IF NOT EXISTS idx_delivery_history_changed_by ON delivery_status_history(changed_by);

-- Create stock_transactions table for inventory audit trail
CREATE TABLE IF NOT EXISTS stock_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    transaction_type VARCHAR(50) NOT NULL,
    quantity_change INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL CHECK (quantity_after >= 0),
    reason VARCHAR(255) NOT NULL,
    reference_id UUID,
    reference_type VARCHAR(50),
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_transaction_type CHECK (transaction_type IN ('purchase', 'sale', 'return', 'adjustment', 'restock'))
);

CREATE INDEX IF NOT EXISTS idx_stock_transactions_created_by ON stock_transactions(created_by);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, order_status);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

CREATE INDEX IF NOT EXISTS idx_deliveries_order_id ON deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_partner_id ON deliveries(delivery_partner_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_partner_status ON deliveries(delivery_partner_id, status);
CREATE INDEX IF NOT EXISTS idx_deliveries_created_at ON deliveries(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_delivery_history_delivery_id ON delivery_status_history(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_history_created_at ON delivery_status_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_transactions_product_id ON stock_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_reference ON stock_transactions(reference_id, reference_type);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_created_at ON stock_transactions(created_at DESC);

-- Create sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

-- Create function to generate order numbers (ORD-YYYY-NNNNNN format)
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    year_part VARCHAR(4);
    sequence_part VARCHAR(6);
    order_num VARCHAR(50);
BEGIN
    year_part := TO_CHAR(CURRENT_TIMESTAMP, 'YYYY');
    sequence_part := LPAD(nextval('order_number_seq')::TEXT, 6, '0');
    order_num := 'ORD-' || year_part || '-' || sequence_part;
    RETURN order_num;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate order numbers
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
        NEW.order_number := generate_order_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_order_number ON orders;
CREATE TRIGGER trigger_set_order_number
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION set_order_number();

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_deliveries_updated_at ON deliveries;
CREATE TRIGGER update_deliveries_updated_at
    BEFORE UPDATE ON deliveries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically create delivery record when order is confirmed
CREATE OR REPLACE FUNCTION create_delivery_for_order()
RETURNS TRIGGER AS $$
DECLARE
    customer_name_val VARCHAR(255);
    customer_phone_val VARCHAR(30);
BEGIN
    -- Only create delivery when order is confirmed
    IF NEW.order_status = 'confirmed' AND (OLD IS NULL OR OLD.order_status != 'confirmed') THEN
        -- Extract customer info from delivery address
        customer_name_val := COALESCE((NEW.delivery_address->>'name')::VARCHAR(255), 'Unknown');
        customer_phone_val := COALESCE((NEW.delivery_address->>'phone')::VARCHAR(30), 'Unknown');
        
        -- Create delivery record if it doesn't exist
        INSERT INTO deliveries (
            order_id,
            customer_name,
            customer_phone,
            delivery_address,
            status,
            created_at
        )
        VALUES (
            NEW.id,
            customer_name_val,
            customer_phone_val,
            NEW.delivery_address,
            'pending',
            CURRENT_TIMESTAMP
        )
        ON CONFLICT (order_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_delivery ON orders;
CREATE TRIGGER trigger_create_delivery
    AFTER INSERT OR UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION create_delivery_for_order();

-- Create function to record delivery status changes in history
CREATE OR REPLACE FUNCTION record_delivery_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Record status change if status has changed
    IF OLD IS NULL OR OLD.status != NEW.status THEN
        INSERT INTO delivery_status_history (
            delivery_id,
            status,
            changed_by,
            notes,
            created_at
        )
        VALUES (
            NEW.id,
            NEW.status,
            COALESCE(NEW.delivery_partner_id, 'system'),
            NEW.notes,
            CURRENT_TIMESTAMP
        );
        
        -- Update timestamp fields based on status
        IF NEW.status = 'assigned' AND NEW.assigned_at IS NULL THEN
            NEW.assigned_at := CURRENT_TIMESTAMP;
        ELSIF NEW.status = 'accepted' AND NEW.accepted_at IS NULL THEN
            NEW.accepted_at := CURRENT_TIMESTAMP;
        ELSIF NEW.status = 'in_transit' AND NEW.started_at IS NULL THEN
            NEW.started_at := CURRENT_TIMESTAMP;
        ELSIF NEW.status = 'delivered' AND NEW.delivered_at IS NULL THEN
            NEW.delivered_at := CURRENT_TIMESTAMP;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_record_delivery_status ON deliveries;
CREATE TRIGGER trigger_record_delivery_status
    BEFORE UPDATE ON deliveries
    FOR EACH ROW
    EXECUTE FUNCTION record_delivery_status_change();

COMMIT;

-- =====================================================
-- Migration completed successfully
-- Notes:
-- - orders: Main order records with status tracking
-- - order_items: Line items with product snapshots
-- - deliveries: Delivery workflow management
-- - delivery_status_history: Complete audit trail
-- - stock_transactions: Inventory change tracking
-- - Auto-generated order numbers (ORD-YYYY-NNNNNN)
-- - Automatic delivery creation on order confirmation
-- - Status change timestamps automatically updated
-- =====================================================
