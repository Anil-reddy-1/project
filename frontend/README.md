# Enterprise Operations Manager - Frontend

A modern, comprehensive wholesale & retail bulk commerce platform built with React, TypeScript, and Tailwind CSS.

## 🎨 Design System

Based on **Precision Enterprise Ops** design language from Stitch:
- **Primary Color:** `#2563EB` (Enterprise Blue)
- **Typography:** Inter (headings/body) + JetBrains Mono (code/tabular data)
- **Components:** shadcn/ui with Radix UI primitives
- **Theme:** Professional, data-dense, minimal design for operational efficiency

## ✨ Features

### 9 Complete Admin Screens

1. **Operations Dashboard** - Real-time metrics, alerts, and activity feed
2. **User Management** - Full CRUD with role assignment and status management
3. **Role Management** - Granular permission system (26 permissions across 9 categories)
4. **Staff Management** - Manage sellers, delivery partners with availability tracking
5. **Stock Management** - Inventory control with adjustment history and alerts
6. **Pricing Management** - Price updates with change tracking and audit trail
7. **Delivery Management** - Partner assignment, status tracking, and failure handling
8. **Debt & Payables** - Supplier payment tracking with partial payment support
9. **Daily Reports** - Multi-type report generation with export capabilities

### Role-Based Access Control (RBAC)

- Permission-based UI element visibility
- Route-level access control
- Granular permission checking (view/create/update/delete/manage)
- Support for role hierarchies

### Modern UI/UX

- Fully responsive design (mobile/tablet/desktop)
- Clean, professional interface
- Real-time search and filtering
- Pagination support
- Loading states and error handling
- Accessible components (WCAG compliant)

## 🚀 Tech Stack

- **Framework:** React 19.2.7 + TypeScript 6.0.2
- **Build Tool:** Vite 8.1.1
- **Routing:** React Router DOM 7.18.2
- **Styling:** Tailwind CSS 3.x with custom design tokens
- **UI Components:** 
  - Radix UI primitives (@radix-ui/react-*)
  - shadcn/ui pattern
  - Lucide React icons
- **State Management:** React Context API
- **Authentication:** Firebase Auth 12.16.0
- **Form Handling:** Native React with validation
- **HTTP Client:** Axios (for API calls)
- **Date Handling:** date-fns
- **Charts:** Recharts (for analytics)

## 📦 Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🔧 Environment Variables

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id

# API Configuration
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

## 📁 Project Structure

```
src/
├── components/
│   ├── auth/              # Auth-related components
│   │   ├── PermissionGate.tsx
│   │   └── ProtectedRoute.tsx
│   ├── layout/            # Layout components
│   │   └── AdminLayout.tsx
│   └── ui/                # Reusable UI components
│       ├── button.tsx
│       ├── card.tsx
│       ├── table.tsx
│       ├── dialog.tsx
│       ├── select.tsx
│       ├── input.tsx
│       ├── label.tsx
│       └── badge.tsx
├── pages/
│   └── admin/             # Admin screens
│       ├── Dashboard.tsx
│       ├── UserManagement.tsx
│       ├── RoleManagement.tsx
│       ├── StaffManagement.tsx
│       ├── StockManagement.tsx
│       ├── PricingManagement.tsx
│       ├── DeliveryManagement.tsx
│       ├── DebtManagement.tsx
│       └── Reports.tsx
├── context/
│   └── AuthContext.tsx    # Authentication & RBAC
├── lib/
│   └── utils.ts           # Utility functions
├── App.tsx                # Main app component
└── main.tsx               # Entry point
```

## 🔐 Authentication & Authorization

### Using Auth Context

```typescript
import { useAuth } from './context/AuthContext';

function MyComponent() {
  const { user, hasPermission, logout } = useAuth();
  
  // Check single permission
  if (hasPermission('users.create')) {
    // Show create button
  }
  
  // Check multiple permissions (any)
  if (hasAnyPermission(['users.view', 'users.create'])) {
    // User has at least one permission
  }
  
  // Check multiple permissions (all)
  if (hasAllPermissions(['users.view', 'users.update'])) {
    // User has all permissions
  }
}
```

### Permission Gate Component

```typescript
import { PermissionGate } from './components/auth/PermissionGate';

function MyComponent() {
  return (
    <PermissionGate permission="users.create">
      <Button>Create User</Button>
    </PermissionGate>
  );
}
```

### Protected Routes

```typescript
import { ProtectedRoute } from './components/auth/ProtectedRoute';

<Route 
  path="/admin/users" 
  element={
    <ProtectedRoute permission="users.view">
      <UserManagement />
    </ProtectedRoute>
  } 
/>
```

## 🎯 Available Permissions

```typescript
// User Management
users.view, users.create, users.update, users.delete

// Product Management
products.view, products.create, products.update, products.delete

// Stock Management
stock.view, stock.manage, stock.adjust

// Pricing
pricing.view, pricing.update

// Orders
orders.view, orders.process, orders.cancel

// Delivery
delivery.view, delivery.assign, delivery.manage

// Debt Management
debt.view, debt.manage

// Reports
reports.view, reports.export

// Role Management
roles.view, roles.manage
```

## 🎨 Component Usage Examples

### Button

```typescript
<Button variant="default">Primary Action</Button>
<Button variant="outline">Secondary</Button>
<Button variant="destructive">Delete</Button>
<Button variant="ghost">Subtle</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
```

### Card

```typescript
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    Content goes here
  </CardContent>
  <CardFooter>
    Footer content
  </CardFooter>
</Card>
```

### Table

```typescript
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Email</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>John Doe</TableCell>
      <TableCell>john@example.com</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Status Badge

```typescript
<StatusBadge status="active" />
<StatusBadge status="pending" />
<StatusBadge status="completed" />
<StatusBadge status="failed" />
<StatusBadge status="low-stock" />
<StatusBadge status="out-of-stock" />
```

## 🔄 API Integration

See `API_REFERENCE.md` in the project root for complete API documentation.

### Example API Call

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Fetch users
const getUsers = async (params) => {
  const response = await api.get('/users', { params });
  return response.data;
};
```

## 🧪 Testing

```bash
# Run tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📱 Responsive Breakpoints

```css
/* Mobile: < 768px */
/* Tablet: 768px - 1023px */
/* Desktop: 1024px - 1439px */
/* Desktop Large: ≥ 1440px */
```

## 🎯 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 📝 Code Standards

- **TypeScript:** Strict mode enabled
- **ESLint:** Airbnb style guide
- **Prettier:** Code formatting
- **Git Hooks:** Pre-commit linting

## 🚢 Deployment

```bash
# Build production bundle
npm run build

# Output directory: dist/
# Deploy to hosting service (Vercel, Netlify, etc.)
```

## 🤝 Contributing

1. Follow the existing code structure
2. Use TypeScript for type safety
3. Follow the design system guidelines
4. Write meaningful commit messages
5. Test responsiveness on all breakpoints

## 📄 License

Private - All rights reserved

## 👥 Team

Built with modern best practices for enterprise operations management.
