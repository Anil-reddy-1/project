# Integration Test Suite - Address Management & Order Flow

## Overview
This test suite covers the complete address management system with geolocation and image support, integrated with the order placement flow.

## Test Files

### 1. `address-management.test.js`
Tests all CRUD operations for address management including:
- Creating addresses with/without geolocation
- Creating addresses with/without shop images
- Validation (phone, postal code, geolocation completeness)
- Updating addresses and their geolocation/images
- Setting default addresses
- Deleting addresses
- Address authorization (users can only manage their own addresses)

**Test Coverage:** 20+ test cases

### 2. `order-with-address.test.js`
Tests the complete order flow with address integration:
- Creating addresses before checkout
- Adding addresses with geolocation and images
- Cart operations
- Order validation with addresses
- Order placement with different address types
- Address data in order details
- Error scenarios (no address, wrong address, empty cart, out of stock)

**Test Coverage:** 15+ test cases

### 3. `order-flow.test.js` (existing)
Tests the basic order to delivery workflow

## Prerequisites

### Database Setup
1. Ensure PostgreSQL is running
2. Run all migrations including the address geolocation migration:
   ```bash
   npm run migrate 003_addresses_geolocation_image.sql
   ```

### Environment Variables
Ensure `.env` file has:
```env
DB_USER_NAME=your_db_user
DB_HOST=your_db_host
DATABASE_NAME=your_db_name
DB_PORT=5432
DB_PASS=your_db_password
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Test Database (Recommended)
For safety, use a separate test database:
1. Create test database: `CREATE DATABASE ganga_jamuna_test;`
2. Update test configuration to use test database
3. Run migrations on test database

## Running Tests

### Run All Integration Tests
```bash
npm test
```

### Run Specific Test Suite
```bash
# Address management tests only
npm test -- address-management.test.js

# Order with address tests only
npm test -- order-with-address.test.js

# All integration tests
npm test -- tests/integration
```

### Run with Coverage
```bash
npm run test:coverage
```

### Run in Watch Mode (Development)
```bash
npm run test:watch
```

## Test Structure

### Setup Phase (beforeAll)
- Creates test users with different roles
- Creates test products
- Sets up initial data

### Test Execution
- Each test is isolated and independent
- Tests use real database operations
- HTTP requests are made via supertest
- Authentication tokens are managed automatically

### Cleanup Phase (afterAll)
- Removes all test data
- Cleans up test users
- Ensures database is clean for next run

## Key Test Scenarios

### Address Creation Flow
1. ✅ Create first address (auto-default)
2. ✅ Create address with geolocation coordinates
3. ✅ Create address with shop image URL
4. ✅ Create multiple addresses
5. ✅ Validate required fields
6. ✅ Validate phone number format (10 digits)
7. ✅ Validate postal code format (6 digits)
8. ✅ Validate geolocation completeness (both lat/lng required)

### Address Management Flow
1. ✅ Get all addresses (ordered by default first)
2. ✅ Get specific address by ID
3. ✅ Get default address
4. ✅ Update address fields
5. ✅ Update geolocation
6. ✅ Update image URL
7. ✅ Set address as default (unsets previous default)
8. ✅ Delete non-default address
9. ✅ Get address count

### Complete Order Flow
1. ✅ Create delivery address with geolocation and image
2. ✅ Add products to cart
3. ✅ Get cart items
4. ✅ Validate order with address
5. ✅ Place order with address
6. ✅ Verify order contains complete address details
7. ✅ Verify cart clears after order
8. ✅ Verify address geolocation in order details

### Error Scenarios
1. ✅ Order without address
2. ✅ Order with wrong address (belongs to another user)
3. ✅ Order with empty cart
4. ✅ Order validation with out-of-stock products
5. ✅ Missing required fields
6. ✅ Invalid data formats
7. ✅ Unauthorized access

## Expected Results

### All Tests Should Pass
```
PASS  tests/integration/address-management.test.js
  Address Management Integration Tests
    POST /api/v1/addresses - Create Address
      ✓ should create first address and set as default
      ✓ should create address with geolocation
      ✓ should create address with image URL
      ✓ should fail validation for missing required fields
      ✓ should fail validation for invalid phone number
      ✓ should fail validation for invalid postal code
      ✓ should fail validation for incomplete geolocation
      ✓ should require authentication
    GET /api/v1/addresses - Get All Addresses
      ✓ should get all user addresses
      ✓ should order addresses with default first
    ... (more tests)

PASS  tests/integration/order-with-address.test.js
  Order Flow with Address Integration Tests
    Complete Order Flow with Address
      ✓ Step 1: Create delivery address
      ✓ Step 2: Create address with geolocation and image
      ✓ Step 3: Add product to cart
      ... (more tests)

Test Suites: 2 passed, 2 total
Tests:       35 passed, 35 total
```

## Troubleshooting

### Test Failures

#### Database Connection Errors
```
Error: connect ETIMEDOUT
```
**Solution:** Check database connection settings, ensure PostgreSQL is running

#### Migration Errors
```
Error: column "latitude" does not exist
```
**Solution:** Run address geolocation migration:
```bash
npm run migrate 003_addresses_geolocation_image.sql
```

#### Test Data Conflicts
```
Error: duplicate key value violates unique constraint
```
**Solution:** Clean up test data or use unique timestamps in test emails/phones

#### Authentication Errors
```
Error: 401 Unauthorized
```
**Solution:** Check Firebase configuration, ensure test user creation works

### Test Cleanup Issues

If tests leave data behind:
```bash
# Manually clean test data
psql -d your_database -c "DELETE FROM user_addresses WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test-%@test.com');"
psql -d your_database -c "DELETE FROM users WHERE email LIKE 'test-%@test.com';"
```

## Performance Expectations

### Test Execution Time
- Address Management Suite: ~5-10 seconds
- Order with Address Suite: ~8-15 seconds
- Total Integration Tests: ~15-30 seconds

### Individual Test Performance
- Address CRUD operations: < 500ms each
- Order placement: < 1 second
- Validation tests: < 300ms each

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run migrate
      - run: npm test
```

## Best Practices

### Writing New Tests
1. Use descriptive test names
2. Follow AAA pattern (Arrange, Act, Assert)
3. Clean up after each test
4. Use timestamps for unique test data
5. Test both success and error cases
6. Verify database state when needed

### Test Data
1. Use realistic but fake data
2. Include edge cases (empty strings, special characters)
3. Test boundary values (min/max lengths)
4. Use consistent naming (test-*, *-test)

### Assertions
1. Test all response fields
2. Verify HTTP status codes
3. Check database state for critical operations
4. Validate error messages are helpful

## Future Enhancements

### Planned Test Coverage
- [ ] Image upload integration tests (with Cloudinary)
- [ ] Geolocation permission scenarios
- [ ] Concurrent address operations
- [ ] Address search/filtering
- [ ] Bulk address operations
- [ ] Address history/audit trails
- [ ] Performance benchmarking tests

### Test Infrastructure
- [ ] Mock Cloudinary for faster tests
- [ ] Test database seeding utilities
- [ ] Shared test fixtures
- [ ] Visual regression tests for frontend
- [ ] Load testing for address APIs

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://testingjavascript.com/)

## Support

For issues or questions about the test suite:
1. Check this README first
2. Review test output for specific errors
3. Check database migrations are up to date
4. Verify environment variables are set
5. Review test logs for detailed error information

---

**Last Updated:** October 1, 2026
**Version:** 1.0
**Test Coverage:** 35+ integration tests
**Status:** Ready for Execution
