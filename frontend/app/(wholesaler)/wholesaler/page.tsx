"use client";

/**
 * Wholesaler Dashboard — Home.
 * URL: /wholesaler
 * Derived from: app-flow.md section 2.3 (Incoming Orders Tab)
 *
 * Phase 2:
 *  - On mount: fetch user doc to check if shopId exists.
 *  - If no shopId: redirect to /wholesaler/shop-setup.
 *  - If shopId: show shop summary + nav to catalog.
 *
 * Phase 3 adds: Incoming orders queue, approval/rejection flow.
 *
 * Auth bug fixes applied:
 *   A1 — Uses useAuth().logout() to avoid duplicate/race-condition sign-out.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { API_BASE_URL } from "@/lib/firebase/config";

type ShopData = {
  shopId: string;
  name: string;
  category: string;
  verificationStatus: "pending" | "verified" | "rejected";
  moqThreshold: number;
  operatingHours: { days: string[]; open: string; close: string };
};

export default function WholesalerHomePage() {
  const router = useRouter();
  const { logout, user } = useAuth();

  const [shop, setShop] = useState<ShopData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchShop() {
      if (!user) return;
      try {
        const idToken = await user.getIdToken();

        // Fetch the user doc to get their shopId
        const userRes = await fetch(`${API_BASE_URL}/users/${user.uid}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        if (!userRes.ok) {
          setLoading(false);
          return;
        }

        const userData = await userRes.json();

        if (!userData.user?.shopId) {
          // No shop yet — redirect to setup wizard
          router.replace("/wholesaler/shop-setup");
          return;
        }

        // Fetch the actual shop doc
        const shopRes = await fetch(`${API_BASE_URL}/shops/${userData.user.shopId}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        if (shopRes.ok) {
          const shopData = await shopRes.json();
          setShop(shopData);
        }
      } catch (err) {
        console.error("[Wholesaler dashboard] Failed to fetch shop:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchShop();
  }, [user, router]);

  async function handleSignOut() {
    await logout();
    router.push("/");
  }

  const verificationColors: Record<string, string> = {
    pending: "#F59E0B",
    verified: "#10B981",
    rejected: "#EF4444",
  };
  const verificationLabels: Record<string, string> = {
    pending: "Pending verification",
    verified: "Verified",
    rejected: "Rejected",
  };

  return (
    <div className="wdash">
      <header className="wdash-header">
        <div className="wdash-brand">
          <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="10" fill="#1F4E8C"/>
            <path d="M10 28L16 12h3l4 10.5L27 12h3L20 32l-4-10L10 28z" fill="white" fillOpacity="0.95"/>
          </svg>
          <span className="wdash-wordmark">WholesaleHub</span>
        </div>
        <div className="wdash-header-right">
          <span className="wdash-email">{user?.email}</span>
          <button id="wholesaler-signout" onClick={handleSignOut} className="wdash-signout tap-target">
            Sign out
          </button>
        </div>
      </header>

      <main className="wdash-main">
        {loading ? (
          <div className="wdash-loading" aria-label="Loading…">
            <div className="wdash-spinner" />
          </div>
        ) : shop ? (
          <div className="wdash-content">
            {/* Shop summary card */}
            <div className="wdash-shop-card">
              <div className="wdash-shop-top">
                <div>
                  <span className="wdash-role-badge">Wholesaler</span>
                  <h1 className="wdash-shop-name">{shop.name}</h1>
                  <p className="wdash-shop-category">{shop.category}</p>
                </div>
                <div
                  className="wdash-verification-badge"
                  style={{ color: verificationColors[shop.verificationStatus] ?? "#64748B" }}
                >
                  <span className="wdash-v-dot" style={{ background: verificationColors[shop.verificationStatus] ?? "#64748B" }} />
                  {verificationLabels[shop.verificationStatus] ?? shop.verificationStatus}
                </div>
              </div>

              <div className="wdash-shop-stats">
                <div className="wdash-stat">
                  <span className="wdash-stat-label">Minimum order</span>
                  <span className="wdash-stat-value">&#8377;{shop.moqThreshold.toLocaleString("en-IN")}</span>
                </div>
                <div className="wdash-stat">
                  <span className="wdash-stat-label">Open</span>
                  <span className="wdash-stat-value">{shop.operatingHours.open} – {shop.operatingHours.close}</span>
                </div>
                <div className="wdash-stat">
                  <span className="wdash-stat-label">Days</span>
                  <span className="wdash-stat-value">{shop.operatingHours.days.length} days/week</span>
                </div>
              </div>

              {shop.verificationStatus === "pending" && (
                <div className="wdash-pending-notice">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  Your shop is pending admin verification. Retailers cannot discover it until it is verified.
                </div>
              )}
            </div>

            {/* Quick-action cards */}
            <div className="wdash-actions">
              <button
                className="wdash-action-card wdash-action-card--featured tap-target"
                onClick={() => router.push("/wholesaler/catalog")}
              >
                <div className="wdash-action-icon wdash-action-icon--featured">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <path d="M16 10a4 4 0 0 1-8 0"/>
                  </svg>
                </div>
                <div className="wdash-action-body">
                  <h2 className="wdash-action-title">Manage Catalog</h2>
                  <p className="wdash-action-desc">Add products with multiple images, set prices and manage inventory</p>
                  <div className="wdash-action-features">
                    <span className="wdash-feature-chip">✓ Multi-image upload</span>
                    <span className="wdash-feature-chip">✓ Stock management</span>
                  </div>
                </div>
                <svg className="wdash-action-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
              </button>

              <div className="wdash-action-grid">
                <button
                  className="wdash-action-card tap-target"
                  onClick={() => router.push("/wholesaler/orders")}
                >
                  <div className="wdash-action-icon wdash-action-icon--blue">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                  </div>
                  <div className="wdash-action-body">
                    <h3 className="wdash-action-title">Orders</h3>
                    <p className="wdash-action-desc">Review & approve incoming orders</p>
                  </div>
                  <svg className="wdash-action-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
                </button>

                <button
                  className="wdash-action-card wdash-action-card--muted tap-target"
                  disabled
                >
                  <div className="wdash-action-icon wdash-action-icon--muted">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 3v18h18"/>
                      <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>
                    </svg>
                  </div>
                  <div className="wdash-action-body">
                    <h3 className="wdash-action-title">Analytics</h3>
                    <p className="wdash-action-desc">View sales insights</p>
                  </div>
                  <span className="wdash-soon-badge">Phase 4</span>
                </button>

                <button
                  className="wdash-action-card wdash-action-card--muted tap-target"
                  disabled
                >
                  <div className="wdash-action-icon wdash-action-icon--muted">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </div>
                  <div className="wdash-action-body">
                    <h3 className="wdash-action-title">Customers</h3>
                    <p className="wdash-action-desc">Manage retailers</p>
                  </div>
                  <span className="wdash-soon-badge">Phase 4</span>
                </button>

                <button
                  className="wdash-action-card wdash-action-card--muted tap-target"
                  disabled
                >
                  <div className="wdash-action-icon wdash-action-icon--muted">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                    </svg>
                  </div>
                  <div className="wdash-action-body">
                    <h3 className="wdash-action-title">Settings</h3>
                    <p className="wdash-action-desc">Shop preferences</p>
                  </div>
                  <span className="wdash-soon-badge">Coming Soon</span>
                </button>
              </div>

              {/* Quick Tips for Wholesalers */}
              <div className="wdash-tips-card">
                <div className="wdash-tips-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12l2 2 4-4"/>
                    <circle cx="12" cy="12" r="10"/>
                  </svg>
                </div>
                <div className="wdash-tips-content">
                  <h4 className="wdash-tips-title">🚀 Boost Your Sales</h4>
                  <ul className="wdash-tips-list">
                    <li>Add high-quality product images from multiple angles</li>
                    <li>Keep your inventory updated to avoid disappointed customers</li>
                    <li>Set competitive prices to attract more retailers</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="wdash-error-state">
            <p>Could not load your shop. Please refresh or sign in again.</p>
          </div>
        )}
      </main>

      <style>{`
        .wdash { min-height: 100svh; background: #F8FAFC; display: flex; flex-direction: column; }
        .wdash-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem; border-bottom: 1px solid #E2E8F0; background: #fff; position: sticky; top: 0; z-index: 10; }
        .wdash-brand { display: flex; align-items: center; gap: 0.75rem; }
        .wdash-wordmark { font-family: var(--font-display); font-size: 1.25rem; font-weight: 700; color: #1E293B; }
        .wdash-header-right { display: flex; align-items: center; gap: 1rem; }
        .wdash-email { font-size: var(--text-sm); color: #64748B; display: none; }
        @media (min-width: 600px) { .wdash-email { display: block; } }
        .wdash-signout { font-size: var(--text-sm); font-weight: 500; color: #64748B; background: none; border: 1px solid transparent; cursor: pointer; padding: 0.375rem 0.75rem; border-radius: var(--radius-md); transition: all 0.15s; }
        .wdash-signout:hover { background: #F1F5F9; border-color: #E2E8F0; color: #1E293B; }
        .wdash-main { flex: 1; padding: 2rem 1.5rem; max-width: 640px; margin: 0 auto; width: 100%; }
        .wdash-loading { display: flex; align-items: center; justify-content: center; height: 200px; }
        .wdash-spinner { width: 32px; height: 32px; border: 3px solid #E2E8F0; border-top-color: #7C3AED; border-radius: 50%; animation: wdspin 0.7s linear infinite; }
        @keyframes wdspin { to { transform: rotate(360deg); } }
        .wdash-content { display: flex; flex-direction: column; gap: 1.25rem; }
        .wdash-shop-card { background: #fff; border: 1px solid #E2E8F0; border-radius: 16px; padding: 1.75rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; flex-direction: column; gap: 1.25rem; }
        .wdash-shop-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
        .wdash-role-badge { display: inline-block; font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #7C3AED; background: rgba(124,58,237,0.08); padding: 0.2rem 0.6rem; border-radius: 999px; margin-bottom: 0.5rem; }
        .wdash-shop-name { font-family: var(--font-display); font-size: 1.5rem; font-weight: 700; color: #1E293B; margin: 0 0 0.25rem; letter-spacing: -0.02em; }
        .wdash-shop-category { font-size: var(--text-sm); color: #64748B; margin: 0; }
        .wdash-verification-badge { display: flex; align-items: center; gap: 0.375rem; font-size: var(--text-sm); font-weight: 600; white-space: nowrap; }
        .wdash-v-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .wdash-shop-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; padding-top: 1rem; border-top: 1px solid #F1F5F9; }
        .wdash-stat { display: flex; flex-direction: column; gap: 0.25rem; }
        .wdash-stat-label { font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #94A3B8; }
        .wdash-stat-value { font-size: var(--text-base); font-weight: 600; color: #1E293B; }
        .wdash-pending-notice { display: flex; align-items: flex-start; gap: 0.5rem; font-size: var(--text-sm); color: #92400E; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: var(--radius-md); padding: 0.75rem 1rem; }
        .wdash-pending-notice svg { flex-shrink: 0; margin-top: 1px; color: #F59E0B; }
        .wdash-actions { display: flex; flex-direction: column; gap: 1rem; }
        .wdash-action-card { display: flex; align-items: center; gap: 1rem; background: #fff; border: 1px solid #E2E8F0; border-radius: 12px; padding: 1.25rem; cursor: pointer; text-align: left; transition: box-shadow 0.15s, border-color 0.15s, transform 0.1s; width: 100%; }
        .wdash-action-card:hover:not(:disabled) { box-shadow: 0 4px 16px rgba(0,0,0,0.08); border-color: #CBD5E1; transform: translateY(-1px); }
        .wdash-action-card:active:not(:disabled) { transform: scale(0.99); }
        .wdash-action-card--muted { opacity: 0.55; cursor: default; }
        
        .wdash-action-card--featured {
          background: linear-gradient(135deg, #7C3AED, #8B5CF6);
          color: #fff;
          border-color: transparent;
        }
        
        .wdash-action-card--featured:hover:not(:disabled) {
          box-shadow: 0 8px 24px rgba(124,58,237,0.3);
          transform: translateY(-2px);
        }
        
        .wdash-action-card--featured .wdash-action-title,
        .wdash-action-card--featured .wdash-action-desc {
          color: #fff;
        }
        
        .wdash-action-card--featured .wdash-action-arrow {
          color: rgba(255,255,255,0.8);
        }
        
        .wdash-action-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .wdash-action-icon--purple { background: rgba(124,58,237,0.1); color: #7C3AED; }
        .wdash-action-icon--blue { background: rgba(31,78,140,0.1); color: #1F4E8C; }
        .wdash-action-icon--muted { background: #F1F5F9; color: #94A3B8; }
        .wdash-action-icon--featured {
          background: rgba(255,255,255,0.2);
          color: #fff;
        }
        
        .wdash-action-body { flex: 1; }
        .wdash-action-title { font-family: var(--font-display); font-size: var(--text-base); font-weight: 600; color: #1E293B; margin: 0 0 0.25rem; }
        .wdash-action-desc { font-size: var(--text-sm); color: #64748B; margin: 0 0 0.5rem; }
        
        .wdash-action-features {
          display: flex;
          flex-wrap: wrap;
          gap: 0.375rem;
        }
        
        .wdash-feature-chip {
          font-size: 0.6875rem;
          font-weight: 500;
          background: rgba(255,255,255,0.2);
          color: rgba(255,255,255,0.9);
          padding: 0.125rem 0.5rem;
          border-radius: 999px;
        }
        
        .wdash-action-arrow { color: #94A3B8; flex-shrink: 0; }
        .wdash-soon-badge { font-size: 0.6875rem; font-weight: 600; color: #64748B; background: #F1F5F9; padding: 0.2rem 0.6rem; border-radius: 999px; white-space: nowrap; }
        
        .wdash-action-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 0.75rem;
        }
        
        .wdash-action-grid .wdash-action-card {
          flex-direction: column;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem;
        }
        
        .wdash-action-grid .wdash-action-icon {
          width: 36px;
          height: 36px;
        }
        
        .wdash-action-grid .wdash-action-title {
          font-size: var(--text-sm);
        }
        
        .wdash-action-grid .wdash-action-desc {
          font-size: 0.75rem;
          margin: 0;
        }
        
        /* Tips Card */
        .wdash-tips-card {
          background: #fff;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 1.25rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          display: flex;
          gap: 1rem;
        }
        
        .wdash-tips-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: rgba(34,197,94,0.1);
          color: #22C55E;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        
        .wdash-tips-content {
          flex: 1;
        }
        
        .wdash-tips-title {
          font-family: var(--font-display);
          font-size: var(--text-sm);
          font-weight: 600;
          color: #1E293B;
          margin: 0 0 0.5rem;
        }
        
        .wdash-tips-list {
          margin: 0;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        
        .wdash-tips-list li {
          font-size: var(--text-sm);
          color: #64748B;
          line-height: 1.4;
          position: relative;
          padding-left: 1rem;
        }
        
        .wdash-tips-list li::before {
          content: "•";
          position: absolute;
          left: 0;
          color: #22C55E;
          font-weight: 700;
        }
        .wdash-error-state { display: flex; align-items: center; justify-content: center; height: 200px; color: #64748B; font-size: var(--text-sm); }
      `}</style>
    </div>
  );
}
