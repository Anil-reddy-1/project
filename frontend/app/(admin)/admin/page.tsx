"use client";

/**
 * Admin Dashboard — Home.
 * URL: /admin
 * PHASE 2.5: Updated for Single-Shop Architecture
 * 
 * Admin has full control over:
 * - THE single shop (name, details, items)
 * - THE single wholesaler (view only, can suspend)
 * - All orders, deliveries, payments
 * - Platform insights and analytics
 * 
 * Tabs: Shop | Orders | Users | Deliveries | Payments | Insights
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { getFirebaseAuth } from "@/lib/firebase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ─── Types (matching schema.md §1) ───────────────────────────────────────────

interface UserRecord {
  uid: string;
  role: string;
  status: string;
  name: string;
  phone: string;
  email?: string;
  createdBy?: string;
  createdAt?: { seconds: number } | string;
}

interface ShopRecord {
  shopId: string;
  name: string;
  category: string;
  address: string;
  verificationStatus: "pending" | "verified" | "rejected";
  ownerUid: string;
  moqThreshold: number;
  operatingHours: { days: string[]; open: string; close: string };
  createdAt?: { seconds: number } | string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminHomePage() {
  const router = useRouter();
  const { logout, user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<"shop" | "orders" | "users" | "deliveries" | "payments" | "insights">(
    "shop",
  );
  const [userSubTab, setUserSubTab] = useState<"retailers" | "wholesaler" | "delivery">("wholesaler");
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [shops, setShops] = useState<ShopRecord[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<{type: "success" | "error", text: string} | null>(null);

  // Create Account modal state
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalName, setModalName] = useState("");
  const [modalEmail, setModalEmail] = useState("");
  const [modalPhone, setModalPhone] = useState("");
  const [modalRole, setModalRole] = useState<"wholesaler" | "delivery_partner">("wholesaler");
  const [modalError, setModalError] = useState("");

  const TAB_ROLE: Record<string, string> = {
    retailers: "retailer",
    wholesaler: "wholesaler",
    delivery: "delivery_partner",
  };

  const fetchUsers = useCallback(async () => {
    if (!user || activeTab !== "users") return;

    setLoading(true);
    setActionMsg(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch(
        `${API_URL}/users?role=${TAB_ROLE[userSubTab]}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch (err) {
      setActionMsg({ type: "error", text: "Failed to load users. Check console." });
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, userSubTab, user]);

  const fetchShops = useCallback(async () => {
    if (!user || activeTab !== "shop") return;

    setLoading(true);
    setActionMsg(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch(
        `${API_URL}/shops`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error("Failed to fetch shop");
      const data = await res.json();
      setShops(data.shops ?? []);
    } catch (err) {
      setActionMsg({ type: "error", text: "Failed to load shop. Check console." });
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, user]);

  const fetchOrders = useCallback(async () => {
    if (!user || activeTab !== "orders") return;

    setLoading(true);
    setActionMsg(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch(
        `${API_URL}/orders`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      setOrders(data.data ?? []);
    } catch (err) {
      setActionMsg({ type: "error", text: "Failed to load orders. Check console." });
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, user]);

  useEffect(() => { 
    if (activeTab === "shop") {
      fetchShops();
    } else if (activeTab === "users") {
      fetchUsers();
    } else if (activeTab === "orders") {
      fetchOrders();
    }
  }, [fetchUsers, fetchShops, fetchOrders, activeTab]);

  async function handleSuspend(uid: string) {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_URL}/auth/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ uid }),
      });
      if (!res.ok) throw new Error("Suspend failed");
      setActionMsg({ type: "success", text: "Account suspended successfully." });
      fetchUsers();
    } catch (err) {
      setActionMsg({ type: "error", text: "Action failed. Check console." });
      console.error(err);
    }
  }

  async function handleReactivate(uid: string) {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_URL}/auth/reactivate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ uid }),
      });
      if (!res.ok) throw new Error("Reactivate failed");
      setActionMsg({ type: "success", text: "Account reactivated successfully." });
      fetchUsers();
    } catch (err) {
      setActionMsg({ type: "error", text: "Action failed. Check console." });
      console.error(err);
    }
  }

  async function handleApprove(uid: string) {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_URL}/auth/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ uid }),
      });
      if (!res.ok) throw new Error("Approve failed");
      setActionMsg({ type: "success", text: "Account approved. The wholesaler can now log in." });
      fetchUsers();
    } catch (err) {
      setActionMsg({ type: "error", text: "Approval failed. Check console." });
      console.error(err);
    }
  }

  async function handleReject(uid: string) {
    if (!confirm("Are you sure you want to reject this request? The account will be deleted and the wholesaler will need to re-apply.")) return;
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_URL}/auth/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ uid }),
      });
      if (!res.ok) throw new Error("Reject failed");
      setActionMsg({ type: "success", text: "Account rejected. The user has been removed and can re-apply." });
      fetchUsers();
    } catch (err) {
      setActionMsg({ type: "error", text: "Reject failed. Check console." });
      console.error(err);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setModalLoading(true);
    setModalError("");
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_URL}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: modalName, email: modalEmail, phone: modalPhone, role: modalRole }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message ?? "Creation failed");
      setShowModal(false);
      setModalName(""); setModalEmail(""); setModalPhone(""); setModalRole("wholesaler"); setModalError("");
      setActionMsg({ type: "success", text: `Account created for ${modalName}. A password reset link has been sent to ${modalEmail}.` });
      fetchUsers();
    } catch (err) {
      setModalError((err as Error).message ?? "Something went wrong.");
    } finally {
      setModalLoading(false);
    }
  }

  async function handleVerifyShop(shopId: string) {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_URL}/shops/${shopId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ verificationStatus: "verified" }),
      });
      if (!res.ok) throw new Error("Verification failed");
      setActionMsg({ type: "success", text: "Shop verified successfully. It will now be discoverable by retailers." });
      fetchShops();
    } catch (err) {
      setActionMsg({ type: "error", text: "Verification failed. Check console." });
      console.error(err);
    }
  }

  async function handleRejectShop(shopId: string) {
    if (!confirm("Are you sure you want to reject this shop? The wholesaler will need to update their shop details and resubmit for verification.")) return;
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_URL}/shops/${shopId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ verificationStatus: "rejected" }),
      });
      if (!res.ok) throw new Error("Rejection failed");
      setActionMsg({ type: "success", text: "Shop rejected. The wholesaler has been notified." });
      fetchShops();
    } catch (err) {
      setActionMsg({ type: "error", text: "Rejection failed. Check console." });
      console.error(err);
    }
  }

  async function handleSignOut() {
    await logout();
    router.push("/");
  }

  return (
    <div className="admin">
      <header className="admin-header">
        <div className="header-brand">
          <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="10" fill="#1F4E8C"/>
            <path d="M10 28L16 12h3l4 10.5L27 12h3L20 32l-4-10L10 28z" fill="white" fillOpacity="0.95"/>
          </svg>
          <span className="admin-wordmark">WholesaleHub <span className="admin-wordmark-badge">Admin</span></span>
        </div>
        <div className="header-actions">
          <span className="user-email">{user?.email}</span>
          <button id="admin-signout" onClick={handleSignOut} className="admin-signout tap-target">
            Sign out
          </button>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-page-header">
          <div className="admin-page-header-row">
            <div>
              <h1 className="admin-page-title">
                {activeTab === "shop" && "Shop Management"}
                {activeTab === "orders" && "Orders"}
                {activeTab === "users" && "Users"}
                {activeTab === "deliveries" && "Deliveries"}
                {activeTab === "payments" && "Payments"}
                {activeTab === "insights" && "Insights"}
              </h1>
              <p className="admin-page-sub">
                {activeTab === "shop" && "Manage THE shop - name, details, inventory, and settings."}
                {activeTab === "orders" && "View and manage all orders across the platform."}
                {activeTab === "users" && "Manage retailers, the wholesaler, and delivery partners."}
                {activeTab === "deliveries" && "Track active deliveries and delivery partner performance."}
                {activeTab === "payments" && "Monitor payments, settlements, and financial transactions."}
                {activeTab === "insights" && "Platform analytics, metrics, and business intelligence."}
              </p>
            </div>
            {activeTab === "users" && userSubTab !== "wholesaler" && (
              <button
                id="admin-create-account"
                className="admin-btn admin-btn--primary"
                onClick={() => setShowModal(true)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Create Account
              </button>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="admin-tabs-container">
          <div className="admin-tabs" role="tablist">
            {(["shop", "orders", "users", "deliveries", "payments", "insights"] as const).map((tab) => (
              <button
                key={tab}
                id={`admin-tab-${tab}`}
                role="tab"
                aria-selected={activeTab === tab}
                className={`admin-tab ${activeTab === tab ? "admin-tab--active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Action feedback */}
        {actionMsg && (
          <div className={`admin-action-msg admin-action-msg--${actionMsg.type}`} role="status">
            {actionMsg.type === "success" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            )}
            <span>{actionMsg.text}</span>
            <button className="admin-action-close" onClick={() => setActionMsg(null)} aria-label="Dismiss">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        )}

        {/* User/Shop/Order content */}
        <div className="admin-card">
          {loading ? (
            <div className="admin-loading">
              <span className="admin-spinner" />
              <span>Loading...</span>
            </div>
          ) : activeTab === "shop" ? (
            // Shop Management Section
            shops.length === 0 ? (
              <div className="admin-empty">
                <div className="admin-empty-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  </svg>
                </div>
                <p>No shop found. Run the seed script to create the shop.</p>
              </div>
            ) : (
              <div style={{ padding: "1.5rem" }}>
                <div className="shop-info-card">
                  <h3 className="shop-info-title">{shops[0].name}</h3>
                  <div className="shop-info-grid">
                    <div className="shop-info-item">
                      <span className="shop-info-label">Category</span>
                      <span className="shop-info-value">{shops[0].category}</span>
                    </div>
                    <div className="shop-info-item">
                      <span className="shop-info-label">Address</span>
                      <span className="shop-info-value">{shops[0].address}</span>
                    </div>
                    <div className="shop-info-item">
                      <span className="shop-info-label">MOQ Threshold</span>
                      <span className="shop-info-value">₹{shops[0].moqThreshold.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="shop-info-item">
                      <span className="shop-info-label">Status</span>
                      <span className={`admin-badge admin-badge--${shops[0].verificationStatus === "verified" ? "active" : "pending_approval"}`}>
                        {shops[0].verificationStatus}
                      </span>
                    </div>
                  </div>
                  <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem" }}>
                    <button
                      className="admin-btn admin-btn--primary"
                      onClick={() => router.push(`/wholesaler/shop-setup`)}
                    >
                      Edit Shop Details
                    </button>
                    <button
                      className="admin-btn admin-btn--ghost"
                      onClick={() => router.push(`/wholesaler/catalog`)}
                    >
                      Manage Items
                    </button>
                  </div>
                </div>
              </div>
            )
          ) : activeTab === "orders" ? (
            // Orders Section
            orders.length === 0 ? (
              <div className="admin-empty">
                <div className="admin-empty-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                  </svg>
                </div>
                <p>No orders yet.</p>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Retailer</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Payment</th>
                      <th className="admin-table-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.orderId}>
                        <td className="font-data">{order.orderNumber}</td>
                        <td>{order.retailerSnapshot?.name || "Unknown"}</td>
                        <td className="font-data">₹{order.grandTotal?.toLocaleString("en-IN")}</td>
                        <td>
                          <span className={`admin-badge admin-badge--${order.state?.toLowerCase().replace('_', '')}`}>
                            {order.state}
                          </span>
                        </td>
                        <td>
                          <span className={`admin-badge admin-badge--${order.paymentStatus === 'completed' ? 'active' : 'pending_approval'}`}>
                            {order.paymentStatus}
                          </span>
                        </td>
                        <td className="admin-table-actions">
                          <button
                            className="admin-btn admin-btn--ghost"
                            onClick={() => router.push(`/admin/orders/${order.orderId}`)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : activeTab === "users" ? (
            // Users Section with sub-tabs
            <div>
              <div className="admin-subtabs">
                {(["wholesaler", "retailers", "delivery"] as const).map((tab) => (
                  <button
                    key={tab}
                    className={`admin-subtab ${userSubTab === tab ? "admin-subtab--active" : ""}`}
                    onClick={() => setUserSubTab(tab)}
                  >
                    {tab === "wholesaler" ? "Wholesaler" : tab === "delivery" ? "Delivery Partners" : "Retailers"}
                  </button>
                ))}
              </div>
              {users.length === 0 ? (
            <div className="admin-empty">
              <div className="admin-empty-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <p>No {userSubTab} found.</p>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Contact</th>
                    <th>Status</th>
                    <th className="admin-table-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.uid}>
                      <td className="admin-cell-user">
                        <div className="admin-user-avatar">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="admin-user-info">
                          <span className="admin-user-name">{u.name}</span>
                          <span className="admin-user-id font-data">{u.uid.substring(0, 8)}…</span>
                        </div>
                      </td>
                      <td className="admin-cell-contact">
                        <span className="admin-contact-item font-data">{u.email ?? "—"}</span>
                        <span className="admin-contact-item font-data">{u.phone}</span>
                      </td>
                      <td>
                        <span className={`admin-badge admin-badge--${u.status}`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="admin-table-actions">
                        {userSubTab === "wholesaler" ? (
                          // Wholesaler: Read-only, can only suspend
                          u.status === "active" ? (
                            <button
                              id={`admin-suspend-${u.uid}`}
                              className="admin-btn admin-btn--danger"
                              onClick={() => handleSuspend(u.uid)}
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              id={`admin-reactivate-${u.uid}`}
                              className="admin-btn admin-btn--primary"
                              onClick={() => handleReactivate(u.uid)}
                            >
                              Reactivate
                            </button>
                          )
                        ) : u.status === "active" ? (
                          <button
                            id={`admin-suspend-${u.uid}`}
                            className="admin-btn admin-btn--danger"
                            onClick={() => handleSuspend(u.uid)}
                          >
                            Suspend
                          </button>
                        ) : u.status === "suspended" ? (
                          <button
                            id={`admin-reactivate-${u.uid}`}
                            className="admin-btn admin-btn--primary"
                            onClick={() => handleReactivate(u.uid)}
                          >
                            Reactivate
                          </button>
                        ) : u.status === "pending_approval" ? (
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button
                              id={`admin-approve-${u.uid}`}
                              className="admin-btn admin-btn--approve"
                              onClick={() => handleApprove(u.uid)}
                            >
                              Approve
                            </button>
                            <button
                              id={`admin-reject-${u.uid}`}
                              className="admin-btn admin-btn--danger"
                              onClick={() => handleReject(u.uid)}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="admin-no-actions">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
            </div>
          ) : activeTab === "deliveries" ? (
            // Deliveries Section
            <div className="admin-empty">
              <div className="admin-empty-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="3" width="15" height="13"/>
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                  <circle cx="5.5" cy="18.5" r="2.5"/>
                  <circle cx="18.5" cy="18.5" r="2.5"/>
                </svg>
              </div>
              <p>Delivery tracking coming in Phase 5+</p>
            </div>
          ) : activeTab === "payments" ? (
            // Payments Section
            <div className="admin-empty">
              <div className="admin-empty-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                  <line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
              </div>
              <p>Payment analytics coming in Phase 7+</p>
            </div>
          ) : activeTab === "insights" ? (
            // Insights Section
            <div className="admin-empty">
              <div className="admin-empty-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="20" x2="12" y2="10"/>
                  <line x1="18" y1="20" x2="18" y2="4"/>
                  <line x1="6" y1="20" x2="6" y2="16"/>
                </svg>
              </div>
              <p>Business insights coming in Phase 9+</p>
            </div>
          ) : null}
        </div>
      </main>

      {/* ── Create Account Modal ── */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="modal-title" className="modal-title">Create Account</h2>
              <button className="modal-close" onClick={() => setShowModal(false)} aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <p className="modal-sub">Provision a wholesaler or delivery partner account. A password reset link will be sent to their email.</p>
            <form onSubmit={handleCreateUser} className="modal-form">
              <div className="modal-field">
                <label htmlFor="modal-name" className="modal-label">Full name *</label>
                <input id="modal-name" type="text" required className="modal-input" value={modalName} onChange={e => setModalName(e.target.value)} disabled={modalLoading} placeholder="Full name" />
              </div>
              <div className="modal-field">
                <label htmlFor="modal-email" className="modal-label">Email address *</label>
                <input id="modal-email" type="email" required className="modal-input" value={modalEmail} onChange={e => setModalEmail(e.target.value)} disabled={modalLoading} placeholder="email@example.com" />
              </div>
              <div className="modal-field">
                <label htmlFor="modal-phone" className="modal-label">Phone number *</label>
                <input id="modal-phone" type="tel" required className="modal-input" value={modalPhone} onChange={e => setModalPhone(e.target.value)} disabled={modalLoading} placeholder="+91 98765 43210" />
              </div>
              <div className="modal-field">
                <label htmlFor="modal-role" className="modal-label">Role *</label>
                <select id="modal-role" className="modal-input modal-select" value={modalRole} onChange={e => setModalRole(e.target.value as "wholesaler" | "delivery_partner")} disabled={modalLoading}>
                  <option value="wholesaler">Wholesaler</option>
                  <option value="delivery_partner">Delivery Partner</option>
                </select>
              </div>
              {modalError && (
                <div className="modal-error" role="alert">{modalError}</div>
              )}
              <div className="modal-actions">
                <button type="button" className="admin-btn admin-btn--ghost" onClick={() => setShowModal(false)} disabled={modalLoading}>Cancel</button>
                <button id="modal-submit" type="submit" className="admin-btn admin-btn--primary" disabled={modalLoading || !modalName || !modalEmail || !modalPhone}>
                  {modalLoading ? "Creating…" : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .admin { 
          min-height: 100svh; 
          background: var(--color-paper); 
          display: flex; 
          flex-direction: column; 
        }

        .admin-header {
          display: flex; 
          align-items: center; 
          justify-content: space-between;
          padding: 1rem 1.5rem; 
          border-bottom: 1px solid var(--color-line); 
          background: #fff;
          position: sticky;
          top: 0;
          z-index: 20;
        }
        
        .header-brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .admin-wordmark {
          font-family: var(--font-display); 
          font-size: 1.25rem;
          font-weight: 700; 
          color: var(--color-ink);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .admin-wordmark-badge {
          font-family: var(--font-body);
          font-size: 0.6875rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          background: var(--color-ink);
          color: #fff;
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
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
        
        .admin-signout {
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
        
        .admin-signout:hover { 
          background: var(--color-paper); 
          border-color: var(--color-line);
          color: var(--color-ink);
        }

        .admin-main { 
          flex: 1; 
          padding: 2.5rem 1.5rem; 
          max-width: 1040px; 
          margin: 0 auto; 
          width: 100%; 
        }

        .admin-page-header { margin-bottom: 2rem; }
        .admin-page-title {
          font-family: var(--font-display); 
          font-size: var(--text-2xl);
          font-weight: 700; 
          color: var(--color-ink); 
          margin: 0 0 0.5rem;
          letter-spacing: -0.02em;
        }
        .admin-page-sub { 
          font-size: var(--text-base); 
          color: var(--color-ink-muted); 
          margin: 0; 
          max-width: 600px;
          line-height: 1.5;
        }

        .admin-page-header-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }

        /* ── Modal ── */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          animation: fadeIn 0.15s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal {
          background: #fff;
          border-radius: var(--radius-lg);
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
          width: 100%;
          max-width: 440px;
          padding: 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          animation: slideUp 0.2s ease;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .modal-title {
          font-family: var(--font-display);
          font-size: var(--text-xl);
          font-weight: 700;
          color: var(--color-ink);
          margin: 0;
          letter-spacing: -0.01em;
        }

        .modal-close {
          background: none;
          border: none;
          color: var(--color-ink-muted);
          cursor: pointer;
          padding: 0.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-sm);
          transition: background 0.15s, color 0.15s;
        }

        .modal-close:hover { background: var(--color-paper); color: var(--color-ink); }

        .modal-sub {
          font-size: var(--text-sm);
          color: var(--color-ink-muted);
          margin: 0;
          line-height: 1.5;
        }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .modal-field {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }

        .modal-label {
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--color-ink);
        }

        .modal-input {
          width: 100%;
          padding: 0.625rem 0.875rem;
          border: 1.5px solid var(--color-line);
          border-radius: var(--radius-md);
          font-family: var(--font-body);
          font-size: var(--text-sm);
          color: var(--color-ink);
          background: #fff;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          box-sizing: border-box;
        }

        .modal-input:focus {
          border-color: var(--color-signal);
          box-shadow: 0 0 0 3px rgba(31,78,140,0.1);
        }

        .modal-select { cursor: pointer; }

        .modal-error {
          font-size: var(--text-sm);
          color: #e11d48;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: var(--radius-md);
          padding: 0.625rem 0.875rem;
        }

        .modal-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
          margin-top: 0.5rem;
        }

        .admin-tabs-container {
          border-bottom: 1px solid var(--color-line);
          margin-bottom: 1.5rem;
        }
        
        .admin-tabs { 
          display: flex; 
          gap: 1.5rem; 
          overflow-x: auto;
          scrollbar-width: none;
        }
        
        .admin-tabs::-webkit-scrollbar { display: none; }
        
        .admin-tab {
          font-family: var(--font-body);
          font-size: var(--text-sm); 
          font-weight: 500; 
          color: var(--color-ink-muted);
          background: none; 
          border: none; 
          border-bottom: 2px solid transparent;
          padding: 0.75rem 0.25rem; 
          cursor: pointer; 
          margin-bottom: -1px;
          transition: color 0.15s, border-color 0.15s;
          white-space: nowrap;
        }
        .admin-tab:hover { color: var(--color-ink); }
        .admin-tab--active { 
          color: var(--color-signal); 
          border-bottom-color: var(--color-signal); 
          font-weight: 600;
        }

        .admin-action-msg {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: var(--text-sm); 
          border-radius: var(--radius-md); 
          padding: 0.75rem 1rem;
          margin-bottom: 1.5rem;
          animation: slideIn 0.3s ease-out;
        }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .admin-action-msg--success {
          color: #065f46;
          background: #ecfdf5; 
          border: 1px solid #a7f3d0;
        }
        
        .admin-action-msg--error {
          color: #991b1b;
          background: #fef2f2; 
          border: 1px solid #fecaca;
        }
        
        .admin-action-close {
          margin-left: auto;
          background: none;
          border: none;
          color: inherit;
          opacity: 0.6;
          cursor: pointer;
          padding: 0.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-sm);
        }
        
        .admin-action-close:hover {
          opacity: 1;
          background: rgba(0,0,0,0.05);
        }

        .admin-card {
          background: #fff;
          border: 1px solid var(--color-line);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm);
          overflow: hidden;
        }

        .admin-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: 4rem 2rem;
          color: var(--color-ink-muted);
          font-size: var(--text-sm);
        }
        
        .admin-spinner {
          width: 24px;
          height: 24px;
          border: 2px solid var(--color-line);
          border-top-color: var(--color-signal);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        
        .admin-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: 4rem 2rem;
          color: var(--color-ink-muted);
          font-size: var(--text-sm);
        }
        
        .admin-empty-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: var(--color-paper);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
        }

        .admin-table-wrap { 
          overflow-x: auto; 
        }
        
        .admin-table { 
          width: 100%; 
          border-collapse: collapse; 
          font-size: var(--text-sm); 
          text-align: left;
        }
        
        .admin-table th {
          font-weight: 600; 
          color: var(--color-ink-muted);
          padding: 1rem 1.25rem; 
          background: #f8fafc;
          border-bottom: 1px solid var(--color-line); 
          white-space: nowrap;
        }
        
        .admin-table td {
          padding: 1rem 1.25rem; 
          border-bottom: 1px solid var(--color-line);
          vertical-align: middle;
        }
        
        .admin-table tr:last-child td { border-bottom: none; }
        .admin-table tr:hover td { background: #f8fafc; }
        
        .admin-cell-user {
          display: flex;
          align-items: center;
          gap: 0.875rem;
        }
        
        .admin-user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #e2e8f0;
          color: #475569;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.875rem;
          flex-shrink: 0;
        }
        
        .admin-user-info {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }
        
        .admin-user-name {
          font-weight: 500;
          color: var(--color-ink);
        }
        
        .admin-user-id {
          font-size: 0.75rem;
          color: var(--color-ink-muted);
        }
        
        .admin-cell-contact {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        
        .admin-contact-item {
          color: var(--color-ink);
        }

        .admin-badge {
          display: inline-flex; 
          align-items: center;
          font-size: 0.75rem; 
          font-weight: 600;
          text-transform: uppercase; 
          letter-spacing: 0.06em;
          padding: 0.25rem 0.625rem; 
          border-radius: var(--radius-pill);
        }
        .admin-badge--active { color: #059669; background: #d1fae5; }
        .admin-badge--suspended { color: #e11d48; background: #ffe4e6; }
        .admin-badge--pending_approval { color: #d97706; background: #fef3c7; }

        .admin-table-actions { 
          text-align: right; 
          white-space: nowrap; 
        }
        
        .admin-btn {
          font-family: var(--font-body);
          font-size: 0.75rem; 
          font-weight: 600; 
          padding: 0.375rem 0.875rem;
          border-radius: var(--radius-sm); 
          border: none; 
          cursor: pointer;
          transition: all 0.15s;
        }
        
        .admin-btn:hover { transform: translateY(-1px); }
        .admin-btn:active { transform: scale(0.96); }
        
        .admin-btn--primary { 
          background: var(--color-signal); 
          color: #fff; 
          box-shadow: 0 1px 2px rgba(31,78,140,0.2);
        }
        .admin-btn--primary:hover { background: #173f70; }
        
        .admin-btn--danger { 
          background: #fff; 
          color: #e11d48; 
          border: 1px solid #fecaca;
        }
        .admin-btn--danger:hover { 
          background: #fff1f2; 
          border-color: #fda4af;
        }
        
        .admin-btn--approve {
          background: #fff;
          color: #059669;
          border: 1px solid #a7f3d0;
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
        }
        .admin-btn--approve:hover {
          background: #ecfdf5;
          border-color: #6ee7b7;
        }

        .admin-btn--ghost {
          background: none;
          color: var(--color-ink-muted);
          border: 1px solid var(--color-line);
        }
        .admin-btn--ghost:hover {
          background: var(--color-paper);
          color: var(--color-ink);
        }
        
        .admin-no-actions {
          color: var(--color-ink-muted);
          font-size: var(--text-sm);
        }

        /* ── Shop Info Card ── */
        .shop-info-card {
          background: #fff;
          border-radius: var(--radius-md);
          padding: 0;
        }

        .shop-info-title {
          font-family: var(--font-display);
          font-size: var(--text-xl);
          font-weight: 700;
          color: var(--color-ink);
          margin: 0 0 1.25rem;
          letter-spacing: -0.01em;
        }

        .shop-info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.25rem;
        }

        .shop-info-item {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }

        .shop-info-label {
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--color-ink-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .shop-info-value {
          font-size: var(--text-base);
          font-weight: 500;
          color: var(--color-ink);
        }

        /* ── Admin Subtabs ── */
        .admin-subtabs {
          display: flex;
          gap: 0.5rem;
          padding: 1rem 1.25rem;
          background: #f8fafc;
          border-bottom: 1px solid var(--color-line);
        }

        .admin-subtab {
          font-family: var(--font-body);
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--color-ink-muted);
          background: none;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.15s;
        }

        .admin-subtab:hover {
          background: rgba(31,78,140,0.08);
          color: var(--color-ink);
        }

        .admin-subtab--active {
          background: var(--color-signal);
          color: #fff;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
