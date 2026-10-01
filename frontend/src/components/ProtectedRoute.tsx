import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FullScreenLoader } from "./ui/FullScreenLoader";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullScreenLoader />;
  }

  // Not authenticated at all
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Role gating
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
}
