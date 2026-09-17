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

    // Check if admin already exists
    const checkQuery = 'SELECT * FROM users WHERE role = $1 LIMIT 1;';
    const checkResult = await client.query(checkQuery, ['admin']);

    if (checkResult.rows.length > 0) {
      console.log('✅ Admin user already exists:');
      console.log(`   Email: ${checkResult.rows[0].email}`);
      console.log(`   Name: ${checkResult.rows[0].name}`);
      console.log(`   Firebase UID: ${checkResult.rows[0].firebase_uid}`);
      console.log('\n⚠️  No changes made.');
      return;
    }

    // Create admin user
    const insertQuery = `
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
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *;
    `;

    const adminData = [
      'admin_default_uid',              // firebase_uid (temporary, replace when Firebase user created)
      'admin@enterprise-ops.com',       // email
      'System Administrator',           // name
      '+1234567890',                    // phone
      'admin',                          // role
      true,                             // is_active
    ];

    const result = await client.query(insertQuery, adminData);
    const admin = result.rows[0];

    console.log('✅ Admin user created successfully!\n');
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
