"use client";

/**
 * Wholesaler self-registration page.
 * URL: /wholesaler/signup
 * Derived from: app-flow.md section 2.1 (Path B), tech-spec.md section 3.1
 *
 * Flow:
 *   1. User fills name, phone, email, password.
 *   2. createUserWithEmailAndPassword via Firebase Auth client SDK.
 *   3. POST /auth/register with { name, phone, email, requestedRole: "wholesaler" }
 *      => Express sets role=wholesaler, status=pending_approval, disables Auth account.
 *   4. On success, show a "pending approval" confirmation screen.
 *      The user CANNOT log in until an Admin approves their account.
 *
 * NOTE: Unlike retailer signup we do NOT create a session here.
 * The account is disabled -- attempting createSession would fail.
 */

import { useState } from "react";
import { createUserWithEmailAndPassword, deleteUser } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { API_BASE_URL } from "@/lib/firebase/config";

type FormState = "idle" | "loading" | "error" | "success";

export default function WholesalerSignupPage() {
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

      // 2. Get initial ID token (no role claim yet)
      const idToken = await createdUser.getIdToken();

      // 3. POST /auth/register with requestedRole=wholesaler
      //    Express will: set role=wholesaler, status=pending_approval, disable the Auth account
      const registerRes = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ name, phone, email, requestedRole: "wholesaler" }),
      });

      if (!registerRes.ok) {
        const body = await registerRes.json().catch(() => ({}));
        throw new Error(body.message ?? "Registration failed. Please try again.");
      }

      // 4. Sign out of the client SDK -- the account is now disabled server-side
      await auth.signOut();

      setFormState("success");
    } catch (err: unknown) {
      // Clean up orphaned user if API registration failed
      if (createdUser) {
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
        msg = "Network error -- check your internet connection and try again.";
      }

      setErrorMsg(msg);
      setFormState("error");
    }
  }

  if (formState === "success") {
    return (
      <main className="wsignup-page">
        <div className="wsignup-bg-pattern" aria-hidden="true">
          <div className="wsignup-bg-circle wsignup-bg-circle--1" />
          <div className="wsignup-bg-circle wsignup-bg-circle--2" />
        </div>
        <div className="wsignup-container">
          <div className="wsignup-card wsignup-card--success">
            <div className="wsignup-success-icon" aria-hidden="true">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h1 className="wsignup-title">Application submitted!</h1>
            <p className="wsignup-subtitle">
              Your wholesaler account application has been received. A platform administrator will review and approve it shortly.
            </p>
            <div className="wsignup-info-box">
              You will be able to sign in once your account is approved. You may be contacted via the email you provided.
            </div>
            <a href="/" className="wsignup-btn tap-target" style={{ textDecoration: "none", textAlign: "center" }}>
              Back to sign in
            </a>
          </div>
        </div>
        <style>{wsignupStyles}</style>
      </main>
    );
  }

  return (
    <main className="wsignup-page">
      <div className="wsignup-bg-pattern" aria-hidden="true">
        <div className="wsignup-bg-circle wsignup-bg-circle--1" />
        <div className="wsignup-bg-circle wsignup-bg-circle--2" />
      </div>

      <div className="wsignup-container">
        <a href="/" className="wsignup-back tap-target">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          Back to sign in
        </a>

        <div className="wsignup-card">
          <div className="wsignup-header">
            <span className="wsignup-badge">Wholesaler Application</span>
            <h1 className="wsignup-title">Apply to join</h1>
            <p className="wsignup-subtitle">
              Submit your details for review. An administrator will approve your account before you can start trading.
            </p>
          </div>

          <form onSubmit={handleSignup} noValidate className="wsignup-form">
            <div className="wsignup-field">
              <label htmlFor="wsignup-name" className="wsignup-label">
                Full name <span className="wsignup-req">*</span>
              </label>
              <div className="wsignup-input-wrap">
                <svg className="wsignup-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <input id="wsignup-name" type="text" autoComplete="name" required className="wsignup-input" value={name} onChange={(e) => setName(e.target.value)} disabled={formState === "loading"} placeholder="Your full name" />
              </div>
            </div>

            <div className="wsignup-field">
              <label htmlFor="wsignup-phone" className="wsignup-label">
                Phone number <span className="wsignup-req">*</span>
              </label>
              <div className="wsignup-input-wrap">
                <svg className="wsignup-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                  <line x1="12" y1="18" x2="12.01" y2="18"/>
                </svg>
                <input id="wsignup-phone" type="tel" autoComplete="tel" required className="wsignup-input" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={formState === "loading"} placeholder="+91 98765 43210" />
              </div>
            </div>

            <div className="wsignup-field">
              <label htmlFor="wsignup-email" className="wsignup-label">
                Email address <span className="wsignup-req">*</span>
              </label>
              <div className="wsignup-input-wrap">
                <svg className="wsignup-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
                <input id="wsignup-email" type="email" autoComplete="email" required className="wsignup-input" value={email} onChange={(e) => setEmail(e.target.value)} disabled={formState === "loading"} placeholder="you@business.com" />
              </div>
            </div>

            <div className="wsignup-field">
              <label htmlFor="wsignup-password" className="wsignup-label">
                Password <span className="wsignup-req">*</span>
              </label>
              <div className="wsignup-input-wrap">
                <svg className="wsignup-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input id="wsignup-password" type="password" autoComplete="new-password" required minLength={6} className="wsignup-input" value={password} onChange={(e) => setPassword(e.target.value)} disabled={formState === "loading"} placeholder="Minimum 6 characters" />
              </div>
            </div>

            {formState === "error" && (
              <div className="wsignup-error" role="alert">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>{errorMsg}</span>
              </div>
            )}

            <button id="wsignup-submit" type="submit" className="wsignup-btn tap-target" disabled={formState === "loading" || !name || !phone || !email || !password}>
              {formState === "loading" ? (
                <span className="wsignup-spinner" aria-label="Submitting application..." />
              ) : (
                "Submit application"
              )}
            </button>
          </form>

          <p className="wsignup-terms">
            Your details will be reviewed by a platform administrator before your account is activated.
          </p>
        </div>
      </div>

      <style>{wsignupStyles}</style>
    </main>
  );
}

const wsignupStyles = `
  .wsignup-page { min-height: 100svh; background: #0B1929; display: flex; align-items: flex-start; justify-content: center; padding: 2.5rem 1.5rem; position: relative; overflow: hidden; }
  .wsignup-bg-pattern { position: absolute; inset: 0; pointer-events: none; }
  .wsignup-bg-circle { position: absolute; border-radius: 50%; filter: blur(120px); opacity: 0.12; }
  .wsignup-bg-circle--1 { width: 500px; height: 500px; background: #1F4E8C; top: -100px; left: -150px; }
  .wsignup-bg-circle--2 { width: 450px; height: 450px; background: #5B4B8A; bottom: -100px; right: -150px; }
  .wsignup-container { width: 100%; max-width: 440px; display: flex; flex-direction: column; gap: 1.25rem; position: relative; z-index: 1; }
  .wsignup-back { font-size: var(--text-sm); color: #94A3B8; text-decoration: none; font-weight: 500; display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.25rem 0.5rem; margin-left: -0.5rem; border-radius: var(--radius-md); transition: color 0.15s, background 0.15s; }
  .wsignup-back:hover { color: #F1F5F9; background: rgba(255,255,255,0.05); }
  .wsignup-card { background: rgba(255,255,255,0.05); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 2rem; box-shadow: 0 0 0 1px rgba(255,255,255,0.03), 0 8px 40px rgba(0,0,0,0.3); display: flex; flex-direction: column; gap: 1.5rem; }
  .wsignup-card--success { align-items: center; text-align: center; padding: 2.5rem 2rem; }
  .wsignup-success-icon { width: 72px; height: 72px; border-radius: 50%; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2); display: flex; align-items: center; justify-content: center; color: #6EE7B7; }
  .wsignup-info-box { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: var(--radius-md); padding: 1rem; font-size: var(--text-sm); color: #94A3B8; line-height: 1.6; }
  .wsignup-badge { display: inline-block; font-size: var(--text-xs); font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #A78BFA; background: rgba(167,139,250,0.1); border: 1px solid rgba(167,139,250,0.2); padding: 0.25rem 0.625rem; border-radius: var(--radius-pill); width: fit-content; }
  .wsignup-header { display: flex; flex-direction: column; gap: 0.5rem; }
  .wsignup-title { font-family: var(--font-display); font-size: var(--text-xl); font-weight: 600; color: #F1F5F9; margin: 0; letter-spacing: -0.01em; }
  .wsignup-subtitle { font-size: var(--text-sm); color: #94A3B8; margin: 0; line-height: 1.5; }
  .wsignup-form { display: flex; flex-direction: column; gap: 1.125rem; }
  .wsignup-field { display: flex; flex-direction: column; gap: 0.375rem; }
  .wsignup-label { font-size: var(--text-sm); font-weight: 500; color: #CBD5E1; }
  .wsignup-req { color: #FCA5A5; margin-left: 0.125rem; }
  .wsignup-input-wrap { position: relative; display: flex; align-items: center; }
  .wsignup-input-icon { position: absolute; left: 0.875rem; color: #64748B; pointer-events: none; flex-shrink: 0; }
  .wsignup-input { width: 100%; padding: 0.6875rem 0.875rem 0.6875rem 2.75rem; border: 1.5px solid rgba(255,255,255,0.1); border-radius: var(--radius-md); font-family: var(--font-body); font-size: var(--text-base); color: #F1F5F9; background: rgba(255,255,255,0.04); outline: none; transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease; }
  .wsignup-input:focus { border-color: #A78BFA; box-shadow: 0 0 0 3px rgba(167,139,250,0.15); background: rgba(255,255,255,0.06); }
  .wsignup-input:disabled { opacity: 0.5; cursor: not-allowed; }
  .wsignup-input::placeholder { color: #475569; }
  .wsignup-error { display: flex; align-items: flex-start; gap: 0.5rem; font-size: var(--text-sm); color: #FCA5A5; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); border-radius: var(--radius-md); padding: 0.625rem 0.875rem; }
  .wsignup-error svg { flex-shrink: 0; margin-top: 1px; color: #F87171; }
  .wsignup-btn { display: flex; align-items: center; justify-content: center; width: 100%; padding: 0.75rem 1.25rem; background: linear-gradient(135deg, #4C1D95 0%, #7C3AED 100%); color: #fff; border: none; border-radius: var(--radius-md); font-family: var(--font-body); font-size: var(--text-base); font-weight: 600; cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease; box-shadow: 0 2px 8px rgba(109,40,217,0.3); margin-top: 0.5rem; }
  .wsignup-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(109,40,217,0.4); }
  .wsignup-btn:active:not(:disabled) { transform: translateY(0) scale(0.98); }
  .wsignup-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .wsignup-spinner { display: block; width: 1.25rem; height: 1.25rem; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: wspin 0.7s linear infinite; }
  @keyframes wspin { to { transform: rotate(360deg); } }
  .wsignup-terms { font-size: var(--text-xs); color: #64748B; text-align: center; margin: 0; line-height: 1.6; }
`;
