/**
 * Assign Admin Role to User
 * Run this script to give admin privileges to a user
 * 
 * Usage: node scripts/assignAdminRole.js <email>
 * Example: node scripts/assignAdminRole.js user@example.com
 */

const { getAuth } = require('../src/config/firebase');

async function assignAdminRole(email) {
  try {
    const auth = getAuth();
    
    console.log(`\n🔍 Looking up user: ${email}...`);
    
    // Get user by email
    const user = await auth.getUserByEmail(email);
    
    console.log(`✓ Found user: ${user.uid}`);
    console.log(`  Current role: ${user.customClaims?.role || 'buyer (default)'}`);
    
    // Set admin role
    await auth.setCustomUserClaims(user.uid, {
      ...user.customClaims,
      role: 'admin'
    });
    
    console.log(`\n✅ Successfully assigned admin role to ${email}`);
    console.log(`\n⚠️  IMPORTANT: User must log out and log back in for changes to take effect!`);
    console.log(`   Or refresh their token by calling: await user.getIdToken(true)`);
    
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    
    if (error.code === 'auth/user-not-found') {
      console.log(`\n💡 User not found. Please check the email address.`);
    }
    
    process.exit(1);
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.log(`
Usage: node scripts/assignAdminRole.js <email>

Example:
  node scripts/assignAdminRole.js john@example.com
  `);
  process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  console.error('❌ Invalid email format');
  process.exit(1);
}

assignAdminRole(email);
