import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RoleBasedHome } from "./components/RoleBasedHome";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { ForgotPassword } from "./pages/ForgotPassword";
import { Unauthorized } from "./pages/Unauthorized";

// Admin Pages
import { Dashboard } from "./pages/admin/Dashboard";
import { UserManagement } from "./pages/admin/UserManagement";
import { RoleManagement } from "./pages/admin/RoleManagement";
import { StaffManagement } from "./pages/admin/StaffManagement";
import { StockManagement } from "./pages/admin/StockManagement";
import { ProductManagement } from "./pages/admin/ProductManagement";
import { PricingManagement } from "./pages/admin/PricingManagement";
import { DeliveryManagement } from "./pages/admin/DeliveryManagement";
import { DebtManagement } from "./pages/admin/DebtManagement";
import { Reports } from "./pages/admin/Reports";

// Buyer Pages
import { Products } from "./pages/buyer/Products";
import { ProductDetails } from "./pages/buyer/ProductDetails";
import { Wishlist } from "./pages/buyer/Wishlist";

/**
 * Redirects authenticated users away from auth pages (login/signup) to home.
 */
function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        Loading...
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
            path="/admin/roles"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <RoleManagement />
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
            path="/admin/reports"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Reports />
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
            path="/buyer/wishlist"
            element={
              <ProtectedRoute allowedRoles={["admin", "buyer"]}>
                <Wishlist />
              </ProtectedRoute>
            }
          />
          <Route
            path="/buyer"
            element={
              <ProtectedRoute allowedRoles={["admin", "buyer"]}>
                <Navigate to="/buyer/products" replace />
              </ProtectedRoute>
            }
          />

          {/* Legacy buyer route - redirect to new products page */}
          <Route
            path="/buyer/*"
            element={
              <ProtectedRoute allowedRoles={["admin", "buyer"]}>
                <Navigate to="/buyer/products" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/delivery/*"
            element={
              <ProtectedRoute allowedRoles={["admin", "delivery"]}>
                <RoleBasedHome />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
