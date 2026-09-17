const assert = require('assert');
const {
  extractBearerToken,
  formatReqUser,
  requireRole,
  requireEmailVerified,
  requireSelfOrAdmin,
} = require('../src/middleware/auth');

console.log('--- Running Auth Middleware Edge Case Unit Tests ---');

// 1. extractBearerToken edge cases
assert.strictEqual(extractBearerToken({ headers: {} }), null, 'Missing header should return null');
assert.strictEqual(extractBearerToken({ headers: { authorization: 'Basic 12345' } }), null, 'Non-bearer scheme should return null');
assert.strictEqual(extractBearerToken({ headers: { authorization: 'Bearer' } }), null, 'Empty token after Bearer should return null');
assert.strictEqual(extractBearerToken({ headers: { authorization: 'Bearer    ' } }), null, 'Whitespace token should return null');
assert.strictEqual(extractBearerToken({ headers: { authorization: 'Bearer token123' } }), 'token123', 'Valid Bearer token should be extracted');
assert.strictEqual(extractBearerToken({ headers: { authorization: 'bearer token456' } }), 'token456', 'Case-insensitive bearer prefix should work');
assert.strictEqual(extractBearerToken({ headers: { authorization: ['Bearer token789', 'Bearer other'] } }), 'token789', 'Array header should extract first item');

console.log('✓ extractBearerToken tests passed');

// 2. formatReqUser edge cases
const mockToken = {
  uid: 'user_123',
  email: 'test@campusiq.edu',
  email_verified: true,
  name: 'John Doe',
  picture: 'https://example.com/photo.jpg',
  role: 'faculty',
  auth_time: 1700000000,
  iat: 1700000000,
  exp: 1700003600,
};

const user = formatReqUser(mockToken);
assert.strictEqual(user.uid, 'user_123');
assert.strictEqual(user.email, 'test@campusiq.edu');
assert.strictEqual(user.emailVerified, true);
assert.strictEqual(user.role, 'faculty');
assert.strictEqual(user.name, 'John Doe');

console.log('✓ formatReqUser tests passed');

// 3. requireRole middleware edge cases
const adminOnlyGuard = requireRole('admin');
const studentFacultyGuard = requireRole('student', 'faculty');

let nextCalled = false;
let nextErr = null;
const mockNext = (err) => {
  nextCalled = true;
  nextErr = err || null;
};

// Test unauthenticated user
adminOnlyGuard({}, {}, mockNext);
assert.strictEqual(nextCalled, true);
assert.strictEqual(nextErr.statusCode, 401);

// Test forbidden role
nextCalled = false;
nextErr = null;
adminOnlyGuard({ user: { uid: 'u1', role: 'student' } }, {}, mockNext);
assert.strictEqual(nextCalled, true);
assert.strictEqual(nextErr.statusCode, 403);
assert.strictEqual(nextErr.code, 'INSUFFICIENT_PERMISSIONS');

// Test allowed role
nextCalled = false;
nextErr = null;
adminOnlyGuard({ user: { uid: 'u1', role: 'ADMIN' } }, {}, mockNext);
assert.strictEqual(nextCalled, true);
assert.strictEqual(nextErr, null);

// Test array roles
nextCalled = false;
nextErr = null;
studentFacultyGuard({ user: { uid: 'u1', role: 'faculty' } }, {}, mockNext);
assert.strictEqual(nextCalled, true);
assert.strictEqual(nextErr, null);

console.log('✓ requireRole tests passed');

// 4. requireEmailVerified edge cases
nextCalled = false;
nextErr = null;
requireEmailVerified({ user: { uid: 'u1', emailVerified: false } }, {}, mockNext);
assert.strictEqual(nextCalled, true);
assert.strictEqual(nextErr.statusCode, 403);
assert.strictEqual(nextErr.code, 'EMAIL_NOT_VERIFIED');

nextCalled = false;
nextErr = null;
requireEmailVerified({ user: { uid: 'u1', emailVerified: true } }, {}, mockNext);
assert.strictEqual(nextCalled, true);
assert.strictEqual(nextErr, null);

console.log('✓ requireEmailVerified tests passed');

// 5. requireSelfOrAdmin edge cases
const selfOrAdminGuard = requireSelfOrAdmin('userId');

// Accessing another user's resource as student -> Forbidden 403
nextCalled = false;
nextErr = null;
selfOrAdminGuard({ params: { userId: 'user_456' }, user: { uid: 'user_123', role: 'student' } }, {}, mockNext);
assert.strictEqual(nextCalled, true);
assert.strictEqual(nextErr.statusCode, 403);

// Accessing own resource -> Allowed
nextCalled = false;
nextErr = null;
selfOrAdminGuard({ params: { userId: 'user_123' }, user: { uid: 'user_123', role: 'student' } }, {}, mockNext);
assert.strictEqual(nextCalled, true);
assert.strictEqual(nextErr, null);

// Accessing another user's resource as admin -> Allowed
nextCalled = false;
nextErr = null;
selfOrAdminGuard({ params: { userId: 'user_456' }, user: { uid: 'admin_001', role: 'admin' } }, {}, mockNext);
assert.strictEqual(nextCalled, true);
assert.strictEqual(nextErr, null);

console.log('✓ requireSelfOrAdmin tests passed');
console.log('ALL AUTH TESTS PASSED SUCCESSFULLY!');
