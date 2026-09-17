import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { firebaseUser, profile, loading, error, logout } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        Loading...
      </div>
    );
  }

  // Not authenticated at all
  if (!firebaseUser) {
    return <Navigate to="/login" replace />;
  }

  // Handle backend sync/fetch errors
  if (error) {
    return (
      <div className="dashboard">
        <div className="dashboard-content" style={{ textAlign: "center", marginTop: 40 }}>
          <h2 style={{ color: "var(--danger)" }}>Account Setup Failed</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: 20 }}>{error}</p>
          <button className="btn btn-outline" onClick={logout}>Sign Out & Try Again</button>
        </div>
      </div>
    );
  }

  // Authenticated via Firebase but no backend profile yet (still syncing)
  if (!profile) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        Setting up your account...
      </div>
    );
  }

  // Role gating
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(profile.role)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
}
