-- Migration: 005_notifications.sql
-- Description: Create notifications table for user notifications
-- Author: System
-- Date: 2024

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for performance
  CONSTRAINT valid_notification_type CHECK (type IN (
    'order_confirmed',
    'order_assigned',
    'order_delivered',
    'order_completed',
    'order_cancelled',
    'delivery_assigned',
    'delivery_accepted',
    'delivery_started',
    'delivery_completed'
  ))
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read_at ON notifications(read_at);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;

-- Comments
COMMENT ON TABLE notifications IS 'User notifications for order and delivery events';
COMMENT ON COLUMN notifications.type IS 'Notification type: order_confirmed, delivery_assigned, etc.';
COMMENT ON COLUMN notifications.data IS 'Additional JSON data (order_id, delivery_id, etc.)';
COMMENT ON COLUMN notifications.read_at IS 'Timestamp when notification was read (NULL = unread)';

