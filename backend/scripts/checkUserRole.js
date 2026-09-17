/**
 * Check User Role
 * Run this script to check what role a user has
 * 
 * Usage: node scripts/checkUserRole.js <email>
 * Example: node scripts/checkUserRole.js user@example.com
 */

const { getAuth } = require('../src/config/firebase');

async function checkUserRole(email) {
  try {
    const auth = getAuth();
    
    console.log(`\n🔍 Looking up user: ${email}...`);
    
    // Get user by email
    const user = await auth.getUserByEmail(email);
    
    console.log(`\n✓ User Details:`);
    console.log(`  UID: ${user.uid}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Email Verified: ${user.emailVerified}`);
    console.log(`  Display Name: ${user.displayName || 'Not set'}`);
    console.log(`  Disabled: ${user.disabled}`);
    console.log(`  Created: ${new Date(user.metadata.creationTime).toLocaleString()}`);
    console.log(`  Last Sign In: ${new Date(user.metadata.lastSignInTime).toLocaleString()}`);
    
    console.log(`\n🎭 Custom Claims:`);
    if (user.customClaims && Object.keys(user.customClaims).length > 0) {
      console.log(JSON.stringify(user.customClaims, null, 2));
      console.log(`\n  Current Role: ${user.customClaims.role || 'Not set (defaults to "buyer")'}`);
    } else {
      console.log(`  No custom claims set`);
      console.log(`  Default Role: buyer`);
    }
    
    console.log(`\n✅ Check complete`);
    
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
Usage: node scripts/checkUserRole.js <email>

Example:
  node scripts/checkUserRole.js john@example.com
  `);
  process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  console.error('❌ Invalid email format');
  process.exit(1);
}

checkUserRole(email);
