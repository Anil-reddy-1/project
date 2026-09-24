/**
 * Mock Authentication Helper for Tests
 * Bypasses Firebase authentication for integration tests
 */

const jwt = require('jsonwebtoken');

// Mock JWT secret for testing
const TEST_JWT_SECRET = 'test-secret-key-do-not-use-in-production';

/**
 * Create a mock JWT token for testing
 * @param {Object} user - User data (id, email, role, firebaseUid)
 * @returns {string} JWT token
 */
function createMockToken(user) {
  return jwt.sign(
    {
      uid: user.firebaseUid,
      email: user.email,
      role: user.role,
      userId: user.id,
    },
    TEST_JWT_SECRET,
    { expiresIn: '1h' }
  );
}

/**
 * Verify a mock JWT token
 * @param {string} token - JWT token
 * @returns {Object} Decoded token
 */
function verifyMockToken(token) {
  return jwt.verify(token, TEST_JWT_SECRET);
}

/**
 * Generate a unique Firebase UID for testing
 * @returns {string} Mock Firebase UID
 */
function generateMockFirebaseUid() {
  return `test-firebase-uid-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

module.exports = {
  createMockToken,
  verifyMockToken,
  generateMockFirebaseUid,
  TEST_JWT_SECRET,
};
