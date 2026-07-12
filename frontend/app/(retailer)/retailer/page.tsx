"use client";

/**
 * Retailer Dashboard — Home.
 * URL: /retailer
 * Derived from: app-flow.md §1.2 (Home / Shop Discovery Feed)
 *
 * Phase 1: navigation shell only.
 * Phase 2 adds: Shop Discovery Feed, search/filter, catalog browsing.
 *
 * Auth bug fixes applied:
 *   A1 — Replaced duplicate/race-condition sign-out logic with useAuth().logout()
 */

import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";

export default function RetailerHomePage() {
  const router = useRouter();
  const { logout, user } = useAuth();

  async function handleSignOut() {
    await logout();
    router.push("/");
  }

  return (
    <div className="retailer-dashboard">
      <header className="dashboard-header">
        <div className="header-brand">
          <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="10" fill="#1F4E8C"/>
            <path d="M10 28L16 12h3l4 10.5L27 12h3L20 32l-4-10L10 28z" fill="white" fillOpacity="0.95"/>
          </svg>
          <span className="dashboard-wordmark">WholesaleHub</span>
        </div>
        <div className="header-actions">
          <span className="user-email">{user?.email}</span>
          <button id="retailer-signout" onClick={handleSignOut} className="dashboard-signout tap-target">
            Sign out
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-hero">
          <div className="role-badge-wrap">
            <span className="dashboard-role-badge">Retailer</span>
          </div>
          <h1 className="dashboard-title">Welcome back</h1>
          <p className="dashboard-subtitle">
            Discover wholesale shops and browse their catalogs below.
          </p>
        </div>

        {/* Quick Stats Section */}
        <div className="rdash-stats">
          <div className="rdash-stat-card">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <div className="rdash-stat-content">
              <span className="rdash-stat-value">12+</span>
              <span className="rdash-stat-label">Verified Shops</span>
            </div>
          </div>
          <div className="rdash-stat-card">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <div className="rdash-stat-content">
              <span className="rdash-stat-value">5km</span>
              <span className="rdash-stat-label">Nearby Radius</span>
            </div>
          </div>
          <div className="rdash-stat-card">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            <div className="rdash-stat-content">
              <span className="rdash-stat-value">500+</span>
              <span className="rdash-stat-label">Products</span>
            </div>
          </div>
        </div>

        {/* Enhanced Action Cards */}
        <div className="rdash-actions">
          <button
            className="rdash-action-card rdash-action-card--featured tap-target"
            onClick={() => router.push("/retailer/shops")}
          >
            <div className="rdash-action-icon rdash-action-icon--featured">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div className="rdash-action-body">
              <h2 className="rdash-action-title">Browse Shops</h2>
              <p className="rdash-action-desc">Discover verified wholesalers near you with quality products</p>
              <div className="rdash-action-features">
                <span className="rdash-feature-chip">✓ Location-based search</span>
                <span className="rdash-feature-chip">✓ Product catalogs</span>
              </div>
            </div>
            <svg className="rdash-action-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </button>

          <div className="rdash-action-grid">
            <button className="rdash-action-card rdash-action-card--muted tap-target" disabled>
              <div className="rdash-action-icon rdash-action-icon--muted">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </div>
              <div className="rdash-action-body">
                <h3 className="rdash-action-title">My Orders</h3>
                <p className="rdash-action-desc">Track your orders</p>
              </div>
              <span className="rdash-soon-badge">Phase 3</span>
            </button>

            <button className="rdash-action-card rdash-action-card--muted tap-target" disabled>
              <div className="rdash-action-icon rdash-action-icon--muted">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 1v6M12 17v6M5.64 7.05l4.24 4.24M14.12 14.12l4.24 4.24M1 12h6M17 12h6M5.64 16.95l4.24-4.24M14.12 9.88l4.24-4.24"/>
                </svg>
              </div>
              <div className="rdash-action-body">
                <h3 className="rdash-action-title">Favorites</h3>
                <p className="rdash-action-desc">Saved shops & items</p>
              </div>
              <span className="rdash-soon-badge">Phase 3</span>
            </button>

            <button className="rdash-action-card rdash-action-card--muted tap-target" disabled>
              <div className="rdash-action-icon rdash-action-icon--muted">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div className="rdash-action-body">
                <h3 className="rdash-action-title">Profile</h3>
                <p className="rdash-action-desc">Manage account</p>
              </div>
              <span className="rdash-soon-badge">Phase 3</span>
            </button>

            <button className="rdash-action-card rdash-action-card--muted tap-target" disabled>
              <div className="rdash-action-icon rdash-action-icon--muted">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <div className="rdash-action-body">
                <h3 className="rdash-action-title">Messages</h3>
                <p className="rdash-action-desc">Chat with suppliers</p>
              </div>
              <span className="rdash-soon-badge">Phase 4</span>
            </button>
          </div>

          {/* Tips Section */}
          <div className="rdash-tips-card">
            <div className="rdash-tips-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div className="rdash-tips-content">
              <h4 className="rdash-tips-title">💡 Getting Started Tips</h4>
              <ul className="rdash-tips-list">
                <li>Use location search to find nearby wholesale suppliers</li>
                <li>Check MOQ (Minimum Order Quantity) before browsing catalogs</li>
                <li>Look for verified shops for quality assurance</li>
              </ul>
            </div>
          </div>
        </div>
      </main>


      <style>{`
        .retailer-dashboard { 
          min-height: 100svh; 
          background: var(--color-paper); 
          display: flex; 
          flex-direction: column; 
        }
        
        .dashboard-header { 
          display: flex; 
          align-items: center; 
          justify-content: space-between; 
          padding: 1rem 1.5rem; 
          border-bottom: 1px solid var(--color-line); 
          background: #fff;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        
        .header-brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .dashboard-wordmark { 
          font-family: var(--font-display); 
          font-size: 1.25rem; 
          font-weight: 700; 
          color: var(--color-ink); 
        }
        
        .header-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .user-email {
          font-size: var(--text-sm);
          color: var(--color-ink-muted);
          display: none;
        }
        
        @media (min-width: 600px) {
          .user-email { display: block; }
        }
        
        .dashboard-signout { 
          font-size: var(--text-sm); 
          font-weight: 500;
          color: var(--color-ink-muted); 
          background: none; 
          border: 1px solid transparent; 
          cursor: pointer; 
          padding: 0.375rem 0.75rem; 
          border-radius: var(--radius-md); 
          transition: all 0.15s;
        }
        
        .dashboard-signout:hover { 
          background: var(--color-paper); 
          border-color: var(--color-line);
          color: var(--color-ink);
        }
        
        .dashboard-main { 
          flex: 1; 
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          padding: 2rem 1.5rem; 
        }
        
        .dashboard-hero { 
          text-align: center; 
          max-width: 440px; 
          background: #fff;
          padding: 3rem 2rem;
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-line);
          box-shadow: var(--shadow-sm);
        }
        
        /* Quick Stats */
        .rdash-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 1rem;
          width: 100%;
          max-width: 520px;
        }
        
        .rdash-stat-card {
          background: #fff;
          border: 1px solid var(--color-line);
          border-radius: 12px;
          padding: 1rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          box-shadow: var(--shadow-sm);
        }
        
        .rdash-stat-card svg {
          color: var(--color-signal);
          flex-shrink: 0;
        }
        
        .rdash-stat-content {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }
        
        .rdash-stat-value {
          font-family: var(--font-display);
          font-size: var(--text-lg);
          font-weight: 700;
          color: var(--color-ink);
        }
        
        .rdash-stat-label {
          font-size: 0.75rem;
          color: var(--color-ink-muted);
          font-weight: 500;
        }
        
        .role-badge-wrap {
          margin-bottom: 1.25rem;
        }
        
        .dashboard-role-badge { 
          display: inline-block; 
          font-size: var(--text-xs); 
          font-weight: 600; 
          text-transform: uppercase; 
          letter-spacing: 0.08em; 
          color: var(--color-signal); 
          background: var(--color-signal-soft); 
          padding: 0.375rem 0.875rem; 
          border-radius: var(--radius-pill); 
        }
        
        .dashboard-title { 
          font-family: var(--font-display); 
          font-size: var(--text-2xl); 
          font-weight: 700; 
          color: var(--color-ink); 
          margin: 0 0 0.75rem; 
          letter-spacing: -0.02em; 
        }
        
        .dashboard-subtitle { 
          font-size: var(--text-base); 
          color: var(--color-ink-muted); 
          margin: 0; 
          line-height: 1.6; 
        }

        .rdash-actions { 
          display: flex; 
          flex-direction: column; 
          gap: 1rem; 
          width: 100%; 
          max-width: 520px; 
        }
        
        .rdash-action-card { 
          display: flex; 
          align-items: center; 
          gap: 1rem; 
          background: #fff; 
          border: 1px solid var(--color-line); 
          border-radius: 12px; 
          padding: 1.25rem; 
          cursor: pointer; 
          text-align: left; 
          transition: box-shadow 0.15s, border-color 0.15s, transform 0.1s; 
          width: 100%; 
        }
        
        .rdash-action-card:hover:not(:disabled) { 
          box-shadow: 0 4px 16px rgba(0,0,0,0.08); 
          border-color: #CBD5E1; 
          transform: translateY(-1px); 
        }
        
        .rdash-action-card:active:not(:disabled) { 
          transform: scale(0.99); 
        }
        
        .rdash-action-card--muted { 
          opacity: 0.55; 
          cursor: default; 
        }
        
        .rdash-action-card--featured {
          background: linear-gradient(135deg, var(--color-signal), #3B82F6);
          color: #fff;
          border-color: transparent;
        }
        
        .rdash-action-card--featured:hover:not(:disabled) {
          box-shadow: 0 8px 24px rgba(31,78,140,0.3);
          transform: translateY(-2px);
        }
        
        .rdash-action-card--featured .rdash-action-title,
        .rdash-action-card--featured .rdash-action-desc {
          color: #fff;
        }
        
        .rdash-action-card--featured .rdash-action-arrow {
          color: rgba(255,255,255,0.8);
        }
        
        .rdash-action-icon { 
          width: 44px; 
          height: 44px; 
          border-radius: 10px; 
          background: var(--color-signal-soft); 
          color: var(--color-signal); 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          flex-shrink: 0; 
        }
        
        .rdash-action-icon--muted { 
          background: var(--color-paper); 
          color: var(--color-ink-muted); 
        }
        
        .rdash-action-icon--featured {
          background: rgba(255,255,255,0.2);
          color: #fff;
        }
        
        .rdash-action-body { 
          flex: 1; 
        }
        
        .rdash-action-title { 
          font-family: var(--font-display); 
          font-size: var(--text-base); 
          font-weight: 600; 
          color: var(--color-ink); 
          margin: 0 0 0.25rem; 
        }
        
        .rdash-action-desc { 
          font-size: var(--text-sm); 
          color: var(--color-ink-muted); 
          margin: 0 0 0.5rem; 
        }
        
        .rdash-action-features {
          display: flex;
          flex-wrap: wrap;
          gap: 0.375rem;
        }
        
        .rdash-feature-chip {
          font-size: 0.6875rem;
          font-weight: 500;
          background: rgba(255,255,255,0.2);
          color: rgba(255,255,255,0.9);
          padding: 0.125rem 0.5rem;
          border-radius: 999px;
        }
        
        .rdash-action-arrow { 
          color: #CBD5E1; 
          flex-shrink: 0; 
        }
        
        .rdash-soon-badge { 
          font-size: 0.6875rem; 
          font-weight: 600; 
          color: #64748B; 
          background: #F1F5F9; 
          padding: 0.2rem 0.6rem; 
          border-radius: 999px; 
          white-space: nowrap; 
        }
        
        .rdash-action-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 0.75rem;
        }
        
        .rdash-action-grid .rdash-action-card {
          flex-direction: column;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem;
        }
        
        .rdash-action-grid .rdash-action-icon {
          width: 36px;
          height: 36px;
        }
        
        .rdash-action-grid .rdash-action-title {
          font-size: var(--text-sm);
        }
        
        .rdash-action-grid .rdash-action-desc {
          font-size: 0.75rem;
        }
        
        /* Tips Card */
        .rdash-tips-card {
          background: #fff;
          border: 1px solid var(--color-line);
          border-radius: 12px;
          padding: 1.25rem;
          box-shadow: var(--shadow-sm);
          display: flex;
          gap: 1rem;
        }
        
        .rdash-tips-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: rgba(59,130,246,0.1);
          color: #3B82F6;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        
        .rdash-tips-content {
          flex: 1;
        }
        
        .rdash-tips-title {
          font-family: var(--font-display);
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--color-ink);
          margin: 0 0 0.5rem;
        }
        
        .rdash-tips-list {
          margin: 0;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        
        .rdash-tips-list li {
          font-size: var(--text-sm);
          color: var(--color-ink-muted);
          line-height: 1.4;
          position: relative;
          padding-left: 1rem;
        }
        
        .rdash-tips-list li::before {
          content: "•";
          position: absolute;
          left: 0;
          color: #3B82F6;
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}
