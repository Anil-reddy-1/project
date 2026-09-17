import { useAuth } from "../context/AuthContext";
import { StudentDashboard } from "../pages/student/Dashboard";
import { FacultyDashboard } from "../pages/faculty/Dashboard";
import { AdminDashboard } from "../pages/admin/Dashboard";

/**
 * Renders the appropriate home page based on the user's role from the backend.
 */
export function RoleBasedHome() {
  const { profile } = useAuth();

  switch (profile?.role) {
    case "admin":
      return <AdminDashboard />;
    case "faculty":
      return <FacultyDashboard />;
    case "student":
    default:
      return <StudentDashboard />;
  }
}
