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
            Shop discovery and ordering features are coming in Phase 2.
          </p>
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
          align-items: center; 
          justify-content: center; 
          padding: 2rem; 
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
      `}</style>
    </div>
  );
}
