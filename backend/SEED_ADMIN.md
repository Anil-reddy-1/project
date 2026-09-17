# Seed Admin User

## Quick Instructions

### Step 1: Ensure Database is Running

Make sure PostgreSQL is running and you can connect to it.

### Step 2: Update .env File

Make sure your `.env` file has correct database credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=enterprise_ops
DB_USER=postgres
DB_PASSWORD=your_actual_password_here
```

### Step 3: Run the Seed Script

```bash
npm run seed:admin
```

## What the Script Does

The script will:
1. Check if an admin user already exists
2. If not, create a default admin user with these credentials:
   - **Email**: `admin@enterprise-ops.com`
   - **Name**: System Administrator
   - **Role**: admin
   - **Temporary Firebase UID**: `admin_default_uid`

## After Running the Script

You'll see output like this:

```
✅ Admin user created successfully!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Admin User Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Email:         admin@enterprise-ops.com
   Name:          System Administrator
   Role:          admin
   Firebase UID:  admin_default_uid
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Next Steps

### 1. Create Firebase User

Go to Firebase Console → Authentication → Add User:
- Email: `admin@enterprise-ops.com`
- Password: Set a secure password
- Copy the generated UID

### 2. Update Database with Real Firebase UID

Run this SQL command (replace `YOUR_FIREBASE_UID` with the actual UID):

```sql
UPDATE users 
SET firebase_uid = 'YOUR_FIREBASE_UID' 
WHERE email = 'admin@enterprise-ops.com';
```

Or use psql:

```bash
psql -d enterprise_ops -c "UPDATE users SET firebase_uid = 'YOUR_FIREBASE_UID' WHERE email = 'admin@enterprise-ops.com';"
```

### 3. Login

Now you can login with:
- Email: `admin@enterprise-ops.com`
- Password: (the one you set in Firebase)

## Alternative: Manual Database Insert

If you prefer to do it manually, run this SQL:

```sql
INSERT INTO users (
  firebase_uid,
  email,
  name,
  phone,
  role,
  is_active
)
VALUES (
  'YOUR_FIREBASE_UID_HERE',
  'admin@example.com',
  'Admin User',
  '+1234567890',
  'admin',
  true
);
```

## Troubleshooting

### Error: "Database connection failed"
- Check PostgreSQL is running
- Verify database credentials in `.env`
- Create database if it doesn't exist: `createdb enterprise_ops`

### Error: "Admin user already exists"
- The script detected an existing admin user
- Check with: `SELECT * FROM users WHERE role = 'admin';`

### Error: "Table users does not exist"
- Start the server first: `npm run dev`
- It will auto-create all tables
- Then run the seed script

## Quick Test

After seeding, verify the admin user exists:

```sql
SELECT id, email, name, role, firebase_uid 
FROM users 
WHERE role = 'admin';
```

You should see your admin user in the results.
