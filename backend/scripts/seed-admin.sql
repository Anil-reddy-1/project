-- Seed Admin User SQL Script
-- Run this with: psql -d enterprise_ops -f scripts/seed-admin.sql

-- Check if admin user already exists
DO $$
DECLARE
    admin_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'admin';
    
    IF admin_count > 0 THEN
        RAISE NOTICE 'Admin user already exists. No changes made.';
    ELSE
        -- Insert default admin user
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
            'admin_default_uid',
            'admin@gangajamuna.com',
            'System Administrator',
            '+1234567890',
            'admin',
            true,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        );
        
        RAISE NOTICE '✅ Admin user created successfully!';
        RAISE NOTICE '';
        RAISE NOTICE '📋 Admin Details:';
        RAISE NOTICE '   Email: admin@gangajamuna.com';
        RAISE NOTICE '   Name: System Administrator';
        RAISE NOTICE '   Role: admin';
        RAISE NOTICE '   Temp Firebase UID: admin_default_uid';
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  NEXT STEPS:';
        RAISE NOTICE '1. Create this user in Firebase Authentication';
        RAISE NOTICE '2. Copy the Firebase UID';
        RAISE NOTICE '3. Run: UPDATE users SET firebase_uid = ''YOUR_UID'' WHERE email = ''admin@gangajamuna.com'';';
    END IF;
END $$;

-- Show current admin users
SELECT 
    id,
    email,
    name,
    role,
    firebase_uid,
    is_active,
    created_at
FROM users 
WHERE role = 'admin';
