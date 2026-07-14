"use client";

/**
 * Pending Approval page.
 * URL: /pending-approval
 * Derived from: app-flow.md Section 2.1 (Path B), tech-spec.md Section 3.1
 *
 * Shown when a wholesaler self-registration is awaiting Admin approval.
 * The middleware redirects pending_approval users here instead of their dashboard.
 */

import { useAuth } from "@/providers/auth-provider";
import { useRouter } from "next/navigation";

export default function PendingApprovalPage() {
  const { logout } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await logout();
    router.push("/");
  }

  return (
    <main className="pending-page">
      <div className="pending-bg" aria-hidden="true">
        <div className="pending-circle pending-circle--1" />
        <div className="pending-circle pending-circle--2" />
      </div>

      <div className="pending-card">
        <div className="pending-icon" aria-hidden="true">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>

        <h1 className="pending-title">Awaiting Approval</h1>

        <p className="pending-body">
          Your wholesaler account has been submitted and is under review by a platform administrator. You will receive a notification once your account is activated.
        </p>

        <div className="pending-info">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}>
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>If it has been more than 48 hours, please contact the platform administrator directly.</span>
        </div>

        <button id="pending-signout" onClick={handleSignOut} className="pending-btn tap-target">
          Sign out
        </button>
      </div>

      <style>{`
        .pending-page { min-height: 100svh; background: #0B1929; display: flex; align-items: center; justify-content: center; padding: 2rem 1.5rem; position: relative; overflow: hidden; }
        .pending-bg { position: absolute; inset: 0; pointer-events: none; }
        .pending-circle { position: absolute; border-radius: 50%; filter: blur(120px); opacity: 0.1; }
        .pending-circle--1 { width: 500px; height: 500px; background: #5B4B8A; top: -150px; right: -150px; }
        .pending-circle--2 { width: 400px; height: 400px; background: #1F4E8C; bottom: -100px; left: -100px; }
        .pending-card { position: relative; z-index: 1; width: 100%; max-width: 420px; background: rgba(255,255,255,0.05); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 2.5rem 2rem; box-shadow: 0 8px 40px rgba(0,0,0,0.3); display: flex; flex-direction: column; align-items: center; gap: 1.25rem; text-align: center; }
        .pending-icon { width: 72px; height: 72px; border-radius: 50%; background: rgba(167,139,250,0.1); border: 1px solid rgba(167,139,250,0.2); display: flex; align-items: center; justify-content: center; color: #A78BFA; }
        .pending-title { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: 700; color: #F1F5F9; margin: 0; letter-spacing: -0.02em; }
        .pending-body { font-size: var(--text-base); color: #94A3B8; margin: 0; line-height: 1.6; max-width: 340px; }
        .pending-info { display: flex; align-items: flex-start; gap: 0.625rem; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: var(--radius-md); padding: 0.875rem 1rem; font-size: var(--text-sm); color: #94A3B8; line-height: 1.5; text-align: left; width: 100%; }
        .pending-btn { margin-top: 0.5rem; width: 100%; padding: 0.75rem 1.25rem; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: var(--radius-md); font-family: var(--font-body); font-size: var(--text-base); font-weight: 500; color: #94A3B8; cursor: pointer; transition: background 0.2s, color 0.2s, border-color 0.2s; }
        .pending-btn:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2); color: #F1F5F9; }
      `}</style>
    </main>
  );
}
