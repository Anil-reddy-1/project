-- =====================================================
-- Migration: Fix delivery_status_history changed_by column
-- Description: Allow NULL for system-generated status changes
-- Date: 2026-09-23
-- =====================================================

BEGIN;

-- Alter changed_by to allow NULL for system changes
ALTER TABLE delivery_status_history 
ALTER COLUMN changed_by DROP NOT NULL;

-- Update trigger to use NULL instead of 'system'
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
            NEW.delivery_partner_id, -- Use NULL instead of 'system'
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

COMMIT;

-- =====================================================
-- Migration completed successfully
-- =====================================================
