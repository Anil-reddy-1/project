# Enterprise Operations Manager - Backend API

Complete REST API implementation with Firebase authentication, role-based access control, and comprehensive validation.

## Features

- ✅ Firebase Authentication integration
- ✅ Role-Based Access Control (RBAC) - 3 roles: `admin`, `buyer`, `delivery`
- ✅ Comprehensive validation with Joi
- ✅ Clean folder structure (MVC pattern)
- ✅ PostgreSQL database with connection pooling
- ✅ Redis caching support
- ✅ Comprehensive error handling
- ✅ Request logging with Winston
- ✅ Standardized API responses

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Cache**: Redis
- **Authentication**: Firebase Admin SDK
- **Validation**: Joi
- **Logging**: Winston

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   │   ├── db.js
│   │   ├── env.js
│   │   ├── firebase.js
│   │   └── redis.js
│   ├── controller/      # Route controllers
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── roleController.js
│   │   ├── staffController.js
│   │   ├── stockController.js
│   │   ├── pricingController.js
│   │   ├── orderController.js
│   │   ├── deliveryController.js
│   │   ├── debtController.js
│   │   ├── reportController.js
│   │   └── dashboardController.js
│   ├── middleware/      # Custom middleware
│   │   ├── auth.js              # Firebase auth verification
│   │   ├── rolePermission.js    # RBAC middleware
│   │   ├── validateRequest.js   # Request validation
│   │   └── errorHandler.js      # Global error handler
│   ├── models/          # Data access layer
│   │   ├── createTables.js
│   │   ├── userModel.js
│   │   ├── staffModel.js
│   │   ├── stockModel.js
│   │   ├── productModel.js
│   │   ├── orderModel.js
│   │   ├── deliveryModel.js
│   │   └── debtModel.js
│   ├── routes/          # API routes
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── role.routes.js
│   │   ├── staff.routes.js
│   │   ├── stock.routes.js
│   │   ├── pricing.routes.js
│   │   ├── order.routes.js
│   │   ├── delivery.routes.js
│   │   ├── debt.routes.js
│   │   ├── report.routes.js
│   │   └── dashboard.routes.js
│   ├── utils/           # Utility functions
│   │   ├── error.js
│   │   ├── logger.js
│   │   └── response.js
│   └── index.js         # App entry point
├── .env
├── .env.example
├── package.json
└── README.md
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables (copy `.env.example` to `.env`):
```env
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
REDIS_PASSWORD=

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

3. Start the server:
```bash
# Development
npm run dev

# Production
npm start
```

## API Base URL

```
Development: http://localhost:4001/api/v1
Production: https://api.enterprise-ops.com/api/v1
```

## Authentication

All protected endpoints require a Firebase ID token in the Authorization header:

```
Authorization: Bearer <firebase_id_token>
```

Get the token from Firebase Authentication on the frontend.

## Roles & Permissions

### Admin Role
Full access to all resources:
- ✅ Users: view, create, update, delete
- ✅ Staff: view, create, update, delete
- ✅ Stock: view, create, update, delete, adjust
- ✅ Pricing: view, update
- ✅ Orders: view, create, update, delete
- ✅ Deliveries: view, create, assign, update
- ✅ Debts: view, create, update, record_payment
- ✅ Reports: view, generate, export
- ✅ Dashboard: view

### Buyer Role
Limited access for ordering:
- ✅ Orders: view, create
- ✅ Deliveries: view
- ✅ Stock: view
- ✅ Pricing: view
- ✅ Dashboard: view

### Delivery Role
Access for delivery management:
- ✅ Deliveries: view, update
- ✅ Orders: view
- ✅ Dashboard: view

## API Endpoints

### Public Endpoints (No Authentication Required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/signup/buyer` | Register as a buyer |
| GET | `/api/v1/signup/check-email` | Check if email is available |

### Authentication
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/api/v1/auth/login` | Public | Login (Firebase client SDK) |
| POST | `/api/v1/auth/logout` | Authenticated | Logout |
| POST | `/api/v1/auth/refresh` | Public | Refresh token (Firebase client SDK) |
| GET | `/api/v1/auth/me` | Authenticated | Get current user profile |

### Users
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/users` | users.view | Get all users (paginated) |
| GET | `/api/v1/users/:id` | users.view | Get user by ID |
| POST | `/api/v1/users` | users.create | Create new user |
| PUT | `/api/v1/users/:id` | users.update | Update user |
| DELETE | `/api/v1/users/:id` | users.delete | Delete user |

### Roles
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/roles` | users.view | Get all roles |
| GET | `/api/v1/roles/:id` | users.view | Get role by ID |

### Staff
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/staff` | staff.view | Get all staff (paginated) |
| GET | `/api/v1/staff/:id` | staff.view | Get staff by ID |
| POST | `/api/v1/staff` | staff.create | Create staff member |
| PATCH | `/api/v1/staff/:id/availability` | staff.update | Update staff availability |

### Stock
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/stock` | stock.view | Get all stock items (paginated) |
| GET | `/api/v1/stock/:id` | stock.view | Get stock item by ID |
| POST | `/api/v1/stock` | stock.create | Create stock item |
| POST | `/api/v1/stock/adjust` | stock.adjust | Adjust stock levels |
| GET | `/api/v1/stock/:id/history` | stock.view | Get stock adjustment history |

### Pricing
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/pricing` | pricing.view | Get all product pricing |
| PUT | `/api/v1/pricing/:id` | pricing.update | Update product price |
| GET | `/api/v1/pricing/:id/history` | pricing.view | Get price change history |

### Orders
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/orders` | orders.view | Get all orders (paginated) |
| GET | `/api/v1/orders/:id` | orders.view | Get order by ID |
| POST | `/api/v1/orders` | orders.create | Create new order |
| PATCH | `/api/v1/orders/:id/status` | orders.update | Update order status |

### Deliveries
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/deliveries` | deliveries.view | Get all deliveries (paginated) |
| GET | `/api/v1/deliveries/:id` | deliveries.view | Get delivery by ID |
| POST | `/api/v1/deliveries/:id/assign` | deliveries.assign | Assign delivery to partner |
| PATCH | `/api/v1/deliveries/:id/status` | deliveries.update | Update delivery status |

### Debts & Payables
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/debts` | debts.view | Get all debts (paginated) |
| GET | `/api/v1/debts/:id` | debts.view | Get debt by ID |
| POST | `/api/v1/debts` | debts.create | Create new debt record |
| POST | `/api/v1/debts/:id/payment` | debts.record_payment | Record debt payment |

### Reports
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/api/v1/reports/generate` | reports.generate | Generate business report |
| GET | `/api/v1/reports/:id/download` | reports.export | Download generated report |

### Dashboard
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/dashboard/stats` | dashboard.view | Get dashboard statistics |

## Query Parameters

### Pagination
Available on all list endpoints:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

### Filtering
- **Users**: `search`, `role`, `status`
- **Staff**: `role`, `status`, `availability`
- **Stock**: `search`, `status`, `category`
- **Orders**: `status`, `dateFrom`, `dateTo`
- **Deliveries**: `status`, `partnerId`
- **Debts**: `status`, `overdue`

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Paginated Response
```json
{
  "success": true,
  "message": "Items retrieved successfully",
  "data": [ ... ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `BAD_REQUEST` | 400 | Invalid request data |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `TOKEN_EXPIRED` | 401 | JWT token has expired |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `INTERNAL_ERROR` | 500 | Server error |

## Security Features

1. **Firebase Authentication**: Secure token-based authentication
2. **Role-Based Access Control**: Fine-grained permissions per role
3. **Input Validation**: Comprehensive validation with Joi
4. **SQL Injection Prevention**: Parameterized queries
5. **Error Sanitization**: Safe error messages in production
6. **Request Logging**: All requests logged with Winston

## Database Schema

All tables are automatically created on server start. Key tables:
- `users` - User accounts with Firebase integration
- `staff` - Staff members (managers, sellers, delivery partners)
- `stock` - Inventory items
- `stock_adjustments` - Stock change history
- `products` - Product pricing
- `price_history` - Price change history
- `orders` - Customer orders
- `deliveries` - Delivery records
- `debts` - Debt and payables
- `debt_payments` - Payment records

## Development

```bash
# Run in development mode with nodemon
npm run dev

# Run tests
npm test
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Configure production database and Redis
3. Set Firebase credentials
4. Use a process manager (PM2, systemd)
5. Set up reverse proxy (nginx)
6. Enable HTTPS

## License

ISC
