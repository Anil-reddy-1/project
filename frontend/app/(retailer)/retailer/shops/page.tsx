"use client";

/**
 * Retailer — Shop Discovery.
 * URL: /retailer/shops
 * Derived from: app-flow.md section 1.2, schema.md section 2
 *
 * Features:
 *  - List all verified shops (GET /shops)
 *  - Filter by name / category client-side
 *  - Optional geo search: detect location + radius filter (GET /shops?lat=&lng=&radiusInKm=)
 *  - Click a shop to go to its detail page /retailer/shops/[shopId]
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { API_BASE_URL } from "@/lib/firebase/config";

type Shop = {
  shopId: string;
  name: string;
  category: string;
  address: string;
  moqThreshold: number;
  verificationStatus: string;
  operatingHours: { days: string[]; open: string; close: string };
  distanceInKm?: number;
};

const RADIUS_OPTIONS = [5, 10, 20, 50] as const;

export default function RetailerShopsPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(10);

  const fetchShops = useCallback(async (lat?: number, lng?: number, radius?: number) => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const url = new URL(`${API_BASE_URL}/shops`);
      if (lat !== undefined && lng !== undefined && radius !== undefined) {
        url.searchParams.set("lat", String(lat));
        url.searchParams.set("lng", String(lng));
        url.searchParams.set("radiusInKm", String(radius));
      }
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          // Token expired, try to refresh and retry once
          const freshToken = await user.getIdToken(true);
          const retryRes = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${freshToken}` },
          });
          if (!retryRes.ok) {
            throw new Error(`Failed to fetch shops: ${retryRes.status} ${retryRes.statusText}`);
          }
          const retryData = await retryRes.json();
          setShops(retryData.shops ?? []);
          return;
        }
        throw new Error(`Failed to fetch shops: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      setShops(data.shops ?? []);
    } catch (err) {
      console.error("[ShopsPage] fetchShops:", err);
      setGeoError(`Unable to load shops. Please check your connection and try again.`);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchShops();
  }, [fetchShops]);

  async function handleDetectLocation() {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }
    setGeoLoading(true);
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserLocation({ lat, lng });
        setGeoLoading(false);
        await fetchShops(lat, lng, radiusKm);
      },
      () => {
        setGeoError("Could not get location. Please allow location access and try again.");
        setGeoLoading(false);
      }
    );
  }

  async function handleClearLocation() {
    setUserLocation(null);
    setGeoError("");
    await fetchShops();
  }

  async function handleRadiusChange(r: number) {
    setRadiusKm(r);
    if (userLocation) {
      await fetchShops(userLocation.lat, userLocation.lng, r);
    }
  }

  async function handleSignOut() {
    await logout();
    router.push("/");
  }

  const filtered = shops.filter((s) => {
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
  });

  return (
    <div className="rshops-page">
      <header className="rshops-header">
        <div className="rshops-header-left">
          <button className="rshops-back tap-target" onClick={() => router.push("/retailer")} aria-label="Back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <div className="rshops-brand">
            <svg width="22" height="22" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="10" fill="#1F4E8C"/>
              <path d="M10 28L16 12h3l4 10.5L27 12h3L20 32l-4-10L10 28z" fill="white" fillOpacity="0.95"/>
            </svg>
            <span className="rshops-wordmark">Shop Discovery</span>
          </div>
        </div>
        <button className="rshops-signout tap-target" onClick={handleSignOut}>Sign out</button>
      </header>

      <main className="rshops-main">
        {/* Search + geo bar */}
        <div className="rshops-controls">
          <div className="rshops-search-wrap">
            <svg className="rshops-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              id="rshops-search"
              type="search"
              className="rshops-search"
              placeholder="Search by name or category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="rshops-geo-bar">
            {!userLocation ? (
              <button
                className="rshops-geo-btn tap-target"
                onClick={handleDetectLocation}
                disabled={geoLoading}
              >
                {geoLoading ? (
                  <span className="rshops-mini-spinner" aria-label="Detecting…" />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                  </svg>
                )}
                Nearby shops
              </button>
            ) : (
              <div className="rshops-radius-bar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                </svg>
                <span className="rshops-radius-label">Within</span>
                {RADIUS_OPTIONS.map((r) => (
                  <button
                    key={r}
                    className={`rshops-radius-pill tap-target ${radiusKm === r ? "rshops-radius-pill--active" : ""}`}
                    onClick={() => handleRadiusChange(r)}
                  >
                    {r} km
                  </button>
                ))}
                <button className="rshops-clear-geo tap-target" onClick={handleClearLocation} aria-label="Clear location">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            )}
            {geoError && <p className="rshops-geo-error">{geoError}</p>}
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="rshops-loader" aria-label="Loading shops…">
            <div className="rshops-spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rshops-empty">
            <div className="rshops-empty-icon" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-8 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
              </svg>
            </div>
            <h2 className="rshops-empty-title">No shops found</h2>
            <p className="rshops-empty-desc">
              {search ? `No shops match "${search}". Try a different search.` : userLocation ? "No verified shops within this radius. Try a larger distance." : "No verified shops available yet."}
            </p>
          </div>
        ) : (
          <>
            <p className="rshops-count">
              {filtered.length} {filtered.length === 1 ? "shop" : "shops"}{userLocation ? ` within ${radiusKm} km` : ""}
            </p>
            <div className="rshops-grid">
              {filtered.map((shop) => (
                <button
                  key={shop.shopId}
                  className="rshops-card tap-target"
                  onClick={() => router.push(`/retailer/shops/${shop.shopId}`)}
                >
                  <div className="rshops-card-top">
                    <div className="rshops-card-avatar" aria-hidden="true">
                      {shop.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="rshops-card-meta">
                      <h3 className="rshops-shop-name">{shop.name}</h3>
                      <span className="rshops-shop-cat">{shop.category}</span>
                    </div>
                    {shop.distanceInKm !== undefined && (
                      <span className="rshops-distance">{shop.distanceInKm} km</span>
                    )}
                  </div>

                  <p className="rshops-shop-addr">{shop.address}</p>

                  <div className="rshops-card-footer">
                    <div className="rshops-card-stat">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                      </svg>
                      Min &#8377;{shop.moqThreshold.toLocaleString("en-IN")}
                    </div>
                    <div className="rshops-card-stat">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                      </svg>
                      {shop.operatingHours.open} – {shop.operatingHours.close}
                    </div>
                    <svg className="rshops-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m9 18 6-6-6-6"/>
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </main>

      <style>{`
        .rshops-page { min-height: 100svh; background: #F8FAFC; display: flex; flex-direction: column; }
        .rshops-header { display: flex; align-items: center; justify-content: space-between; padding: 0.875rem 1.5rem; border-bottom: 1px solid #E2E8F0; background: #fff; position: sticky; top: 0; z-index: 20; gap: 1rem; }
        .rshops-header-left { display: flex; align-items: center; gap: 0.75rem; }
        .rshops-back { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border: 1px solid #E2E8F0; border-radius: var(--radius-md); background: none; cursor: pointer; color: #64748B; transition: background 0.15s; }
        .rshops-back:hover { background: #F1F5F9; color: #1E293B; }
        .rshops-brand { display: flex; align-items: center; gap: 0.5rem; }
        .rshops-wordmark { font-family: var(--font-display); font-size: 1.125rem; font-weight: 700; color: #1E293B; }
        .rshops-signout { font-size: var(--text-sm); font-weight: 500; color: #64748B; background: none; border: none; cursor: pointer; padding: 0.375rem 0.5rem; border-radius: var(--radius-sm); transition: color 0.15s; }
        .rshops-signout:hover { color: #1E293B; }
        .rshops-main { flex: 1; padding: 1.5rem; max-width: 800px; margin: 0 auto; width: 100%; display: flex; flex-direction: column; gap: 1.25rem; }
        .rshops-controls { display: flex; flex-direction: column; gap: 0.75rem; }
        .rshops-search-wrap { position: relative; }
        .rshops-search-icon { position: absolute; left: 0.875rem; top: 50%; transform: translateY(-50%); color: #94A3B8; pointer-events: none; }
        .rshops-search { width: 100%; padding: 0.6875rem 0.875rem 0.6875rem 2.5rem; border: 1.5px solid #E2E8F0; border-radius: var(--radius-md); font-family: var(--font-body); font-size: var(--text-sm); color: #1E293B; background: #fff; outline: none; transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box; }
        .rshops-search:focus { border-color: #1F4E8C; box-shadow: 0 0 0 3px rgba(31,78,140,0.1); }
        .rshops-geo-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
        .rshops-geo-btn { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.5rem 0.875rem; background: #fff; border: 1.5px solid #E2E8F0; border-radius: var(--radius-md); font-family: var(--font-body); font-size: var(--text-sm); font-weight: 500; color: #1F4E8C; cursor: pointer; transition: background 0.15s, border-color 0.15s; }
        .rshops-geo-btn:hover:not(:disabled) { background: #EFF6FF; border-color: #1F4E8C; }
        .rshops-geo-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .rshops-mini-spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(31,78,140,0.2); border-top-color: #1F4E8C; border-radius: 50%; animation: rspin 0.6s linear infinite; }
        .rshops-radius-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; }
        .rshops-radius-label { font-size: var(--text-sm); color: #64748B; }
        .rshops-radius-pill { padding: 0.25rem 0.625rem; border-radius: 999px; font-family: var(--font-body); font-size: 0.75rem; font-weight: 600; border: 1.5px solid #E2E8F0; background: #fff; color: #64748B; cursor: pointer; transition: all 0.15s; }
        .rshops-radius-pill--active { background: #1F4E8C; border-color: #1F4E8C; color: #fff; }
        .rshops-clear-geo { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border: 1px solid #E2E8F0; border-radius: 50%; background: none; cursor: pointer; color: #94A3B8; transition: background 0.15s; }
        .rshops-clear-geo:hover { background: #FEF2F2; color: #EF4444; border-color: #FECACA; }
        .rshops-geo-error { font-size: 0.75rem; color: #DC2626; margin: 0; width: 100%; }
        .rshops-loader { display: flex; align-items: center; justify-content: center; height: 240px; }
        .rshops-spinner { width: 32px; height: 32px; border: 3px solid #E2E8F0; border-top-color: #1F4E8C; border-radius: 50%; animation: rspin 0.7s linear infinite; }
        @keyframes rspin { to { transform: rotate(360deg); } }
        .rshops-empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.75rem; padding: 4rem 1rem; }
        .rshops-empty-icon { width: 64px; height: 64px; border-radius: 50%; background: rgba(31,78,140,0.08); color: #1F4E8C; display: flex; align-items: center; justify-content: center; }
        .rshops-empty-title { font-family: var(--font-display); font-size: var(--text-xl); font-weight: 700; color: #1E293B; margin: 0; }
        .rshops-empty-desc { font-size: var(--text-sm); color: #64748B; margin: 0; line-height: 1.5; max-width: 300px; }
        .rshops-count { font-size: var(--text-sm); color: #94A3B8; margin: 0; }
        .rshops-grid { display: flex; flex-direction: column; gap: 0.75rem; }
        .rshops-card { display: flex; flex-direction: column; gap: 0.625rem; background: #fff; border: 1px solid #E2E8F0; border-radius: 12px; padding: 1.25rem; cursor: pointer; text-align: left; transition: box-shadow 0.15s, border-color 0.15s, transform 0.1s; width: 100%; }
        .rshops-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); border-color: #CBD5E1; transform: translateY(-1px); }
        .rshops-card:active { transform: scale(0.99); }
        .rshops-card-top { display: flex; align-items: center; gap: 0.875rem; }
        .rshops-card-avatar { width: 44px; height: 44px; border-radius: 10px; background: linear-gradient(135deg, #1F4E8C, #3B82F6); color: #fff; font-family: var(--font-display); font-size: 1.25rem; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .rshops-card-meta { flex: 1; min-width: 0; }
        .rshops-shop-name { font-family: var(--font-display); font-size: var(--text-base); font-weight: 700; color: #1E293B; margin: 0 0 0.2rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .rshops-shop-cat { font-size: 0.75rem; color: #64748B; display: inline-block; background: #F1F5F9; padding: 0.1rem 0.5rem; border-radius: 999px; }
        .rshops-distance { font-size: 0.75rem; font-weight: 700; color: #10B981; background: rgba(16,185,129,0.08); padding: 0.2rem 0.5rem; border-radius: 999px; white-space: nowrap; }
        .rshops-shop-addr { font-size: var(--text-sm); color: #64748B; margin: 0; line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .rshops-card-footer { display: flex; align-items: center; gap: 1rem; padding-top: 0.75rem; border-top: 1px solid #F1F5F9; }
        .rshops-card-stat { display: flex; align-items: center; gap: 0.3rem; font-size: 0.75rem; color: #64748B; }
        .rshops-arrow { color: #CBD5E1; margin-left: auto; flex-shrink: 0; }
      `}</style>
    </div>
  );
}
