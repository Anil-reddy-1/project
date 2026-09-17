/**
 * Add New Admin User Script
 * Creates a new admin user with a different email
 * 
 * Usage: node scripts/addNewAdmin.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const { getAuth } = require('../src/config/firebase');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DATABASE_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASS,
});

async function addNewAdmin() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Creating new admin user...\n');

    // New admin details
    const newAdminEmail = 'admin@gangajamuna.com';
    const newAdminPassword = 'Admin@123456'; // Change this to your preferred password
    const newAdminName = 'Ganga Jamuna Admin';
    const newAdminPhone = '+1234567890';

    // Check if this email already exists in database
    const checkQuery = 'SELECT * FROM users WHERE email = $1;';
    const checkResult = await client.query(checkQuery, [newAdminEmail]);

    if (checkResult.rows.length > 0) {
      console.log('⚠️  Admin user with this email already exists:');
      console.log(`   Email: ${checkResult.rows[0].email}`);
      console.log(`   Name: ${checkResult.rows[0].name}`);
      console.log('\n💡 You can reset the password in Firebase Console.');
      return;
    }

    // Initialize Firebase
    const firebaseAuth = getAuth();
    if (!firebaseAuth) {
      console.log('❌ Firebase not configured. Cannot create Firebase user.');
      console.log('Please configure Firebase credentials in .env file.');
      process.exit(1);
    }

    console.log('Step 1: Creating Firebase user...');
    
    // Create user in Firebase
    let firebaseUser;
    try {
      firebaseUser = await firebaseAuth.createUser({
        email: newAdminEmail,
        password: newAdminPassword,
        displayName: newAdminName,
        emailVerified: true, // Pre-verify for admin
      });
      console.log('✅ Firebase user created successfully');
      console.log(`   UID: ${firebaseUser.uid}`);
    } catch (firebaseError) {
      if (firebaseError.code === 'auth/email-already-exists') {
        console.log('⚠️  User already exists in Firebase');
        console.log('Fetching existing Firebase user...');
        try {
          firebaseUser = await firebaseAuth.getUserByEmail(newAdminEmail);
          console.log(`✅ Found existing Firebase user: ${firebaseUser.uid}`);
        } catch (e) {
          console.error('❌ Error fetching Firebase user:', e.message);
          process.exit(1);
        }
      } else {
        console.error('❌ Firebase error:', firebaseError.message);
        process.exit(1);
      }
    }

    console.log('\nStep 2: Creating database record...');

    // Create user in database
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

    const result = await client.query(insertQuery, [
      firebaseUser.uid,
      newAdminEmail,
      newAdminName,
      newAdminPhone,
      'admin',
      true,
    ]);

    const admin = result.rows[0];

    console.log('✅ Admin user created in database!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 New Admin Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Email:         ${newAdminEmail}`);
    console.log(`   Password:      ${newAdminPassword}`);
    console.log(`   Name:          ${admin.name}`);
    console.log(`   Phone:         ${admin.phone}`);
    console.log(`   Role:          ${admin.role}`);
    console.log(`   Firebase UID:  ${admin.firebase_uid}`);
    console.log(`   Database ID:   ${admin.id}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🎉 Success! You can now login with:');
    console.log(`   Email: ${newAdminEmail}`);
    console.log(`   Password: ${newAdminPassword}`);
    console.log('\n⚠️  IMPORTANT: Change this password after first login!\n');

    // List all admins
    const allAdmins = await client.query('SELECT id, email, name, firebase_uid FROM users WHERE role = $1', ['admin']);
    console.log(`📊 Total admin users: ${allAdmins.rows.length}`);
    allAdmins.rows.forEach((a, i) => {
      console.log(`   ${i + 1}. ${a.email} (${a.name})`);
    });

  } catch (error) {
    console.error('\n❌ Error creating admin user:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
addNewAdmin()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
