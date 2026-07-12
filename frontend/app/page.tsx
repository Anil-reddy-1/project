"use client";

/**
 * Login / Landing Page.
 * Derived from: tech-spec.md §3.3, app-flow.md §4.1, design-doc.md §2
 *
 * Handles:
 *  - Email/password sign-in for all roles (Admin, Wholesaler, Delivery Partner
 *    receive credentials via CredentialMailer; Retailer signs up separately)
 *  - On success: exchanges ID token for session cookie, then redirects to
 *    the role-appropriate dashboard based on the custom claim.
 *  - "Sign up as Retailer" link → /retailer/signup
 *
 * Phase 1: email/password only. Phone OTP sign-in for retailers can be added
 * in Phase 2 when Firebase Phone Auth is configured.
 *
 * Auth bug fixes applied:
 *   A10 — Now handles `auth/network-request-failed` error code for offline/network issues.
 */

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { createSession } from "@/lib/auth/session";
import type { UserRole } from "@/types";

// Role → dashboard URL mapping (must match middleware.ts ROLE_ROUTES)
const ROLE_DASHBOARD: Record<UserRole, string> = {
  retailer: "/retailer",
  wholesaler: "/wholesaler",
  delivery_partner: "/delivery",
  admin: "/admin",
};

type FormState = "idle" | "loading" | "error";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const successMsg = searchParams.get("message");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setFormState("loading");
    setErrorMsg("");

    try {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error("Firebase not configured.");

      // 1. Firebase sign-in
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const user = credential.user;

      // 2. Get fresh ID token (force refresh ensures latest custom claims)
      const idToken = await user.getIdToken(true);

      // 3. Exchange for session cookie
      await createSession(idToken);

      // 4. Read role from token claims to redirect to correct dashboard
      const tokenResult = await user.getIdTokenResult();
      const role = tokenResult.claims.role as UserRole | undefined;

      if (!role || !ROLE_DASHBOARD[role]) {
        // Account exists but has no role claim — contact admin
        setErrorMsg(
          "Your account does not have a role assigned. Contact the platform administrator.",
        );
        setFormState("error");
        return;
      }

      router.push(ROLE_DASHBOARD[role]);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      let msg = "Something went wrong. Please try again.";

      if (
        code === "auth/invalid-credential" ||
        code === "auth/user-not-found" ||
        code === "auth/wrong-password"
      ) {
        msg = "Incorrect email or password.";
      } else if (code === "auth/user-disabled") {
        msg = "Account Pending Approval — your registration is awaiting administrator review. You will be notified when approved.";
      } else if (code === "auth/too-many-requests") {
        msg = "Too many failed attempts. Please wait a few minutes and try again.";
      } else if (code === "auth/network-request-failed") {
        // FIX A10: handle network errors explicitly
        msg = "Network error — check your internet connection and try again.";
      }

      setErrorMsg(msg);
      setFormState("error");
    }
  }

  return (
    <main className="login-page">
      {/* Decorative background pattern */}
      <div className="login-bg-pattern" aria-hidden="true">
        <div className="login-bg-circle login-bg-circle--1" />
        <div className="login-bg-circle login-bg-circle--2" />
        <div className="login-bg-circle login-bg-circle--3" />
      </div>

      <div className="login-container">
        {/* Wordmark */}
        <div className="login-brand">
          <div className="login-logo-mark" aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="10" fill="#1F4E8C"/>
              <path d="M10 28L16 12h3l4 10.5L27 12h3L20 32l-4-10L10 28z" fill="white" fillOpacity="0.95"/>
            </svg>
          </div>
          <h1 className="login-wordmark">Wholesale<span>Hub</span></h1>
          <p className="login-tagline">
            B2B order management &amp; delivery dispatch
          </p>
        </div>

        {/* Card */}
        <div className="login-card">
          <h2 className="login-card-title">Welcome back</h2>
          <p className="login-card-subtitle">Sign in to your account to continue</p>

          {successMsg && formState !== "error" && (
            <div className="login-success" role="alert" style={{
              display: "flex", alignItems: "flex-start", gap: "0.5rem", fontSize: "var(--text-sm)",
              color: "#6EE7B7", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)",
              borderRadius: "var(--radius-md)", padding: "0.625rem 0.875rem", marginBottom: "1rem"
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "1px" }}>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} noValidate className="login-form">
            <div className="login-field">
              <label htmlFor="login-email" className="login-label">
                Email address
              </label>
              <div className="login-input-wrap">
                <svg className="login-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  className="login-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={formState === "loading"}
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="login-password" className="login-label">
                Password
              </label>
              <div className="login-input-wrap">
                <svg className="login-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="login-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={formState === "loading"}
                  placeholder="••••••••"
                />
              </div>
            </div>

            {formState === "error" && (
              <div className="login-error" role="alert">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              className="login-btn-primary tap-target"
              disabled={formState === "loading" || !email || !password}
            >
              {formState === "loading" ? (
                <span className="login-spinner" aria-label="Signing in…" />
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="login-divider">
            <span>New to the platform?</span>
          </div>

          <a
            id="login-retailer-signup"
            href="/retailer/signup"
            className="login-btn-secondary tap-target"
          >
            Sign up as a Retailer
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"/>
              <path d="m12 5 7 7-7 7"/>
            </svg>
          </a>
          <a
            id="login-wholesaler-signup"
            href="/wholesaler/signup"
            className="login-btn-secondary tap-target"
          >
            Apply as a Wholesaler
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"/>
              <path d="m12 5 7 7-7 7"/>
            </svg>
          </a>
        </div>

        <p className="login-footer">
          Wholesaler &amp; delivery partner accounts are created by the platform
          administrator.
        </p>
      </div>

      <style>{`
        /* ── Page ── */
        .login-page {
          min-height: 100svh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0B1929;
          padding: 1.5rem;
          position: relative;
          overflow: hidden;
        }

        /* ── Decorative BG ── */
        .login-bg-pattern {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .login-bg-circle {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.15;
        }
        .login-bg-circle--1 {
          width: 600px; height: 600px;
          background: #1F4E8C;
          top: -200px; right: -100px;
        }
        .login-bg-circle--2 {
          width: 400px; height: 400px;
          background: #5B4B8A;
          bottom: -150px; left: -50px;
        }
        .login-bg-circle--3 {
          width: 300px; height: 300px;
          background: #1B7A4A;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
        }

        .login-container {
          width: 100%;
          max-width: 420px;
          display: flex;
          flex-direction: column;
          gap: 2rem;
          align-items: center;
          position: relative;
          z-index: 1;
        }

        /* ── Brand ── */
        .login-brand {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .login-logo-mark {
          margin-bottom: 0.25rem;
          filter: drop-shadow(0 4px 12px rgba(31, 78, 140, 0.4));
        }

        .login-wordmark {
          font-family: var(--font-display);
          font-size: 2rem;
          font-weight: 700;
          color: #F1F5F9;
          letter-spacing: -0.02em;
          margin: 0;
        }

        .login-wordmark span {
          color: #60A5FA;
        }

        .login-tagline {
          font-size: var(--text-sm);
          color: #94A3B8;
          margin: 0;
        }

        /* ── Card ── */
        .login-card {
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.03),
            0 8px 40px rgba(0,0,0,0.3),
            0 2px 8px rgba(0,0,0,0.2);
        }

        .login-card-title {
          font-family: var(--font-display);
          font-size: var(--text-xl);
          font-weight: 600;
          color: #F1F5F9;
          margin: 0;
          letter-spacing: -0.01em;
        }

        .login-card-subtitle {
          font-size: var(--text-sm);
          color: #94A3B8;
          margin: -0.5rem 0 0;
        }

        /* ── Form ── */
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .login-field {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }

        .login-label {
          font-size: var(--text-sm);
          font-weight: 500;
          color: #CBD5E1;
        }

        .login-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .login-input-icon {
          position: absolute;
          left: 0.875rem;
          color: #64748B;
          pointer-events: none;
          flex-shrink: 0;
        }

        .login-input {
          width: 100%;
          padding: 0.6875rem 0.875rem 0.6875rem 2.75rem;
          border: 1.5px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-md);
          font-family: var(--font-body);
          font-size: var(--text-base);
          color: #F1F5F9;
          background: rgba(255, 255, 255, 0.04);
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
          outline: none;
        }

        .login-input:focus {
          border-color: #60A5FA;
          box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.15);
          background: rgba(255, 255, 255, 0.06);
        }

        .login-input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .login-input::placeholder {
          color: #475569;
        }

        /* ── Error ── */
        .login-error {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          font-size: var(--text-sm);
          color: #FCA5A5;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: var(--radius-md);
          padding: 0.625rem 0.875rem;
        }

        .login-error svg {
          flex-shrink: 0;
          margin-top: 1px;
          color: #F87171;
        }

        /* ── Buttons ── */
        .login-btn-primary {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 0.75rem 1.25rem;
          background: linear-gradient(135deg, #1F4E8C 0%, #2563EB 100%);
          color: #fff;
          border: none;
          border-radius: var(--radius-md);
          font-family: var(--font-body);
          font-size: var(--text-base);
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
          box-shadow: 0 2px 8px rgba(31, 78, 140, 0.3);
          margin-top: 0.25rem;
        }

        .login-btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(31, 78, 140, 0.4);
        }

        .login-btn-primary:active:not(:disabled) {
          transform: translateY(0) scale(0.98);
        }

        .login-btn-primary:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .login-btn-secondary {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.75rem 1.25rem;
          background: transparent;
          color: #60A5FA;
          border: 1.5px solid rgba(96, 165, 250, 0.25);
          border-radius: var(--radius-md);
          font-family: var(--font-body);
          font-size: var(--text-base);
          font-weight: 600;
          text-decoration: none;
          transition: background 0.2s ease, border-color 0.2s ease;
        }

        .login-btn-secondary:hover {
          background: rgba(96, 165, 250, 0.08);
          border-color: rgba(96, 165, 250, 0.4);
        }

        /* ── Spinner ── */
        .login-spinner {
          display: block;
          width: 1.25rem;
          height: 1.25rem;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ── Divider ── */
        .login-divider {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #475569;
          font-size: var(--text-sm);
        }

        .login-divider::before,
        .login-divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: rgba(255, 255, 255, 0.08);
        }

        /* ── Footer ── */
        .login-footer {
          font-size: var(--text-xs);
          color: #64748B;
          text-align: center;
          max-width: 300px;
          margin: 0;
          line-height: 1.6;
        }
      `}</style>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100svh", background: "#0B1929" }} />}>
      <LoginForm />
    </Suspense>
  );
}
