# Enterprise Operations Manager

Enterprise Operations Manager is a full-stack admin platform for wholesale and
retail operations. It gives store and operations teams one place to monitor
activity and manage users, staff, inventory, pricing, orders, deliveries,
supplier debts, and business reports.

## What the Project Includes

- **Operations dashboard** with business metrics, alerts, and recent activity
- **User and role management** with permission-based access control
- **Staff management** for sellers and delivery partners
- **Inventory and pricing management** with adjustment and audit history
- **Order and delivery workflows** including assignment and status tracking
- **Debt and supplier payment tracking**
- **Business report generation and export**
- **Firebase Authentication** for user identity and protected API access

## Roles and Functionalities

Access is protected by Firebase authentication and enforced with role-based
permissions in both the frontend and backend. The four supported roles are:

### Admin

The admin has full access to configure and operate the platform:

- View and manage the operations dashboard
- Create, view, update, and delete users and staff
- Manage roles and permissions
- Create, update, delete, and adjust stock
- Manage products and pricing
- View, create, update, and delete orders
- Manage deliveries and assign delivery partners
- Manage supplier debts and record payments
- Generate and export operational reports
- Review analytics, order history, and audit information

### Buyer

The buyer-facing experience supports the complete purchasing journey:

- Browse and view products and current pricing
- View available stock
- Add products to a cart and update cart contents
- Maintain delivery addresses and profile information
- Submit orders through checkout
- View personal orders and order details
- Track delivery information for personal orders
- Save products to a wishlist

Buyers can create and view their own orders; they do not have access to
administrative user, inventory, pricing, debt, or reporting controls.

### Delivery

The delivery role is focused on completing assigned deliveries:

- View the delivery dashboard
- View assigned deliveries and delivery details
- View the related order information
- Update delivery status as work progresses
- View delivery-related information needed for handoff and completion
- Manage personal profile information

Delivery users cannot assign deliveries, change pricing, manage stock, or access
other users' administrative data.

### Supervisor

The supervisor coordinates order preparation and delivery operations:

- View the supervisor dashboard
- View operational orders and order details
- Update order status during preparation and packing
- Mark orders as preparing or packed
- Generate and use packing verification information
- View available delivery partners
- Assign delivery partners to orders
- Update delivery and order workflow status
- View stock information relevant to fulfillment
- Manage personal profile information

Supervisors can coordinate fulfillment but do not have the admin role's access
to user management, pricing, debts, reports, or full inventory administration.

## How It Works

The project is organized as two applications:

1. The **frontend** is a React and TypeScript dashboard served by Vite. Users
   sign in with Firebase Authentication and interact with the admin screens.
2. The **backend** is an Express REST API. It validates requests, verifies
   Firebase identity tokens, applies role and permission checks, and reads or
   updates operational data.
3. **PostgreSQL** stores durable application data such as users, products,
   orders, deliveries, pricing, and payments.
4. **Redis** provides caching support for frequently accessed data.

The frontend sends requests through its shared API client, which adds the
Firebase ID token to authenticated requests. The backend processes the request
and returns standardized responses for the dashboard to display.

## Technology Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Radix UI, Axios
- **Backend:** Node.js, Express, Joi, Firebase Admin SDK, Winston
- **Data:** PostgreSQL and Redis
- **Local orchestration:** Docker Compose

## Repository Structure

```text
.
├── frontend/          # React admin dashboard
├── backend/           # Express REST API, migrations, and tests
├── API_REFERENCE.md   # API endpoint reference
├── docker-compose.yaml
├── create_database.sql
└── stitch_screens/    # UI reference screens
```

## Running Locally

### Option 1: Run with Docker Compose

Configure the environment values required by the frontend and backend, then
start the complete stack:

```bash
docker compose up --build
```

The default local services are:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000`
- PostgreSQL: host port `5433`
- Redis: host port `6380`

### Option 2: Run the Applications Separately

Install dependencies and start the backend:

```bash
cd backend
npm install
npm run dev
```

In a second terminal, start the frontend:

```bash
cd frontend
npm install
npm run dev
```

Set `VITE_BACKEND_URL` in `frontend/.env` to the backend API base URL, normally
`http://localhost:5000/api/v1`. Keep credentials and private keys in local
environment files; do not commit them.

## Useful Commands

### Frontend

```bash
cd frontend
npm run lint
npm run build
```

### Backend

```bash
cd backend
npm test
npm run migrate
```

## Documentation

- [Frontend README](./frontend/README.md) - frontend features, configuration,
  and UI development details
- [Backend README](./backend/README.md) - API service architecture and backend
  development details
- [API Reference](./API_REFERENCE.md) - available API endpoints and payloads
- [Database migration guide](./backend/migrations/README.md) - migration
  workflow and safety guidance

## License

Private - All rights reserved.
