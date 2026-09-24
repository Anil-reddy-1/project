/**
 * Test Authentication Helper
 * Provides utilities for handling authentication in tests
 */

const { getAuth } = require('../../src/config/firebase');

/**
 * Create a test user and get their Firebase custom token
 * @param {Object} userData - User data (email, password, name, phone, role)
 * @returns {Promise<{user: Object, token: string, firebaseUid: string}>}
 */
async function createTestUserWithToken(userData) {
  const { email, password, name, phone, role } = userData;
  
  try {
    const firebaseAuth = getAuth();
    
    // Create user in Firebase
    const firebaseUser = await firebaseAuth.createUser({
      email,
      password,
      displayName: name,
      emailVerified: true, // Auto-verify for tests
    });

    // Generate custom token
    const customToken = await firebaseAuth.createCustomToken(firebaseUser.uid);

    return {
      firebaseUid: firebaseUser.uid,
      token: customToken,
      user: {
        email,
        name,
        phone,
        role,
      }
    };
  } catch (error) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }
}

/**
 * Delete a test user from Firebase
 * @param {string} firebaseUid - Firebase user ID
 */
async function deleteTestUser(firebaseUid) {
  try {
    const firebaseAuth = getAuth();
    await firebaseAuth.deleteUser(firebaseUid);
  } catch (error) {
    // Ignore errors if user doesn't exist
    if (error.code !== 'auth/user-not-found') {
      console.error('Failed to delete test user:', error.message);
    }
  }
}

/**
 * Get a Firebase ID token from a custom token (simulates frontend exchange)
 * Note: This is a simplified version. In real tests, you might need to use Firebase REST API
 * @param {string} customToken - Firebase custom token
 * @returns {Promise<string>} - ID token
 */
async function exchangeCustomTokenForIdToken(customToken) {
  // In a real implementation, this would call Firebase Auth REST API
  // For now, we'll use the custom token directly as our test token
  // since our backend can verify custom tokens
  return customToken;
}

module.exports = {
  createTestUserWithToken,
  deleteTestUser,
  exchangeCustomTokenForIdToken,
};
