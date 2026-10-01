-- =====================================================
-- Migration: Add Geolocation and Image Support to Addresses
-- Description: Extend user_addresses table with latitude, longitude,
--              and image_url fields for shop/location photos and map integration
-- Date: 2026-10-01
-- =====================================================

BEGIN;

-- Add new columns to user_addresses table
ALTER TABLE user_addresses
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN user_addresses.latitude IS 'Latitude coordinate for address location (e.g., 28.61394400)';
COMMENT ON COLUMN user_addresses.longitude IS 'Longitude coordinate for address location (e.g., 77.20902100)';
COMMENT ON COLUMN user_addresses.image_url IS 'URL to shop/location front image (stored in cloud storage)';

-- Create index for geolocation queries (useful for future distance-based queries)
CREATE INDEX IF NOT EXISTS idx_user_addresses_geolocation ON user_addresses(latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add constraint to ensure both latitude and longitude are provided together or both are null
ALTER TABLE user_addresses
ADD CONSTRAINT chk_geolocation_complete 
CHECK (
    (latitude IS NULL AND longitude IS NULL) OR 
    (latitude IS NOT NULL AND longitude IS NOT NULL)
);

-- Add constraint to ensure latitude is within valid range (-90 to 90)
ALTER TABLE user_addresses
ADD CONSTRAINT chk_latitude_range 
CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));

-- Add constraint to ensure longitude is within valid range (-180 to 180)
ALTER TABLE user_addresses
ADD CONSTRAINT chk_longitude_range 
CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));

COMMIT;

-- =====================================================
-- Migration completed successfully
-- Notes:
-- - latitude: DECIMAL(10,8) allows precision up to 8 decimal places (~1mm accuracy)
-- - longitude: DECIMAL(11,8) allows precision up to 8 decimal places (~1mm accuracy)
-- - image_url: TEXT field for flexible cloud storage URLs
-- - Geolocation fields are optional but must be provided together
-- - Constraints ensure data integrity for coordinate values
-- =====================================================
