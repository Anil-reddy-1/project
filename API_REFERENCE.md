# Enterprise Operations Manager - API Reference Documentation

## Base URL
```
Production: https://api.enterprise-ops.com/v1
Development: http://localhost:3000/api/v1
```

## Authentication

All API requests require authentication using JWT tokens.

### Headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

---

## 1. Authentication & Authorization

### POST /auth/login
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "name": "John Doe",
      "email": "admin@example.com",
      "role": "admin",
      
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### POST /auth/logout
Invalidate current session.

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### POST /auth/refresh
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 2. User Management

### GET /users
Retrieve all users with pagination and filtering.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `search` (string): Search by name, email, or role
- `role` (string): Filter by role
- `status` (string): Filter by status (active/inactive)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user_123",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+91 98765 43210",
        "role": "Administrator",
        "status": "active",
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-09-17T08:45:00Z"
      }
    ],
    "pagination": {
      "total": 156,
      "page": 1,
      "limit": 20,
      "totalPages": 8
    }
  }
}
```

### POST /users
Create a new user.

**Required Permission:** `users.create`

**Request Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "+91 98765 43211",
  "password": "securePassword123",
  "role": "Seller",
  "status": "active"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_124",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "phone": "+91 98765 43211",
      "role": "Seller",
      "status": "active",
      "createdAt": "2024-09-17T10:00:00Z"
    }
  }
}
```

### PUT /users/:id
Update user information.

**Required Permission:** `users.update`

**Request Body:**
```json
{
  "name": "Jane Smith Updated",
  "phone": "+91 98765 43299",
  "role": "Manager",
  "status": "active"
}
```

### DELETE /users/:id
Delete a user.

**Required Permission:** `users.delete`

**Response (200):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

## 3. Role Management

### GET /roles
Retrieve all roles.

**Required Permission:** `roles.view`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "roles": [
      {
        "id": "role_1",
        "name": "Administrator",
        "description": "Full system access",
        "permissions": ["users.view", "users.create", "..."],
        "userCount": 3,
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

### POST /roles
Create a new role.

**Required Permission:** `roles.manage`

**Request Body:**
```json
{
  "name": "Stock Manager",
  "description": "Manages inventory and stock",
  "permissions": [
    "products.view",
    "stock.view",
    "stock.manage",
    "stock.adjust"
  ]
}
```

### PUT /roles/:id
Update role and permissions.

**Required Permission:** `roles.manage`

**Request Body:**
```json
{
  "name": "Stock Manager",
  "description": "Updated description",
  "permissions": ["products.view", "stock.view", "stock.manage"]
}
```

---

## 4. Staff Management

### GET /staff
Retrieve all staff members.

**Query Parameters:**
- `role` (string): Filter by role (Manager/Seller/Delivery Partner)
- `status` (string): Filter by status
- `availability` (string): Filter by availability (available/busy/offline)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "staff": [
      {
        "id": "staff_1",
        "name": "Charlie Brown",
        "email": "charlie@company.com",
        "phone": "+91 98765 33333",
        "role": "Delivery Partner",
        "status": "active",
        "availability": "available",
        "activeDeliveries": 0,
        "createdAt": "2024-03-01T00:00:00Z"
      }
    ]
  }
}
```

### POST /staff
Add new staff member.

**Request Body:**
```json
{
  "name": "New Staff",
  "email": "staff@company.com",
  "phone": "+91 98765 00000",
  "role": "Seller",
  "status": "active"
}
```

### PATCH /staff/:id/availability
Update delivery partner availability.

**Request Body:**
```json
{
  "availability": "busy"
}
```

---

## 5. Stock Management

### GET /stock
Retrieve stock inventory.

**Required Permission:** `stock.view`

**Query Parameters:**
- `search` (string): Search by name, SKU, or category
- `status` (string): Filter by status (active/low-stock/out-of-stock)
- `category` (string): Filter by category

**Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "stock_1",
        "sku": "SKU001",
        "name": "Rice (Basmati)",
        "category": "Grains",
        "quantity": 500,
        "unit": "kg",
        "minStock": 100,
        "price": 120,
        "lastUpdated": "2024-09-17T10:00:00Z",
        "status": "active"
      }
    ]
  }
}
```

### POST /stock/adjust
Adjust stock levels.

**Required Permission:** `stock.adjust`

**Request Body:**
```json
{
  "productId": "stock_1",
  "type": "add",
  "quantity": 100,
  "reason": "Purchase from supplier",
  "notes": "Batch #12345"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "adjustment": {
      "id": "adj_1",
      "productId": "stock_1",
      "type": "add",
      "quantity": 100,
      "previousQuantity": 500,
      "newQuantity": 600,
      "reason": "Purchase from supplier",
      "performedBy": "user_123",
      "timestamp": "2024-09-17T10:00:00Z"
    }
  }
}
```

### GET /stock/:id/history
Get stock adjustment history.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "id": "adj_1",
        "type": "add",
        "quantity": 100,
        "previousQuantity": 400,
        "newQuantity": 500,
        "reason": "Purchase",
        "performedBy": "Admin",
        "timestamp": "2024-09-15T10:00:00Z"
      }
    ]
  }
}
```

---

## 6. Pricing Management

### GET /pricing
Retrieve product pricing.

**Required Permission:** `pricing.view`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "product_1",
        "sku": "SKU001",
        "name": "Rice (Basmati)",
        "currentPrice": 120,
        "previousPrice": 115,
        "lastChanged": "2024-09-10T00:00:00Z",
        "changedBy": "admin@example.com"
      }
    ]
  }
}
```

### PUT /pricing/:id
Update product price.

**Required Permission:** `pricing.update`

**Request Body:**
```json
{
  "newPrice": 125,
  "reason": "Market adjustment",
  "effectiveDate": "2024-09-20T00:00:00Z"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "priceUpdate": {
      "productId": "product_1",
      "previousPrice": 120,
      "newPrice": 125,
      "change": 5,
      "changePercentage": 4.17,
      "updatedBy": "user_123",
      "timestamp": "2024-09-17T10:00:00Z"
    }
  }
}
```

### GET /pricing/:id/history
Get price change history.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "price": 115,
        "effectiveDate": "2024-08-01T00:00:00Z",
        "changedBy": "user_123"
      },
      {
        "price": 120,
        "effectiveDate": "2024-09-10T00:00:00Z",
        "changedBy": "user_123"
      }
    ]
  }
}
```

---

## 7. Order Management

### GET /orders
Retrieve orders.

**Required Permission:** `orders.view`

**Query Parameters:**
- `status` (string): Filter by status
- `customer` (string): Filter by customer
- `dateFrom` (date): From date
- `dateTo` (date): To date

**Response (200):**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "ORD-2026-000245",
        "customer": {
          "id": "cust_123",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "items": [
          {
            "productId": "prod_1",
            "productName": "Rice (Basmati)",
            "quantity": 50,
            "unitPrice": 120,
            "total": 6000
          }
        ],
        "totalAmount": 6000,
        "status": "confirmed",
        "paymentStatus": "paid",
        "deliveryStatus": "pending",
        "createdAt": "2024-09-17T10:00:00Z"
      }
    ]
  }
}
```

### POST /orders
Create new order.

**Request Body:**
```json
{
  "customerId": "cust_123",
  "items": [
    {
      "productId": "prod_1",
      "quantity": 50
    }
  ],
  "deliveryAddress": {
    "name": "John Doe",
    "phone": "+91 98765 43210",
    "addressLine": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "postalCode": "400001"
  }
}
```

### PATCH /orders/:id/status
Update order status.

**Required Permission:** `orders.process`

**Request Body:**
```json
{
  "status": "processing",
  "notes": "Order being prepared"
}
```

---

## 8. Delivery Management

### GET /deliveries
Retrieve deliveries.

**Required Permission:** `delivery.view`

**Query Parameters:**
- `status` (string): Filter by status
- `partnerId` (string): Filter by delivery partner

**Response (200):**
```json
{
  "success": true,
  "data": {
    "deliveries": [
      {
        "id": "DEL-001",
        "orderId": "ORD-2026-000245",
        "customer": {
          "name": "John Doe",
          "phone": "+91 98765 43210",
          "address": "123 Main St, Mumbai"
        },
        "partner": {
          "id": "staff_3",
          "name": "Charlie Brown"
        },
        "status": "in_progress",
        "amount": 15000,
        "assignedAt": "2024-09-17T09:00:00Z",
        "acceptedAt": "2024-09-17T09:05:00Z",
        "startedAt": "2024-09-17T10:00:00Z"
      }
    ]
  }
}
```

### POST /deliveries/:id/assign
Assign delivery to partner.

**Required Permission:** `delivery.assign`

**Request Body:**
```json
{
  "partnerId": "staff_3"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "delivery": {
      "id": "DEL-001",
      "orderId": "ORD-2026-000245",
      "partnerId": "staff_3",
      "status": "assigned",
      "assignedAt": "2024-09-17T10:00:00Z"
    }
  }
}
```

### PATCH /deliveries/:id/status
Update delivery status.

**Request Body:**
```json
{
  "status": "completed",
  "notes": "Delivered successfully",
  "proofOfDelivery": "signature_url_or_otp"
}
```

---

## 9. Debt & Payables Management

### GET /debts
Retrieve debts and payables.

**Required Permission:** `debt.view`

**Query Parameters:**
- `status` (string): Filter by status (pending/partial/cleared)
- `overdue` (boolean): Show only overdue debts

**Response (200):**
```json
{
  "success": true,
  "data": {
    "debts": [
      {
        "id": "DBT001",
        "description": "Supplier Payment - ABC Foods",
        "originalAmount": 100000,
        "paidAmount": 60000,
        "remainingAmount": 40000,
        "status": "partial",
        "dueDate": "2024-10-01T00:00:00Z",
        "createdAt": "2024-09-01T00:00:00Z"
      }
    ],
    "summary": {
      "totalPending": 90000,
      "totalCleared": 150000,
      "overdueCount": 2
    }
  }
}
```

### POST /debts
Create new debt record.

**Required Permission:** `debt.manage`

**Request Body:**
```json
{
  "description": "Supplier Payment - XYZ Ltd",
  "amount": 75000,
  "dueDate": "2024-10-15T00:00:00Z",
  "notes": "Monthly supplier payment"
}
```

### POST /debts/:id/payment
Record debt payment.

**Required Permission:** `debt.manage`

**Request Body:**
```json
{
  "amount": 20000,
  "paymentDate": "2024-09-17T00:00:00Z",
  "paymentMethod": "Bank Transfer",
  "referenceNumber": "TXN123456",
  "notes": "Partial payment"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "payment": {
      "id": "pay_1",
      "debtId": "DBT001",
      "amount": 20000,
      "previousBalance": 40000,
      "newBalance": 20000,
      "paymentDate": "2024-09-17T00:00:00Z",
      "recordedBy": "user_123"
    }
  }
}
```

---

## 10. Reports

### POST /reports/generate
Generate business report.

**Required Permission:** `reports.view`

**Request Body:**
```json
{
  "type": "sales",
  "startDate": "2024-09-01",
  "endDate": "2024-09-15",
  "format": "pdf",
  "filters": {
    "category": "Grains",
    "minAmount": 10000
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "report": {
      "id": "report_123",
      "type": "sales",
      "period": "2024-09-01 to 2024-09-15",
      "generatedAt": "2024-09-17T10:00:00Z",
      "downloadUrl": "https://api.example.com/reports/report_123/download",
      "expiresAt": "2024-09-24T10:00:00Z"
    }
  }
}
```

### GET /reports/:id/download
Download generated report.

**Required Permission:** `reports.export`

**Response:** Binary file (PDF/Excel)

---

## 11. Dashboard & Analytics

### GET /dashboard/stats
Get dashboard statistics.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "revenue": {
      "total": 2545000,
      "change": 12,
      "period": "month"
    },
    "orders": {
      "total": 1284,
      "change": 8,
      "pending": 23
    },
    "lowStockItems": 3,
    "activeDeliveries": 12,
    "pendingDebts": 90000
  }
}
```

---

## Error Responses

All endpoints return consistent error format:

**400 Bad Request:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions",
    "requiredPermission": "users.delete"
  }
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred",
    "requestId": "req_xyz123"
  }
}
```

---

## Rate Limiting

- 1000 requests per hour per API key
- 100 requests per minute per IP
- Rate limit headers included in responses:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

---

## Webhooks (Optional)

Subscribe to events:
- `order.created`
- `order.completed`
- `delivery.completed`
- `delivery.failed`
- `stock.low`
- `debt.overdue`

**Webhook Payload:**
```json
{
  "event": "order.completed",
  "timestamp": "2024-09-17T10:00:00Z",
  "data": {
    "orderId": "ORD-2026-000245",
    "status": "completed"
  }
}
```

---

## Pagination

All list endpoints support pagination:

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response includes:**
```json
{
  "pagination": {
    "total": 156,
    "page": 1,
    "limit": 20,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## Sorting & Filtering

**Sort Parameter:**
```
?sort=createdAt:desc,name:asc
```

**Filter Parameters:**
```
?status=active&role=Seller&search=john
```

---

**End of API Reference**


---

## Product Management API

### GET /products/buyer
Get active products for buyers (public endpoint).

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `search` (string): Search by product name or SKU
- `categoryTags` (string|array): Filter by category tags (comma-separated or JSON array)
- `priceMin` (number): Minimum price filter
- `priceMax` (number): Maximum price filter
- `sortBy` (string): Sort field (created_at, name, price, quantity) (default: created_at)
- `sortOrder` (string): Sort order (ASC, DESC) (default: DESC)

**Response (200):**
```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "sku": "PROD-001",
      "name": "Premium Product",
      "description": "High quality product",
      "categoryTags": ["Electronics", "Premium"],
      "quantity": 100,
      "unit": "pcs",
      "minStock": 10,
      "maxStock": 500,
      "minOrderQuantity": 1,
      "price": 99.99,
      "status": "active",
      "primaryImageUrl": "https://res.cloudinary.com/...",
      "images": [
        {
          "id": "uuid",
          "url": "https://res.cloudinary.com/...",
          "publicId": "products/xxx",
          "displayOrder": 0,
          "isPrimary": true
        }
      ],
      "stockStatus": "healthy",
      "lowStockPercentage": 20.0,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-16T14:20:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

### GET /products/admin/all
Get all products with advanced filtering (admin only).

**Authentication:** Required (Admin role)

**Query Parameters:**
- All parameters from buyer endpoint plus:
- `status` (string): Filter by status (active, inactive)
- `stockStatus` (string): Filter by stock status (low, out, healthy)

**Response:** Same structure as buyer endpoint

### GET /products/:id
Get single product by ID.

**Response (200):**
```json
{
  "success": true,
  "message": "Product retrieved successfully",
  "data": {
    "id": "uuid",
    "sku": "PROD-001",
    "name": "Premium Product",
    "description": "High quality product",
    "categoryTags": ["Electronics", "Premium"],
    "quantity": 100,
    "unit": "pcs",
    "minStock": 10,
    "maxStock": 500,
    "minOrderQuantity": 1,
    "price": 99.99,
    "status": "active",
    "primaryImageUrl": "https://res.cloudinary.com/...",
    "images": [
      {
        "id": "uuid",
        "url": "https://res.cloudinary.com/...",
        "publicId": "products/xxx",
        "displayOrder": 0,
        "isPrimary": true
      }
    ],
    "stockStatus": "healthy",
    "lowStockPercentage": 20.0,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-16T14:20:00Z"
  }
}
```

### POST /products
Create new product with optional images.

**Authentication:** Required (Admin role)

**Content-Type:** multipart/form-data

**Form Fields:**
- `sku` (string, required): Unique SKU
- `name` (string, required): Product name
- `description` (string, optional): Product description
- `categoryTags` (string|array, optional): Category tags (JSON array or comma-separated)
- `quantity` (number, optional): Initial quantity (default: 0)
- `unit` (string, optional): Unit of measure (default: "unit")
- `minStock` (number, optional): Minimum stock threshold (default: 0)
- `maxStock` (number, optional): Maximum stock capacity
- `minOrderQuantity` (number, optional): Minimum order quantity (default: 1)
- `price` (number, required): Product price
- `status` (string, optional): Product status (active, inactive) (default: "active")
- `images` (files[], optional): Product images (max 10, 5MB each)

**Response (201):**
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "id": "uuid",
    "sku": "PROD-001",
    "name": "Premium Product",
    ...
  }
}
```

**Error Response (409 - Duplicate SKU):**
```json
{
  "success": false,
  "message": "Product with this SKU already exists",
  "error": "DUPLICATE_SKU"
}
```

### PUT /products/:id
Update product with optional new images.

**Authentication:** Required (Admin role)

**Content-Type:** multipart/form-data

**Form Fields:** Same as create, but all optional except what's being updated

**Response (200):**
```json
{
  "success": true,
  "message": "Product updated successfully",
  "data": { ... }
}
```

### DELETE /products/:id
Soft delete product (set status to inactive).

**Authentication:** Required (Admin role)

**Response (200):**
```json
{
  "success": true,
  "message": "Product deleted successfully",
  "data": {
    "id": "uuid",
    "status": "inactive",
    ...
  }
}
```

### PATCH /products/bulk/status
Bulk update product status.

**Authentication:** Required (Admin role)

**Request Body:**
```json
{
  "productIds": ["uuid1", "uuid2", "uuid3"],
  "status": "active"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Successfully updated 3 products",
  "data": [
    {
      "id": "uuid1",
      "sku": "PROD-001",
      "name": "Product 1",
      "status": "active"
    },
    ...
  ]
}
```

### GET /products/stats/dashboard
Get product statistics for dashboard.

**Authentication:** Required (Admin role)

**Response (200):**
```json
{
  "success": true,
  "message": "Product statistics retrieved successfully",
  "data": {
    "totalProducts": 150,
    "inStockCount": 120,
    "lowStockCount": 15,
    "outOfStockCount": 15,
    "totalInventoryValue": 125000.50,
    "categoriesCount": 8
  }
}
```

### GET /products/alerts/low-stock
Get products below 10% of max stock.

**Authentication:** Required (Admin role)

**Response (200):**
```json
{
  "success": true,
  "message": "Low stock products retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "sku": "PROD-001",
      "name": "Low Stock Product",
      "quantity": 5,
      "maxStock": 100,
      "stockPercentage": 5.0,
      ...
    }
  ],
  "count": 15
}
```

### GET /products/categories
Get all unique category tags.

**Response (200):**
```json
{
  "success": true,
  "message": "Category tags retrieved successfully",
  "data": ["Electronics", "Premium", "Office Supplies", "Furniture"]
}
```

### GET /products/export/csv
Export products to CSV file.

**Authentication:** Required (Admin role)

**Query Parameters:** Same as GET /products/admin/all (for filtering)

**Response (200):**
- Content-Type: text/csv
- File download with name: products-{timestamp}.csv

### DELETE /products/:id/images/:imageId
Delete product image.

**Authentication:** Required (Admin role)

**Response (200):**
```json
{
  "success": true,
  "message": "Image deleted successfully"
}
```

### PATCH /products/:id/images/:imageId/primary
Set image as primary.

**Authentication:** Required (Admin role)

**Response (200):**
```json
{
  "success": true,
  "message": "Primary image updated successfully"
}
```

### PUT /products/:id/images/reorder
Reorder product images.

**Authentication:** Required (Admin role)

**Request Body:**
```json
{
  "imageOrder": [
    { "id": "uuid1", "displayOrder": 0 },
    { "id": "uuid2", "displayOrder": 1 },
    { "id": "uuid3", "displayOrder": 2 }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Images reordered successfully"
}
```

---

## Wishlist API

### GET /wishlist
Get user's wishlist with product details.

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "message": "Wishlist retrieved successfully",
  "data": [
    {
      "wishlistId": "uuid",
      "addedAt": "2024-01-15T10:30:00Z",
      "product": {
        "id": "uuid",
        "sku": "PROD-001",
        "name": "Product Name",
        "description": "Product description",
        "categoryTags": ["Electronics"],
        "quantity": 100,
        "unit": "pcs",
        "minOrderQuantity": 1,
        "price": 99.99,
        "status": "active",
        "primaryImageUrl": "https://...",
        "stockStatus": "healthy",
        "images": [...]
      }
    }
  ],
  "count": 5
}
```

### POST /wishlist
Add product to wishlist.

**Authentication:** Required

**Request Body:**
```json
{
  "productId": "uuid"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Product added to wishlist",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "productId": "uuid",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Response (200 - Already exists):**
```json
{
  "success": true,
  "message": "Product already in wishlist",
  "data": {
    "alreadyExists": true
  }
}
```

### DELETE /wishlist/:productId
Remove product from wishlist.

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "message": "Product removed from wishlist",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "productId": "uuid"
  }
}
```

### GET /wishlist/check/:productId
Check if product is in wishlist.

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "data": {
    "isInWishlist": true
  }
}
```

### GET /wishlist/count
Get wishlist item count.

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "data": {
    "count": 5
  }
}
```

### DELETE /wishlist
Clear entire wishlist.

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "message": "Cleared 5 items from wishlist",
  "data": {
    "deletedCount": 5
  }
}
```

---

## Image Upload API

### POST /uploads/image
Upload single image to Cloudinary.

**Authentication:** Required

**Content-Type:** multipart/form-data

**Form Fields:**
- `image` (file, required): Image file (jpeg, jpg, png, gif, webp, max 5MB)
- `folder` (string, optional): Cloudinary folder name (default: "products")

**Response (200):**
```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "data": {
    "url": "https://res.cloudinary.com/...",
    "publicId": "products/xxx",
    "width": 1920,
    "height": 1080,
    "format": "jpg",
    "size": 245678
  }
}
```

### POST /uploads/images
Upload multiple images to Cloudinary (max 10).

**Authentication:** Required

**Content-Type:** multipart/form-data

**Form Fields:**
- `images` (files[], required): Image files (max 10, 5MB each)
- `folder` (string, optional): Cloudinary folder name (default: "products")

**Response (200):**
```json
{
  "success": true,
  "message": "Successfully uploaded 3 images",
  "data": [
    {
      "url": "https://res.cloudinary.com/...",
      "publicId": "products/xxx1",
      "width": 1920,
      "height": 1080,
      "format": "jpg",
      "size": 245678
    },
    ...
  ]
}
```

### DELETE /uploads/image/:publicId
Delete image from Cloudinary.

**Authentication:** Required

**URL Parameter:**
- `publicId` (string, URL-encoded): Cloudinary public ID

**Response (200):**
```json
{
  "success": true,
  "message": "Image deleted successfully",
  "data": {
    "publicId": "products/xxx"
  }
}
```

---

## Error Responses

### 400 Bad Request - Validation Error
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "sku",
      "message": "SKU is required"
    },
    {
      "field": "price",
      "message": "Price must be a number"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required. Missing Bearer token in Authorization header.",
  "error": "MISSING_TOKEN"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Forbidden. Requires one of the following roles: admin",
  "error": "INSUFFICIENT_PERMISSIONS"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Product not found"
}
```

### 409 Conflict
```json
{
  "success": false,
  "message": "Product with this SKU already exists",
  "error": "DUPLICATE_SKU"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to create product",
  "error": "Error details..."
}
```
