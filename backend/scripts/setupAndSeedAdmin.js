/**
 * Complete Setup Script
 * 1. Creates database (if needed)
 * 2. Initializes all tables
 * 3. Creates a new admin user
 * 
 * Usage: node scripts/setupAndSeedAdmin.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const { getAuth } = require('../src/config/firebase');
const { initializeTables } = require('../src/models/createTables');

// Admin configuration
const NEW_ADMIN = {
  email: 'admin@gangajamuna.com',
  password: 'Admin@123456',
  name: 'Ganga Jamuna Admin',
  phone: '+1234567890',
};

async function createDatabase() {
  // Connect to postgres database to create our app database
  const pgPool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: 'postgres', // Connect to default postgres database
    user: process.env.DB_USER_NAME,
    password: process.env.DB_PASS,
  });

  const client = await pgPool.connect();
  
  try {
    console.log('Checking if database exists...');
    
    const checkDb = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [process.env.DATABASE_NAME]
    );

    if (checkDb.rows.length === 0) {
      console.log(`Creating database: ${process.env.DATABASE_NAME}...`);
      await client.query(`CREATE DATABASE ${process.env.DATABASE_NAME}`);
      console.log('✅ Database created successfully');
    } else {
      console.log('✅ Database already exists');
    }
  } catch (error) {
    console.error('Error creating database:', error.message);
    throw error;
  } finally {
    client.release();
    await pgPool.end();
  }
}

async function createAdminUser() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DATABASE_NAME,
    user: process.env.DB_USER_NAME,
    password: process.env.DB_PASS,
  });

  const client = await pool.connect();
  
  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🌱 Creating admin user...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Check if admin already exists
    const checkQuery = 'SELECT * FROM users WHERE email = $1;';
    const checkResult = await client.query(checkQuery, [NEW_ADMIN.email]);

    if (checkResult.rows.length > 0) {
      console.log('⚠️  Admin user already exists:');
      console.log(`   Email: ${checkResult.rows[0].email}`);
      console.log(`   Name: ${checkResult.rows[0].name}`);
      console.log(`   Role: ${checkResult.rows[0].role}`);
      console.log('\n💡 You can login with existing credentials or reset password in Firebase Console.');
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
        email: NEW_ADMIN.email,
        password: NEW_ADMIN.password,
        displayName: NEW_ADMIN.name,
        emailVerified: true,
      });
      console.log('✅ Firebase user created');
      console.log(`   UID: ${firebaseUser.uid}`);
    } catch (firebaseError) {
      if (firebaseError.code === 'auth/email-already-exists') {
        console.log('⚠️  User already exists in Firebase, fetching...');
        firebaseUser = await firebaseAuth.getUserByEmail(NEW_ADMIN.email);
        console.log(`✅ Found existing Firebase user: ${firebaseUser.uid}`);
      } else {
        console.error('❌ Firebase error:', firebaseError.message);
        throw firebaseError;
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
      NEW_ADMIN.email,
      NEW_ADMIN.name,
      NEW_ADMIN.phone,
      'admin',
      true,
    ]);

    const admin = result.rows[0];

    console.log('✅ Admin user created in database!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 New Admin Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Email:         ${NEW_ADMIN.email}`);
    console.log(`   Password:      ${NEW_ADMIN.password}`);
    console.log(`   Name:          ${admin.name}`);
    console.log(`   Phone:         ${admin.phone}`);
    console.log(`   Role:          ${admin.role}`);
    console.log(`   Firebase UID:  ${admin.firebase_uid}`);
    console.log(`   Database ID:   ${admin.id}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🎉 Success! Login with:');
    console.log(`   Email: ${NEW_ADMIN.email}`);
    console.log(`   Password: ${NEW_ADMIN.password}`);
    console.log('\n⚠️  IMPORTANT: Change this password after first login!\n');

  } catch (error) {
    console.error('\n❌ Error creating admin user:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  try {
    console.log('\n🚀 Starting complete setup...\n');

    // Step 1: Create database
    await createDatabase();

    // Step 2: Initialize tables
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Initializing database tables...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    await initializeTables();
    console.log('✅ All tables created successfully\n');

    // Step 3: Create admin user
    await createAdminUser();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Setup completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
