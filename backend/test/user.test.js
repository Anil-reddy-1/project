const assert = require('assert');
const userModel = require('../src/models/userModel');
const userService = require('../src/services/userService');

console.log('--- Running User Module Unit Tests ---');

// Mock userModel for offline unit testing
userModel.findAllUsers = async ({ page, limit }) => ({
  users: [],
  total: 0,
});

async function testPaginationParsing() {
  const result = await userService.getUsers({ page: -5, limit: 999 });
  assert.strictEqual(result.page, 1, 'Negative page should clamp to 1');
  assert.strictEqual(result.limit, 100, 'Excessive limit should clamp to 100');
  console.log('✓ Pagination bounds clamping test passed');
}

async function testGetUserInvalid() {
  let errorCaught = false;
  try {
    await userService.getUserById('');
  } catch (err) {
    errorCaught = true;
    assert.strictEqual(err.statusCode, 400, 'Empty ID should throw 400 Bad Request');
  }
  assert.strictEqual(errorCaught, true, 'Should throw error on empty user ID');
  console.log('✓ Invalid ID validation test passed');
}

async function runTests() {
  try {
    await testPaginationParsing();
    await testGetUserInvalid();
    console.log('ALL USER MODULE TESTS PASSED!');
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

runTests();
