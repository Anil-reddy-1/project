import { Navbar } from "../../components/Navbar";
import { useAuth } from "../../context/AuthContext";

export function AdminDashboard() {
  const { profile } = useAuth();

  return (
    <div className="dashboard">
      <Navbar />
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>Admin Dashboard</h1>
          <p>Welcome back, {profile?.name || profile?.email}. Full system control at your fingertips.</p>
        </div>
        <div className="placeholder-grid">
          <div className="placeholder-card">
            <div className="icon">👥</div>
            <h3>User Management</h3>
            <p>Manage students, faculty, and staff accounts</p>
          </div>
          <div className="placeholder-card">
            <div className="icon">🏫</div>
            <h3>Departments</h3>
            <p>Configure departments and programs</p>
          </div>
          <div className="placeholder-card">
            <div className="icon">📖</div>
            <h3>Course Catalog</h3>
            <p>Manage the campus course catalog</p>
          </div>
          <div className="placeholder-card">
            <div className="icon">📊</div>
            <h3>Analytics</h3>
            <p>View platform-wide usage and performance</p>
          </div>
          <div className="placeholder-card">
            <div className="icon">⚙️</div>
            <h3>System Settings</h3>
            <p>Configure application-wide settings</p>
          </div>
          <div className="placeholder-card">
            <div className="icon">🔐</div>
            <h3>Access Control</h3>
            <p>Manage roles, permissions, and security</p>
          </div>
        </div>
      </div>
    </div>
  );
}
