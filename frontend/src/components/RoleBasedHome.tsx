import { useAuth } from "../context/AuthContext";
import { DeliveryDashboard } from "../pages/delivery/Dashboard";
import { BuyerDashboard } from "../pages/buyer/Dashboard";
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
      return <BuyerDashboard />;
    case "delivery":
    default:
      return <DeliveryDashboard />;
  }
}
