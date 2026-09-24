# Testing Guide

## Integration Tests Status

The integration tests in `tests/integration/order-flow.test.js` are configured but require fixes before they can run successfully.

### Issues to Fix:

1. **Database Connection Required**
   - Tests need PostgreSQL running on port 5433
   - Ensure database is started before running tests
   - Alternative: Create separate test database configuration

2. **Authentication Token Format**
   - Current signup endpoint returns `customToken` (Firebase token)
   - Tests expect `token` in response
   - Need to either:
     - Update test to use Firebase authentication flow
     - Create test-specific login endpoint that returns JWT
     - Mock authentication for tests

3. **Server Lifecycle**
   - Express server starts when app is imported
   - Causes open handles in Jest
   - Solution: Separate app creation from server listening

### Recommended Approach:

#### Option 1: Use Manual Testing (Recommended for Now)
See `tests/manual-test.md` for step-by-step manual testing workflow.

#### Option 2: Fix Integration Tests
1. **Create test app factory**:
   ```javascript
   // src/app.js - export app without starting server
   // src/server.js - start server for development
   // tests use src/app.js
   ```

2. **Add test authentication helper**:
   ```javascript
   // tests/helpers/auth.js
   async function getTestToken(email, password) {
     // Authenticate with Firebase and return token
   }
   ```

3. **Configure test database**:
   ```javascript
   // tests/setup.js
   process.env.DATABASE_NAME = 'ganga_jamuna_test';
   ```

## Current Test Capabilities

The test file `order-flow.test.js` includes:

### Complete Order Flow Tests (13 tests):
1. Buyer adds product to cart
2. Buyer validates order before checkout
3. Buyer places order from cart
4. Stock deduction verification
5. Cart clearing verification
6. Auto-created delivery record verification
7. Admin assigns delivery to partner
8. Order status update to assigned
9. Partner accepts delivery
10. Partner starts delivery
11. Partner completes delivery
12. Order status update to delivered
13. Delivery status history tracking

### Error Handling Tests (3 tests):
1. Cannot place order with out-of-stock product
2. Cannot assign delivery to non-existent partner
3. Partner cannot update other partner's delivery

## Running Tests (Once Fixed)

```powershell
# Ensure database is running
# Start PostgreSQL on port 5433

# Run all tests
npm test

# Run specific test file
npm test tests/integration/order-flow.test.js

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

## Alternative: Use Frontend for Testing

The complete system can be tested through the UI:
1. Start backend: `npm run dev` (in backend folder)
2. Start frontend: `npm run dev` (in frontend folder)
3. Follow the manual test flow in `tests/manual-test.md`

All functionality is working through the UI.
