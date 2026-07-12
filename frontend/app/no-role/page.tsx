/**
 * /no-role — shown to authenticated users who have no role claim yet.
 *
 * This happens when:
 *   1. The Firebase Auth account was created but POST /auth/register failed
 *      or was never called.
 *   2. The user somehow lands on the app before registration completed.
 *
 * This page has NO redirect logic. It is in PUBLIC_PATHS and also explicitly
 * allowed by the middleware no-role branch so it can never cause a loop.
 *
 * Auth bug fixes applied:
 *   A8 — Users are given a generic "Contact Admin" or logout option instead of
 *        forcing a link to the retailer signup, which is wrong for wholesalers/delivery.
 */

"use client";

import { useRouter } from "next/navigation";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { signOut } from "firebase/auth";
import { clearSession } from "@/lib/auth/session";

export default function NoRolePage() {
  const router = useRouter();

  async function handleSignOut() {
    try {
      await clearSession();
    } catch {
      // ignore
    }
    const auth = getFirebaseAuth();
    if (auth) {
      await signOut(auth);
    }
    router.push("/");
  }

  return (
    <main className="no-role-page">
      <div className="no-role-card">
        <div className="no-role-icon" aria-hidden="true">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        
        <h1 className="no-role-title">Account not ready</h1>
        
        <p className="no-role-text">
          Your sign-in was accepted but your account role hasn&apos;t been
          assigned yet. This usually means your registration hasn&apos;t been
          fully processed by the platform administrator.
        </p>

        <p className="no-role-text">
          If you just signed up as a retailer and encountered an error, you may
          need to contact support to complete your account setup.
        </p>

        <div className="no-role-actions">
          <button onClick={handleSignOut} className="no-role-btn tap-target">
            Sign out and return home
          </button>
        </div>
      </div>

      <style>{`
        .no-role-page {
          min-height: 100svh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-paper);
          padding: 1.5rem;
        }

        .no-role-card {
          width: 100%;
          max-width: 440px;
          background: #fff;
          border: 1px solid var(--color-line);
          border-radius: var(--radius-lg);
          padding: 2.5rem 2rem;
          box-shadow: var(--shadow-md);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .no-role-icon {
          width: 64px;
          height: 64px;
          background: var(--color-signal-soft);
          color: var(--color-signal);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
        }

        .no-role-title {
          font-family: var(--font-display);
          font-size: var(--text-xl);
          font-weight: 600;
          color: var(--color-ink);
          margin: 0 0 1rem;
          letter-spacing: -0.01em;
        }

        .no-role-text {
          font-size: var(--text-base);
          color: var(--color-ink-muted);
          line-height: 1.6;
          margin: 0 0 1.25rem;
        }

        .no-role-actions {
          margin-top: 1rem;
          width: 100%;
        }

        .no-role-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 0.75rem 1.25rem;
          background: var(--color-signal);
          color: #fff;
          border: none;
          border-radius: var(--radius-md);
          font-family: var(--font-body);
          font-size: var(--text-base);
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s ease, transform 0.1s ease;
        }

        .no-role-btn:hover {
          background: #173f70;
        }

        .no-role-btn:active {
          transform: scale(0.98);
        }
      `}</style>
    </main>
  );
}
