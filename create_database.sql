-- Create new database for Ganga Jamuna project
-- Run this with: psql -U postgres -f create_database.sql

-- Create database if it doesn't exist
SELECT 'CREATE DATABASE ganga_jamuna'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ganga_jamuna')\gexec

-- Connect to the new database
\c ganga_jamuna

-- Verify connection
SELECT current_database();
