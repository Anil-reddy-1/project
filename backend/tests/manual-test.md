# Manual Testing Guide for Order & Delivery System

## Prerequisites

### 1. Start PostgreSQL Database
Ensure your PostgreSQL server is running on port 5433 (as configured in .env):

```powershell
# Check if database is running
netstat -an | Select-String "5433"

# If not running, start your PostgreSQL service
# Example for Windows:
# services.msc -> PostgreSQL -> Start
```

### 2. Run Migrations
```powershell
cd backend
npm run migrate
```

### 3. Start Backend Server
```powershell
cd backend
npm run dev
```

### 4. Start Frontend
```powershell
cd frontend
npm run dev
```

## Integration Test Issues

The automated integration tests have two issues:

1. **Database Connection**: Tests require the database to be running on port 5433
2. **Response Format**: Signup endpoint returns `customToken` not `token`

## Manual Test Flow

### Test 1: Create Users
```http
POST http://localhost:5000/api/v1/signup
Content-Type: application/json

{
  "email": "buyer@test.com",
  "password": "Test123!@#",
  "name": "Test Buyer",
  "phone": "1234567890",
  "role": "buyer"
}
```

### Test 2: Login (get tokens)
Use Firebase authentication on the frontend or create a login endpoint.

### Test 3: Add Product to Cart
```http
POST http://localhost:5000/api/v1/cart
Authorization: Bearer <buyer-token>
Content-Type: application/json

{
  "productId": "<product-id>",
  "quantity": 2
}
```

### Test 4: Create Address
```http
POST http://localhost:5000/api/v1/addresses
Authorization: Bearer <buyer-token>
Content-Type: application/json

{
  "name": "Home",
  "phone": "1234567890",
  "addressLine1": "123 Test St",
  "city": "Test City",
  "state": "Test State",
  "postalCode": "12345",
  "isDefault": true
}
```

### Test 5: Validate Order
```http
POST http://localhost:5000/api/v1/orders/validate
Authorization: Bearer <buyer-token>
Content-Type: application/json

{
  "addressId": "<address-id>"
}
```

### Test 6: Place Order
```http
POST http://localhost:5000/api/v1/orders
Authorization: Bearer <buyer-token>
Content-Type: application/json

{
  "addressId": "<address-id>",
  "paymentMethod": "COD",
  "notes": "Test order"
}
```

### Test 7: Admin Assigns Delivery
```http
POST http://localhost:5000/api/v1/deliveries/<delivery-id>/assign
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "deliveryPartnerId": "<partner-id>",
  "notes": "Urgent delivery"
}
```

### Test 8: Partner Accepts Delivery
```http
POST http://localhost:5000/api/v1/deliveries/<delivery-id>/accept
Authorization: Bearer <partner-token>
Content-Type: application/json

{
  "notes": "Accepted"
}
```

### Test 9: Partner Starts Delivery
```http
POST http://localhost:5000/api/v1/deliveries/<delivery-id>/start
Authorization: Bearer <partner-token>
Content-Type: application/json

{
  "notes": "Out for delivery"
}
```

### Test 10: Partner Completes Delivery
```http
POST http://localhost:5000/api/v1/deliveries/<delivery-id>/complete
Authorization: Bearer <partner-token>
Content-Type: application/json

{
  "notes": "Delivered successfully"
}
```

## Frontend Testing

### Buyer Flow:
1. Navigate to http://localhost:5173/buyer/products
2. Add products to cart
3. Go to cart → Checkout
4. Select/add address
5. Place order
6. View orders → Check order status

### Admin Flow:
1. Navigate to http://localhost:5173/admin/orders
2. View all orders
3. Click on an order → Assign delivery partner
4. Monitor order status

### Delivery Partner Flow:
1. Navigate to http://localhost:5173/delivery/deliveries
2. View assigned deliveries
3. Accept delivery
4. Start delivery
5. Complete delivery

## Verification Points

- [ ] Stock is deducted after order placement
- [ ] Cart is cleared after order
- [ ] Delivery record auto-created when order confirmed
- [ ] Order status syncs when delivery assigned
- [ ] Order status syncs when delivery completed
- [ ] Notifications appear in NotificationBell
- [ ] Delivery status history tracked
- [ ] Cannot assign non-existent partner
- [ ] Cannot update other partner's delivery
- [ ] Cannot order out-of-stock products
