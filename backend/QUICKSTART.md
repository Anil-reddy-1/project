# Quick Start Guide

## Prerequisites

- Node.js v16+ installed
- PostgreSQL running
- Redis running
- Firebase project set up

## Setup Steps

### 1. Environment Configuration

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
# Server
PORT=4001
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=enterprise_ops
DB_USER=postgres
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Firebase (get from Firebase Console > Project Settings > Service Accounts)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will:
1. Connect to PostgreSQL
2. Connect to Redis
3. Create database tables automatically
4. Start listening on port 4001

### 4. Test the API

#### Health Check
```bash
curl http://localhost:4001/
```

Expected response:
```json
{
  "success": true,
  "message": "Enterprise Operations Manager API v1.0",
  "data": {
    "status": "healthy",
    "database": "enterprise_ops",
    "version": "1.0.0",
    "timestamp": "2026-09-17T..."
  }
}
```

#### Test Protected Endpoint (requires Firebase token)
```bash
curl -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
     http://localhost:4001/api/v1/dashboard/stats
```

## API Base URL

```
http://localhost:4001/api/v1
```

## Available Endpoints

### Public Endpoints
- `GET /` - Health check

### Protected Endpoints (require Firebase token)

**Authentication**
- `POST /api/v1/auth/login` - Login (Firebase client SDK)
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/me` - Get current user

**Users** (Admin only)
- `GET /api/v1/users` - List users
- `POST /api/v1/users` - Create user
- `PUT /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user

**Staff** (Admin only)
- `GET /api/v1/staff` - List staff
- `POST /api/v1/staff` - Create staff
- `PATCH /api/v1/staff/:id/availability` - Update availability

**Stock** (Admin view/modify, Buyer view only)
- `GET /api/v1/stock` - List stock
- `POST /api/v1/stock` - Create stock item (Admin)
- `POST /api/v1/stock/adjust` - Adjust stock (Admin)

**Orders** (Admin full, Buyer create/view)
- `GET /api/v1/orders` - List orders
- `POST /api/v1/orders` - Create order
- `PATCH /api/v1/orders/:id/status` - Update status (Admin)

**Deliveries** (Admin assign, Delivery update)
- `GET /api/v1/deliveries` - List deliveries
- `POST /api/v1/deliveries/:id/assign` - Assign delivery (Admin)
- `PATCH /api/v1/deliveries/:id/status` - Update status (Delivery)

**Dashboard** (All roles)
- `GET /api/v1/dashboard/stats` - Dashboard statistics

## Authentication Flow

### 1. User logs in via Firebase (frontend)
```javascript
// Frontend code
import { signInWithEmailAndPassword } from 'firebase/auth';

const userCredential = await signInWithEmailAndPassword(auth, email, password);
const token = await userCredential.user.getIdToken();
```

### 2. Include token in API requests
```javascript
// Frontend code
const response = await fetch('http://localhost:4001/api/v1/dashboard/stats', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### 3. Backend validates token and checks permissions
The API automatically:
- Verifies the Firebase token
- Extracts user role from database
- Checks if user has permission for the requested action
- Returns 401 if unauthorized, 403 if forbidden

## Role-Based Access

### Creating Users with Roles

When creating a user (admin only):
```bash
curl -X POST http://localhost:4001/api/v1/users \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "role": "buyer",
    "status": "active"
  }'
```

Valid roles: `admin`, `buyer`, `delivery`

## Common Scenarios

### Scenario 1: Buyer Creates an Order

```bash
curl -X POST http://localhost:4001/api/v1/orders \
  -H "Authorization: Bearer BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Jane Smith",
    "customerEmail": "jane@example.com",
    "items": [
      {"productId": "uuid-here", "quantity": 10}
    ],
    "deliveryAddress": {
      "name": "Jane Smith",
      "phone": "+1234567890",
      "addressLine": "123 Main St",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001"
    }
  }'
```

### Scenario 2: Admin Assigns Delivery

```bash
curl -X POST http://localhost:4001/api/v1/deliveries/delivery-id/assign \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "partnerId": "staff-uuid-here"
  }'
```

### Scenario 3: Delivery Partner Updates Status

```bash
curl -X PATCH http://localhost:4001/api/v1/deliveries/delivery-id/status \
  -H "Authorization: Bearer DELIVERY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "notes": "Delivered successfully"
  }'
```

## Troubleshooting

### Server won't start
1. Check PostgreSQL is running: `pg_isready`
2. Check Redis is running: `redis-cli ping`
3. Check environment variables in `.env`
4. Check logs in console

### 401 Unauthorized
1. Verify Firebase token is valid
2. Check token hasn't expired (tokens expire after 1 hour)
3. Refresh token on frontend if needed

### 403 Forbidden
1. Check user role in database
2. Verify endpoint requires correct permission
3. See role permission matrix in `rolePermission.js`

### Database errors
1. Ensure database exists: `createdb enterprise_ops`
2. Check database credentials in `.env`
3. Tables will auto-create on first run

### Firebase errors
1. Verify Firebase credentials are correct
2. Check private key format (should include \n characters)
3. Ensure Firebase project is active

## Testing with Different Roles

### 1. Create an Admin User (manually in database)
```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

### 2. Create a Buyer (via API as admin)
```bash
curl -X POST http://localhost:4001/api/v1/users \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"name":"Buyer User","email":"buyer@example.com","role":"buyer"}'
```

### 3. Create a Delivery Partner (via staff endpoint)
```bash
curl -X POST http://localhost:4001/api/v1/staff \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"name":"Delivery Guy","email":"delivery@example.com","role":"delivery_partner"}'
```

## Next Steps

1. ✅ Server running successfully
2. 📱 Connect frontend to API
3. 🔐 Test authentication flow
4. 🧪 Test role-based access
5. 📊 Test all endpoints
6. 🚀 Deploy to production

## Need Help?

- Check `README.md` for full API documentation
- Check `IMPLEMENTATION_COMPLETE.md` for implementation details
- Check API_REFERENCE.md for endpoint specifications
- Review logs in console for detailed error messages

---

Happy coding! 🚀
