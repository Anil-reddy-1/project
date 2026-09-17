import { Navbar } from "../../components/Navbar";
import { useAuth } from "../../context/AuthContext";

export function StudentDashboard() {
  const { profile } = useAuth();

  return (
    <div className="dashboard">
      <Navbar />
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>Student Dashboard</h1>
          <p>Welcome back, {profile?.name || profile?.email}. Here's what's happening in your campus.</p>
        </div>
        <div className="placeholder-grid">
          <div className="placeholder-card">
            <div className="icon">📅</div>
            <h3>My Schedule</h3>
            <p>View your class timetable and upcoming events</p>
          </div>
          <div className="placeholder-card">
            <div className="icon">📝</div>
            <h3>Assignments</h3>
            <p>Track and submit your assignments</p>
          </div>
          <div className="placeholder-card">
            <div className="icon">📊</div>
            <h3>Grades</h3>
            <p>View your academic performance</p>
          </div>
          <div className="placeholder-card">
            <div className="icon">📢</div>
            <h3>Announcements</h3>
            <p>Stay updated with campus news</p>
          </div>
          <div className="placeholder-card">
            <div className="icon">📚</div>
            <h3>Courses</h3>
            <p>Browse and enroll in courses</p>
          </div>
          <div className="placeholder-card">
            <div className="icon">💬</div>
            <h3>Messages</h3>
            <p>Communicate with faculty and peers</p>
          </div>
        </div>
      </div>
    </div>
  );
}
