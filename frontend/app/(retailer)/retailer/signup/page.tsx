"use client";

/**
 * Retailer self-signup page.
 * Derived from: app-flow.md §1.1, tech-spec.md §3.1, rules.md §1, schema.md §1
 *
 * Flow:
 *   1. User fills name, phone, email, password.
 *   2. createUserWithEmailAndPassword via Firebase Auth client SDK.
 *   3. POST /auth/register with name + phone → Express sets role=retailer claim
 *      and creates Firestore users/{uid} doc.
 *   4. Force-refresh ID token to get new claims.
 *   5. Exchange ID token for session cookie (POST /api/session).
 *   6. Redirect to /retailer (retailer dashboard).
 *
 * Auth bug fixes applied:
 *   A3 — If POST /auth/register fails, we now clean up the Firebase Auth user
 *        so they aren't orphaned without a role claim.
 *   A11 — Uses API_BASE_URL instead of raw process.env for backend connection.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, deleteUser } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { createSession } from "@/lib/auth/session";
import { API_BASE_URL } from "@/lib/firebase/config";

type FormState = "idle" | "loading" | "error" | "success";

export default function RetailerSignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setFormState("loading");
    setErrorMsg("");

    const auth = getFirebaseAuth();
    if (!auth) {
      setErrorMsg("Firebase not configured.");
      setFormState("error");
      return;
    }

    let createdUser = null;

    try {
      // 1. Create Firebase Auth account
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      createdUser = credential.user;

      // 2. Get initial ID token (no role claim yet — first token)
      const idToken = await createdUser.getIdToken();

      // 3. POST /auth/register → sets role=retailer claim + creates Firestore doc
      // FIX A11: Use API_BASE_URL
      const registerRes = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ name, phone, email }),
      });

      if (!registerRes.ok) {
        const body = await registerRes.json().catch(() => ({}));
        throw new Error(body.message ?? "Registration failed. Please try again.");
      }

      // 4. Force-refresh ID token to pick up new role=retailer claim
      // Custom claims can take a second to propagate in Firebase Auth backend
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      let freshToken = await createdUser.getIdToken(true);
      let claims = (await createdUser.getIdTokenResult()).claims;
      
      // Retry once if claims still haven't propagated
      if (!claims.role) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        freshToken = await createdUser.getIdToken(true);
        claims = (await createdUser.getIdTokenResult()).claims;
      }

      if (!claims.role) {
        // Firebase client SDK throttled the refresh or backend is too slow.
        // Sign them out of the client SDK to prevent orphaned sessions and redirect to login.
        await auth.signOut();
        router.push("/?message=Account+created.+Please+sign+in+to+continue.");
        return;
      }

      // 5. Exchange for session cookie
      await createSession(freshToken);

      // 6. Redirect to retailer dashboard
      router.push("/retailer");
    } catch (err: unknown) {
      // FIX A3: Clean up orphaned user on API failure
      if (createdUser && auth.currentUser?.uid === createdUser.uid) {
        try {
          await deleteUser(createdUser);
        } catch (cleanupErr) {
          console.error("Failed to clean up orphaned Firebase user:", cleanupErr);
        }
      }

      const code = (err as { code?: string }).code;
      let msg = (err as Error).message ?? "Something went wrong. Please try again.";

      if (code === "auth/email-already-in-use") {
        msg = "An account with this email already exists. Sign in instead.";
      } else if (code === "auth/weak-password") {
        msg = "Password must be at least 6 characters.";
      } else if (code === "auth/invalid-email") {
        msg = "Please enter a valid email address.";
      } else if (code === "auth/network-request-failed") {
        msg = "Network error — check your internet connection and try again.";
      }

      setErrorMsg(msg);
      setFormState("error");
    }
  }

  return (
    <main className="signup-page">
      {/* Decorative background pattern (matches login) */}
      <div className="signup-bg-pattern" aria-hidden="true">
        <div className="signup-bg-circle signup-bg-circle--1" />
        <div className="signup-bg-circle signup-bg-circle--2" />
      </div>

      <div className="signup-container">
        {/* Back link */}
        <a href="/" className="signup-back tap-target">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          Back to sign in
        </a>

        <div className="signup-card">
          <div className="signup-header">
            <h1 className="signup-title">Create account</h1>
            <p className="signup-subtitle">
              Sign up as a retailer to discover wholesalers and place orders.
            </p>
          </div>

          <form onSubmit={handleSignup} noValidate className="signup-form">
            <div className="signup-field">
              <label htmlFor="signup-name" className="signup-label">
                Full name <span className="signup-required">*</span>
              </label>
              <div className="signup-input-wrap">
                <svg className="signup-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <input
                  id="signup-name"
                  type="text"
                  autoComplete="name"
                  required
                  className="signup-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={formState === "loading"}
                  placeholder="Your full name"
                />
              </div>
            </div>

            <div className="signup-field">
              <label htmlFor="signup-phone" className="signup-label">
                Phone number <span className="signup-required">*</span>
              </label>
              <div className="signup-input-wrap">
                <svg className="signup-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                  <line x1="12" y1="18" x2="12.01" y2="18"/>
                </svg>
                <input
                  id="signup-phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  className="signup-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={formState === "loading"}
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            <div className="signup-field">
              <label htmlFor="signup-email" className="signup-label">
                Email address <span className="signup-required">*</span>
              </label>
              <div className="signup-input-wrap">
                <svg className="signup-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
                <input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  required
                  className="signup-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={formState === "loading"}
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="signup-field">
              <label htmlFor="signup-password" className="signup-label">
                Password <span className="signup-required">*</span>
              </label>
              <div className="signup-input-wrap">
                <svg className="signup-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  id="signup-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  className="signup-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={formState === "loading"}
                  placeholder="Minimum 6 characters"
                />
              </div>
            </div>

            {formState === "error" && (
              <div className="signup-error" role="alert">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              id="signup-submit"
              type="submit"
              className="signup-btn-primary tap-target"
              disabled={
                formState === "loading" || !name || !phone || !email || !password
              }
            >
              {formState === "loading" ? (
                <span className="signup-spinner" aria-label="Creating account…" />
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <p className="signup-terms">
            By creating an account you agree to the platform&apos;s terms of use.
          </p>
        </div>
      </div>

      <style>{`
        /* ── Page ── */
        .signup-page {
          min-height: 100svh;
          background: #0B1929; /* Match login page */
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 2.5rem 1.5rem;
          position: relative;
          overflow: hidden;
        }

        /* ── Decorative BG ── */
        .signup-bg-pattern {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .signup-bg-circle {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          opacity: 0.12;
        }
        .signup-bg-circle--1 {
          width: 500px; height: 500px;
          background: #1F4E8C;
          top: -100px; left: -150px;
        }
        .signup-bg-circle--2 {
          width: 450px; height: 450px;
          background: #1B7A4A;
          bottom: -100px; right: -150px;
        }

        .signup-container {
          width: 100%;
          max-width: 440px;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          position: relative;
          z-index: 1;
        }

        .signup-back {
          font-size: var(--text-sm);
          color: #94A3B8;
          text-decoration: none;
          font-weight: 500;
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.25rem 0.5rem;
          margin-left: -0.5rem;
          border-radius: var(--radius-md);
          transition: color 0.15s, background 0.15s;
        }

        .signup-back:hover {
          color: #F1F5F9;
          background: rgba(255, 255, 255, 0.05);
        }

        .signup-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 2rem;
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.03),
            0 8px 40px rgba(0,0,0,0.3);
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .signup-header {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }

        .signup-title {
          font-family: var(--font-display);
          font-size: var(--text-xl);
          font-weight: 600;
          color: #F1F5F9;
          margin: 0;
          letter-spacing: -0.01em;
        }

        .signup-subtitle {
          font-size: var(--text-sm);
          color: #94A3B8;
          margin: 0;
          line-height: 1.5;
        }

        .signup-form {
          display: flex;
          flex-direction: column;
          gap: 1.125rem;
        }

        .signup-field {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }

        .signup-label {
          font-size: var(--text-sm);
          font-weight: 500;
          color: #CBD5E1;
        }

        .signup-required {
          color: #FCA5A5;
          margin-left: 0.125rem;
        }

        .signup-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .signup-input-icon {
          position: absolute;
          left: 0.875rem;
          color: #64748B;
          pointer-events: none;
          flex-shrink: 0;
        }

        .signup-input {
          width: 100%;
          padding: 0.6875rem 0.875rem 0.6875rem 2.75rem;
          border: 1.5px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-md);
          font-family: var(--font-body);
          font-size: var(--text-base);
          color: #F1F5F9;
          background: rgba(255, 255, 255, 0.04);
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }

        .signup-input:focus {
          border-color: #60A5FA;
          box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.15);
          background: rgba(255, 255, 255, 0.06);
        }

        .signup-input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .signup-input::placeholder {
          color: #475569;
        }

        .signup-error {
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

        .signup-error svg {
          flex-shrink: 0;
          margin-top: 1px;
          color: #F87171;
        }

        .signup-btn-primary {
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
          margin-top: 0.5rem;
        }

        .signup-btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(31, 78, 140, 0.4);
        }

        .signup-btn-primary:active:not(:disabled) {
          transform: translateY(0) scale(0.98);
        }

        .signup-btn-primary:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .signup-spinner {
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

        .signup-terms {
          font-size: var(--text-xs);
          color: #64748B;
          text-align: center;
          margin: 0;
          line-height: 1.6;
        }
      `}</style>
    </main>
  );
}
