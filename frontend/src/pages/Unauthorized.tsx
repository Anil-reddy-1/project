import { Navbar } from "../components/Navbar";

export function Unauthorized() {
  return (
    <div className="dashboard">
      <Navbar />
      <div className="dashboard-content">
        <div className="auth-page" style={{ minHeight: "auto", padding: "60px 20px" }}>
          <div className="card" style={{ textAlign: "center", maxWidth: 420 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Access Denied</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 20 }}>
              You do not have the required permissions to access this page.
              Contact your administrator if you believe this is an error.
            </p>
            <a href="/" className="btn btn-primary">Go to Dashboard</a>
          </div>
        </div>
      </div>
    </div>
  );
}
