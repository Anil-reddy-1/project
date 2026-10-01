import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Dashboard } from "../pages/admin/Dashboard";

/**
 * Renders the appropriate home page based on the user's role from the backend.
 */
export function RoleBasedHome() {
  const { user } = useAuth();

  switch (user?.role) {
    case "admin":
      return <Dashboard />;
    case "buyer":
      return <Navigate to="/buyer/home" replace />;
    case "delivery":
      return <Navigate to="/delivery/dashboard" replace />;
    default:
      return <Navigate to="/buyer/home" replace />;
  }
}
