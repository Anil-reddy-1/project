import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RoleBasedHome } from "./components/RoleBasedHome";
import { ToastDemo } from "./components/ToastDemo";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { ForgotPassword } from "./pages/ForgotPassword";
import { Unauthorized } from "./pages/Unauthorized";

// Admin Pages
import { Dashboard } from "./pages/admin/Dashboard";
import { UserManagement } from "./pages/admin/UserManagement";
import { StaffManagement } from "./pages/admin/StaffManagement";
import { StockManagement } from "./pages/admin/StockManagement";
import { ProductManagement } from "./pages/admin/ProductManagement";
import { PricingManagement } from "./pages/admin/PricingManagement";
import { DeliveryManagement } from "./pages/admin/DeliveryManagement";
import { DebtManagement } from "./pages/admin/DebtManagement";
import { Analytics } from "./pages/admin/Analytics";
import { Orders as AdminOrders } from "./pages/admin/Orders";
import { OrderDetails as AdminOrderDetails } from "./pages/admin/OrderDetails";
import { FullScreenLoader } from "./components/ui/FullScreenLoader";

// Buyer Pages
import {
  BuyerHome,
  Products,
  ProductDetails,
  Wishlist,
  Cart,
  Checkout,
  Orders,
  OrderDetails,
  Profile,
  Addresses,
} from "./pages/buyer";

// Delivery Partner Pages
import {
  DeliveryDashboard as DeliveryPartnerDashboard,
  Deliveries,
  DeliveryDetails as DeliveryPartnerDeliveryDetails,
} from "./pages/delivery";

// Supervisor Pages
import {
  SupervisorDashboard,
  SupervisorOrders,
  SupervisorOrderDetails,
  SupervisorProducts,
} from "./pages/supervisor";

/**
 * Redirects authenticated users away from auth pages (login/signup) to home.
 */
function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullScreenLoader />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <Toaster />
            <Routes>
          {/* Public auth routes */}
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicOnlyRoute>
                <Signup />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicOnlyRoute>
                <ForgotPassword />
              </PublicOnlyRoute>
            }
          />

          {/* Protected: any authenticated user */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <RoleBasedHome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/unauthorized"
            element={
              <ProtectedRoute>
                <Unauthorized />
              </ProtectedRoute>
            }
          />

          {/* Role-restricted routes (placeholders for future) */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <UserManagement />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/staff"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <StaffManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/stock"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <StockManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/products"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <ProductManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/pricing"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <PricingManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/deliveries"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <DeliveryManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/debts"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <DebtManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Analytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminOrders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/orders/:id"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminOrderDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Navigate to="/admin/dashboard" replace />
              </ProtectedRoute>
            }
          />

          {/* Buyer Routes */}
          <Route
            path="/buyer/home"
            element={
              <ProtectedRoute allowedRoles={["admin", "buyer"]}>
                <BuyerHome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/buyer/products"
            element={
              <ProtectedRoute allowedRoles={["admin", "buyer"]}>
                <Products />
              </ProtectedRoute>
            }
          />
          <Route
            path="/buyer/products/:id"
            element={
              <ProtectedRoute allowedRoles={["admin", "buyer"]}>
                <ProductDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/buyer/cart"
            element={
              <ProtectedRoute allowedRoles={["admin", "buyer"]}>
                <Cart />
              </ProtectedRoute>
            }
          />
          <Route
            path="/buyer/checkout"
            element={
              <ProtectedRoute allowedRoles={["admin", "buyer"]}>
                <Checkout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/buyer/orders"
            element={
              <ProtectedRoute allowedRoles={["admin", "buyer"]}>
                <Orders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/buyer/orders/:id"
            element={
              <ProtectedRoute allowedRoles={["admin", "buyer"]}>
                <OrderDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/buyer/wishlist"
            element={
              <ProtectedRoute allowedRoles={["admin", "buyer"]}>
                <Wishlist />
              </ProtectedRoute>
            }
          />
          <Route
            path="/buyer/profile"
            element={
              <ProtectedRoute allowedRoles={["admin", "buyer", "supervisor", "delivery"]}>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/buyer/addresses"
            element={
              <ProtectedRoute allowedRoles={["admin", "buyer"]}>
                <Addresses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/buyer"
            element={
              <ProtectedRoute allowedRoles={["admin", "buyer"]}>
                <Navigate to="/buyer/home" replace />
              </ProtectedRoute>
            }
          />
          
          {/* Delivery Partner Routes */}
          <Route
            path="/delivery/dashboard"
            element={
              <ProtectedRoute allowedRoles={["admin", "delivery"]}>
                <DeliveryPartnerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/delivery/deliveries"
            element={
              <ProtectedRoute allowedRoles={["admin", "delivery"]}>
                <Deliveries />
              </ProtectedRoute>
            }
          />
          <Route
            path="/delivery/deliveries/:id"
            element={
              <ProtectedRoute allowedRoles={["admin", "delivery"]}>
                <DeliveryPartnerDeliveryDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/delivery"
            element={
              <ProtectedRoute allowedRoles={["admin", "delivery"]}>
                <Navigate to="/delivery/dashboard" replace />
              </ProtectedRoute>
            }
          />

          {/* Supervisor Routes */}
          <Route
            path="/supervisor/dashboard"
            element={
              <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
                <SupervisorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/supervisor/orders"
            element={
              <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
                <SupervisorOrders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/supervisor/orders/:id"
            element={
              <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
                <SupervisorOrderDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/supervisor/products"
            element={
              <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
                <SupervisorProducts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/supervisor"
            element={
              <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
                <Navigate to="/supervisor/dashboard" replace />
              </ProtectedRoute>
            }
          />

          {/* Toast Demo - Can be removed after integration */}
          <Route path="/toast-demo" element={<ToastDemo />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
