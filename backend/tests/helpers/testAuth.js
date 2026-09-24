/**
 * Test Authentication Helper
 * Creates test users and tokens without requiring Firebase
 */

const userModel = require('../../src/models/userModel');
const { createMockToken, generateMockFirebaseUid } = require('./mockAuth');
const pool = require('../../src/config/db');

/**
 * Create a test user in the database and return a mock token
 * @param {Object} userData - User data (email, name, phone, role)
 * @returns {Promise<{user: Object, token: string, firebaseUid: string}>}
 */
async function createTestUser(userData) {
  const { email, name, phone, role } = userData;
  
  try {
    // Generate mock Firebase UID
    const firebaseUid = generateMockFirebaseUid();
    
    // Create user in database
    const user = await userModel.createUser({
      firebaseUid,
      email,
      name,
      phone: phone || null,
      role,
    });

    // Generate mock token
    const token = createMockToken({
      id: user.id,
      email: user.email,
      role: user.role,
      firebaseUid,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
      token,
      firebaseUid,
    };
  } catch (error) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }
}

/**
 * Delete a test user from the database
 * @param {string} userId - User ID
 */
async function deleteTestUser(userId) {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
  } catch (error) {
    console.error('Failed to delete test user:', error.message);
  }
}

/**
 * Clean up all test users (helper for mass cleanup)
 * @param {Array<string>} userIds - Array of user IDs
 */
async function cleanupTestUsers(userIds) {
  try {
    const validIds = userIds.filter(Boolean);
    if (validIds.length > 0) {
      await pool.query('DELETE FROM users WHERE id = ANY($1)', [validIds]);
    }
  } catch (error) {
    console.error('Failed to cleanup test users:', error.message);
  }
}

module.exports = {
  createTestUser,
  deleteTestUser,
  cleanupTestUsers,
};
