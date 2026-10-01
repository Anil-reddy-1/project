/**
 * Seed Admin User Script
 * Run this script to create a default admin user
 * 
 * Usage: node scripts/seedAdmin.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DATABASE_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASS,
});

async function seedAdmin() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Seeding admin user...\n');

    const ADMIN_EMAIL = 'admin@gangajamuna.com';

    // Check if user with this email already exists
    const checkUserQuery = 'SELECT * FROM users WHERE email = $1 LIMIT 1;';
    const checkUserResult = await client.query(checkUserQuery, [ADMIN_EMAIL]);

    let admin;

    if (checkUserResult.rows.length > 0) {
      // User exists — promote to admin
      const existingUser = checkUserResult.rows[0];
      if (existingUser.role === 'admin') {
        console.log('✅ Admin user already exists:');
        console.log(`   Email: ${existingUser.email}`);
        console.log(`   Name: ${existingUser.name}`);
        console.log(`   Firebase UID: ${existingUser.firebase_uid}`);
        console.log('\n⚠️  No changes made.');
        return;
      }

      // Update role to admin
      const updateQuery = `
        UPDATE users SET role = 'admin', updated_at = CURRENT_TIMESTAMP
        WHERE email = $1
        RETURNING *;
      `;
      const updateResult = await client.query(updateQuery, [ADMIN_EMAIL]);
      admin = updateResult.rows[0];
      console.log('✅ Existing user promoted to admin!\n');
    } else {
      // Create new admin user
      const insertQuery = `
        INSERT INTO users (
          firebase_uid, email, name, phone, role, is_active,
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *;
      `;

      const adminData = [
        'admin_default_uid',              // firebase_uid (temporary)
        ADMIN_EMAIL,                      // email
        'System Administrator',           // name
        '+1234567890',                    // phone
        'admin',                          // role
        true,                             // is_active
      ];

      const result = await client.query(insertQuery, adminData);
      admin = result.rows[0];
      console.log('✅ Admin user created successfully!\n');
    }

    // Display admin details
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Admin User Details:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   ID:            ${admin.id}`);
    console.log(`   Email:         ${admin.email}`);
    console.log(`   Name:          ${admin.name}`);
    console.log(`   Phone:         ${admin.phone}`);
    console.log(`   Role:          ${admin.role}`);
    console.log(`   Firebase UID:  ${admin.firebase_uid}`);
    console.log(`   Status:        ${admin.is_active ? 'Active' : 'Inactive'}`);
    console.log(`   Created:       ${admin.created_at}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('⚠️  IMPORTANT NEXT STEPS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1. Create this user in Firebase Authentication:');
    console.log(`   - Email: ${admin.email}`);
    console.log('   - Password: Set a secure password');
    console.log('   - UID: Copy the UID from Firebase');
    console.log('');
    console.log('2. Update the firebase_uid in the database:');
    console.log(`   UPDATE users SET firebase_uid = 'FIREBASE_UID_HERE' WHERE email = '${admin.email}';`);
    console.log('');
    console.log('3. Or use this SQL to update:');
    console.log(`   psql -d ${process.env.DATABASE_NAME} -c "UPDATE users SET firebase_uid = 'YOUR_FIREBASE_UID' WHERE email = '${admin.email}';"`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error seeding admin user:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the seed function
seedAdmin()
  .then(() => {
    console.log('✅ Seeding complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
