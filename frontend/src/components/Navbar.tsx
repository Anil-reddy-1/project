import { useAuth } from "../context/AuthContext";

export function Navbar() {
  const { firebaseUser, profile, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        📚 CampusIQ
      </div>
      <div className="navbar-right">
        {profile && (
          <>
            <span className={`role-badge ${profile.role}`}>{profile.role}</span>
            <span className="navbar-user">{firebaseUser?.email}</span>
          </>
        )}
        <button className="btn btn-outline" onClick={logout}>
          Logout
        </button>
      </div>
    </nav>
  );
}
