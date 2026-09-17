import { Navbar } from "../../components/Navbar";
import { useAuth } from "../../context/AuthContext";

export function FacultyDashboard() {
  const { profile } = useAuth();

  return (
    <div className="dashboard">
      <Navbar />
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>Faculty Dashboard</h1>
          <p>Welcome back, {profile?.name || profile?.email}. Manage your courses and students.</p>
        </div>
        <div className="placeholder-grid">
          <div className="placeholder-card">
            <div className="icon">📖</div>
            <h3>My Courses</h3>
            <p>Manage your current course offerings</p>
          </div>
          <div className="placeholder-card">
            <div className="icon">👥</div>
            <h3>Students</h3>
            <p>View and manage enrolled students</p>
          </div>
          <div className="placeholder-card">
            <div className="icon">📝</div>
            <h3>Assignments</h3>
            <p>Create and grade assignments</p>
          </div>
          <div className="placeholder-card">
            <div className="icon">📊</div>
            <h3>Gradebook</h3>
            <p>Manage student grades and reports</p>
          </div>
          <div className="placeholder-card">
            <div className="icon">📅</div>
            <h3>Schedule</h3>
            <p>View and manage your teaching schedule</p>
          </div>
          <div className="placeholder-card">
            <div className="icon">📢</div>
            <h3>Announcements</h3>
            <p>Post announcements to your classes</p>
          </div>
        </div>
      </div>
    </div>
  );
}
