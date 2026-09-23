# Database Migrations

## Overview
This directory contains SQL migration files for database schema changes.

## Migration Files

### 001_unified_products_migration.sql
- **Date**: 2026-09-17
- **Purpose**: Consolidate stock and products tables, add product_images and wishlists
- **Tables Created**:
  - `products` (unified from stock + products)
  - `product_images` (multiple images per product)
  - `wishlists` (user wishlist functionality)

### 002_cart_and_addresses_migration.sql ✨ NEW
- **Date**: 2026-09-19
- **Purpose**: Add shopping cart and delivery address functionality
- **Tables Created**:
  - `cart_items` - Persistent shopping cart across sessions
  - `saved_for_later` - Items saved for future purchase
  - `user_addresses` - Multiple delivery addresses per user
- **Features**:
  - Automatic timestamp management with triggers
  - Single default address per user constraint
  - Optimized indexes for cart queries
  - Cascade deletes for data integrity

## Running Migrations

### Prerequisites
1. PostgreSQL must be running
2. Database `ganga_jamuna` must exist
3. Environment variables configured in `.env`

### Commands

Run all migrations:
```bash
npm run migrate
```

Run specific migration:
```bash
npm run migrate:products    # Products migration
npm run migrate:cart        # Cart migration
```

Manual migration:
```bash
node scripts/runMigration.js <migration-file.sql>
```

## Verifying Migrations

Check if tables exist:
```bash
psql -U postgres -d ganga_jamuna -c "\dt"
```

Check cart tables specifically:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('cart_items', 'saved_for_later', 'user_addresses');
```

## Troubleshooting

### Connection Refused
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution**: Start PostgreSQL service
```bash
# Windows
net start postgresql-x64-14

# Mac/Linux
sudo service postgresql start
# or
brew services start postgresql
```

### Database Does Not Exist
```
Error: database "ganga_jamuna" does not exist
```
**Solution**: Create database
```bash
createdb -U postgres ganga_jamuna
# or
psql -U postgres -c "CREATE DATABASE ganga_jamuna;"
```

### Permission Denied
```
Error: permission denied for schema public
```
**Solution**: Grant permissions
```sql
GRANT ALL PRIVILEGES ON DATABASE ganga_jamuna TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA public TO postgres;
```

## Schema Diagrams

### Cart System ERD
```
┌─────────────┐       ┌──────────────┐       ┌────────────┐
│    users    │       │  cart_items  │       │  products  │
├─────────────┤       ├──────────────┤       ├────────────┤
│ id (PK)     │◄──────│ user_id (FK) │       │ id (PK)    │
│ firebase_uid│       │ product_id   │──────►│ sku        │
│ email       │       │ quantity     │       │ name       │
│ name        │       │ created_at   │       │ price      │
│ role        │       │ updated_at   │       │ quantity   │
└─────────────┘       └──────────────┘       └────────────┘
                            │                       ▲
                            │                       │
                            ▼                       │
                      ┌──────────────────┐          │
                      │ saved_for_later  │          │
                      ├──────────────────┤          │
                      │ id (PK)          │          │
                      │ user_id (FK)     │──────────┘
                      │ product_id (FK)  │
                      │ quantity         │
                      │ created_at       │
                      └──────────────────┘

                      ┌──────────────────┐
                      │ user_addresses   │
                      ├──────────────────┤
                      │ id (PK)          │
                      │ user_id (FK)     │◄────┐
                      │ name             │     │
                      │ phone            │     │
                      │ address_line1    │     │
                      │ address_line2    │     │
                      │ city             │     │
                      │ state            │     │
                      │ postal_code      │     │
                      │ is_default       │     │
                      │ created_at       │     │
                      │ updated_at       │     │
                      └──────────────────┘     │
                                               │
                                        ┌─────────────┐
                                        │    users    │
                                        └─────────────┘
```

## Best Practices

1. **Always backup before running migrations**
```bash
pg_dump -U postgres ganga_jamuna > backup_$(date +%Y%m%d).sql
```

2. **Test migrations in development first**
   - Never run migrations directly in production
   - Test with sample data
   - Verify data integrity after migration

3. **Keep migrations idempotent**
   - Use `IF NOT EXISTS` clauses
   - Migrations should be safe to run multiple times

4. **Document all changes**
   - Update this README
   - Add comments in SQL files
   - Note breaking changes

## Next Steps

After running migrations:
1. Verify tables created: `\dt` in psql
2. Check indexes: `\di` in psql
3. Run the backend: `npm run dev`
4. Test API endpoints with Postman/Insomnia
