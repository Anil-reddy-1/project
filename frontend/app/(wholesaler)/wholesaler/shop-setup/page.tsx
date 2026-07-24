"use client";

/**
 * Wholesaler Shop Setup — first-time shop creation wizard.
 * URL: /wholesaler/shop-setup
 * Derived from: app-flow.md section 2.2, schema.md section 2
 *
 * Shown when an approved wholesaler logs in without a shopId.
 * The wholesaler dashboard (page.tsx) redirects here until setup is complete.
 *
 * Flow:
 *   1. Wholesaler fills in shop details.
 *   2. POST /shops — backend creates shop doc + links shopId on user doc atomically.
 *   3. Redirect to /wholesaler (dashboard).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { API_BASE_URL } from "@/lib/firebase/config";

type FormState = "idle" | "loading" | "error" | "success";

const CATEGORIES = [
  { value: "groceries", label: "Groceries & Staples" },
  { value: "vegetables", label: "Fresh Vegetables & Fruits" },
  { value: "dairy", label: "Dairy & Eggs" },
  { value: "bakery", label: "Bakery & Bakery Goods" },
  { value: "meat_seafood", label: "Meat & Seafood" },
  { value: "beverages", label: "Beverages" },
  { value: "snacks", label: "Snacks & Confectionery" },
  { value: "household", label: "Household Supplies" },
  { value: "pharmacy", label: "Pharmacy & Healthcare" },
  { value: "electronics", label: "Electronics & Appliances" },
  { value: "clothing", label: "Clothing & Textiles" },
  { value: "hardware", label: "Hardware & Tools" },
  { value: "stationery", label: "Stationery & Packaging" },
  { value: "other", label: "Other" },
] as const;

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

export default function ShopSetupPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Shop fields
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [category, setCategory] = useState("");
  const [moqThreshold, setMoqThreshold] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("18:00");
  const [selectedDays, setSelectedDays] = useState<Set<string>>(
    new Set(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"])
  );
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  function toggleDay(day: string) {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
      }
      return next;
    });
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("Image must be smaller than 5MB");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please select a valid image file");
      return;
    }

    if (!user) return;

    try {
      const idToken = await user.getIdToken();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "shop_photos");

      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to upload image");
      }

      const data = await res.json();
      setPhotoUrl(data.url);
    } catch (err) {
      setErrorMsg("Failed to upload photo. Please try again.");
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  async function handleDetectLocation() {
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude.toFixed(6)));
        setLng(String(pos.coords.longitude.toFixed(6)));
        setErrorMsg("");
      },
      () => {
        setErrorMsg("Could not get your location. Please enter coordinates manually.");
      }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    if (selectedDays.size === 0) {
      setErrorMsg("Please select at least one operating day.");
      return;
    }

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      setErrorMsg("Latitude and longitude must be valid numbers.");
      return;
    }

    const moqNum = parseFloat(moqThreshold);
    if (isNaN(moqNum) || moqNum < 0) {
      setErrorMsg("MOQ threshold must be a non-negative number.");
      return;
    }

    if (!user) return;
    setFormState("loading");

    try {
      const idToken = await user.getIdToken();

      const res = await fetch(`${API_BASE_URL}/shops`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          name,
          address,
          lat: latNum,
          lng: lngNum,
          category,
          operatingHours: {
            days: Array.from(selectedDays),
            open: openTime,
            close: closeTime,
          },
          moqThreshold: moqNum,
          ...(photoUrl ? { photoUrl } : {}),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? "Failed to create shop. Please try again.");
      }

      setFormState("success");
      // Brief success flash, then redirect to dashboard
      setTimeout(() => router.push("/wholesaler"), 1200);
    } catch (err) {
      setErrorMsg((err as Error).message);
      setFormState("error");
    }
  }

  const isLoading = formState === "loading" || formState === "success" || isUploadingPhoto;
  const canSubmit = name && address && lat && lng && category && moqThreshold && !isLoading;

  return (
    <main className="setup-page">
      <div className="setup-bg" aria-hidden="true">
        <div className="setup-circle setup-circle--1" />
        <div className="setup-circle setup-circle--2" />
      </div>

      <div className="setup-container">
        <div className="setup-header">
          <span className="setup-badge">Shop Setup</span>
          <h1 className="setup-title">Set up your shop</h1>
          <p className="setup-subtitle">
            Complete your shop profile so retailers can find and order from you.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="setup-form">
          {/* Shop Name */}
          <div className="setup-section">
            <h2 className="setup-section-title">Basic details</h2>
            <div className="setup-field">
              <label htmlFor="setup-name" className="setup-label">Shop name *</label>
              <input
                id="setup-name"
                type="text"
                required
                className="setup-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                placeholder="e.g. Sharma General Stores"
              />
            </div>

            <div className="setup-field">
              <label htmlFor="setup-address" className="setup-label">Full address *</label>
              <textarea
                id="setup-address"
                required
                className="setup-input setup-textarea"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={isLoading}
                placeholder="Building, street, locality, city, PIN"
                rows={3}
              />
            </div>

            <div className="setup-field">
              <label htmlFor="setup-category" className="setup-label">Category *</label>
              <select
                id="setup-category"
                required
                className="setup-input setup-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isLoading}
              >
                <option value="">Select a category…</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="setup-field">
              <label htmlFor="setup-photo" className="setup-label">
                Shop photo <span className="setup-label-hint">(optional)</span>
              </label>
              <div className="setup-photo-wrapper">
                {photoUrl ? (
                  <div className="setup-photo-preview">
                    <img src={photoUrl} alt="Shop" className="setup-photo-img" />
                    <button
                      type="button"
                      className="setup-photo-remove tap-target"
                      onClick={() => setPhotoUrl("")}
                      disabled={isLoading}
                      aria-label="Remove photo"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                ) : (
                  <label htmlFor="setup-photo" className="setup-photo-upload tap-target">
                    {isUploadingPhoto ? (
                      <>
                        <span className="setup-spinner" aria-label="Uploading…" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                          <circle cx="8.5" cy="8.5" r="1.5"/>
                          <polyline points="21 15 16 10 5 21"/>
                        </svg>
                        <span>Click to upload shop photo</span>
                        <span className="setup-photo-hint">Max 5MB • JPG, PNG</span>
                      </>
                    )}
                  </label>
                )}
                <input
                  id="setup-photo"
                  type="file"
                  accept="image/*"
                  className="setup-photo-input"
                  onChange={handlePhotoUpload}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="setup-field">
              <label htmlFor="setup-moq" className="setup-label">
                Minimum order value (MOQ) * <span className="setup-label-hint">in INR</span>
              </label>
              <input
                id="setup-moq"
                type="number"
                required
                min="0"
                step="50"
                className="setup-input"
                value={moqThreshold}
                onChange={(e) => setMoqThreshold(e.target.value)}
                disabled={isLoading}
                placeholder="e.g. 1000"
              />
            </div>
          </div>

          {/* Location */}
          <div className="setup-section">
            <h2 className="setup-section-title">Location</h2>
            <p className="setup-section-sub">Used to help nearby retailers discover your shop.</p>

            <button
              type="button"
              className="setup-detect-btn tap-target"
              onClick={handleDetectLocation}
              disabled={isLoading}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
              </svg>
              Detect my location
            </button>

            <div className="setup-row">
              <div className="setup-field">
                <label htmlFor="setup-lat" className="setup-label">Latitude *</label>
                <input
                  id="setup-lat"
                  type="number"
                  step="0.000001"
                  required
                  className="setup-input"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  disabled={isLoading}
                  placeholder="12.971599"
                />
              </div>
              <div className="setup-field">
                <label htmlFor="setup-lng" className="setup-label">Longitude *</label>
                <input
                  id="setup-lng"
                  type="number"
                  step="0.000001"
                  required
                  className="setup-input"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  disabled={isLoading}
                  placeholder="77.594566"
                />
              </div>
            </div>
          </div>

          {/* Operating Hours */}
          <div className="setup-section">
            <h2 className="setup-section-title">Operating hours</h2>

            <div className="setup-field">
              <span className="setup-label">Days open</span>
              <div className="setup-days-grid">
                {DAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    className={`setup-day-btn tap-target ${selectedDays.has(day) ? "setup-day-btn--active" : ""}`}
                    onClick={() => toggleDay(day)}
                    disabled={isLoading}
                  >
                    {day.slice(0, 3).toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="setup-row">
              <div className="setup-field">
                <label htmlFor="setup-open" className="setup-label">Opening time</label>
                <input
                  id="setup-open"
                  type="time"
                  className="setup-input"
                  value={openTime}
                  onChange={(e) => setOpenTime(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="setup-field">
                <label htmlFor="setup-close" className="setup-label">Closing time</label>
                <input
                  id="setup-close"
                  type="time"
                  className="setup-input"
                  value={closeTime}
                  onChange={(e) => setCloseTime(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="setup-error" role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          {formState === "success" && (
            <div className="setup-success" role="status">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              Shop created! Redirecting…
            </div>
          )}

          <button
            id="setup-submit"
            type="submit"
            className="setup-btn tap-target"
            disabled={!canSubmit}
          >
            {formState === "loading" ? (
              <span className="setup-spinner" aria-label="Creating shop…" />
            ) : formState === "success" ? (
              "Shop created!"
            ) : (
              "Create shop"
            )}
          </button>
        </form>
      </div>

      <style>{`
        .setup-page { min-height: 100svh; background: #0B1929; display: flex; align-items: flex-start; justify-content: center; padding: 2.5rem 1.5rem 4rem; position: relative; overflow: hidden; }
        .setup-bg { position: absolute; inset: 0; pointer-events: none; }
        .setup-circle { position: absolute; border-radius: 50%; filter: blur(120px); opacity: 0.1; }
        .setup-circle--1 { width: 600px; height: 600px; background: #1F4E8C; top: -200px; left: -200px; }
        .setup-circle--2 { width: 500px; height: 500px; background: #5B4B8A; bottom: -100px; right: -150px; }
        .setup-container { width: 100%; max-width: 540px; position: relative; z-index: 1; display: flex; flex-direction: column; gap: 1.5rem; }
        .setup-header { display: flex; flex-direction: column; gap: 0.5rem; }
        .setup-badge { display: inline-block; font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #A78BFA; background: rgba(167,139,250,0.1); border: 1px solid rgba(167,139,250,0.2); padding: 0.25rem 0.625rem; border-radius: 999px; width: fit-content; }
        .setup-title { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: 700; color: #F1F5F9; margin: 0; letter-spacing: -0.02em; }
        .setup-subtitle { font-size: var(--text-sm); color: #94A3B8; margin: 0; line-height: 1.5; }
        .setup-form { display: flex; flex-direction: column; gap: 1.25rem; }
        .setup-section { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
        .setup-section-title { font-family: var(--font-display); font-size: var(--text-base); font-weight: 600; color: #E2E8F0; margin: 0; }
        .setup-section-sub { font-size: var(--text-sm); color: #64748B; margin: 0; }
        .setup-field { display: flex; flex-direction: column; gap: 0.375rem; }
        .setup-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
        .setup-label { font-size: var(--text-sm); font-weight: 500; color: #CBD5E1; }
        .setup-label-hint { font-weight: 400; color: #64748B; }
        .setup-input { width: 100%; padding: 0.6875rem 0.875rem; border: 1.5px solid rgba(255,255,255,0.1); border-radius: var(--radius-md); font-family: var(--font-body); font-size: var(--text-sm); color: #F1F5F9; background: rgba(255,255,255,0.04); outline: none; transition: border-color 0.2s, box-shadow 0.2s, background 0.2s; box-sizing: border-box; }
        .setup-input:focus { border-color: #A78BFA; box-shadow: 0 0 0 3px rgba(167,139,250,0.15); background: rgba(255,255,255,0.06); }
        .setup-input:disabled { opacity: 0.5; cursor: not-allowed; }
        .setup-input::placeholder { color: #475569; }
        .setup-textarea { resize: vertical; min-height: 80px; }
        .setup-select { cursor: pointer; }
        .setup-select option { background: #1E293B; color: #F1F5F9; }
        .setup-detect-btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: var(--radius-md); font-family: var(--font-body); font-size: var(--text-sm); font-weight: 500; color: #CBD5E1; cursor: pointer; transition: background 0.15s, border-color 0.15s; }
        .setup-detect-btn:hover:not(:disabled) { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2); }
        .setup-days-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .setup-day-btn { padding: 0.375rem 0.75rem; border-radius: var(--radius-sm); font-family: var(--font-body); font-size: 0.75rem; font-weight: 600; border: 1.5px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: #64748B; cursor: pointer; transition: all 0.15s; }
        .setup-day-btn--active { background: rgba(167,139,250,0.15); border-color: #A78BFA; color: #A78BFA; }
        .setup-day-btn:hover:not(:disabled):not(.setup-day-btn--active) { border-color: rgba(255,255,255,0.2); color: #CBD5E1; }
        .setup-error { display: flex; align-items: flex-start; gap: 0.5rem; font-size: var(--text-sm); color: #FCA5A5; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); border-radius: var(--radius-md); padding: 0.75rem 1rem; }
        .setup-error svg { flex-shrink: 0; margin-top: 1px; color: #F87171; }
        .setup-success { display: flex; align-items: center; gap: 0.5rem; font-size: var(--text-sm); color: #6EE7B7; background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.2); border-radius: var(--radius-md); padding: 0.75rem 1rem; }
        .setup-btn { display: flex; align-items: center; justify-content: center; width: 100%; padding: 0.875rem 1.25rem; background: linear-gradient(135deg, #4C1D95 0%, #7C3AED 100%); color: #fff; border: none; border-radius: var(--radius-md); font-family: var(--font-body); font-size: var(--text-base); font-weight: 600; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s; box-shadow: 0 2px 8px rgba(109,40,217,0.3); }
        .setup-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(109,40,217,0.4); }
        .setup-btn:active:not(:disabled) { transform: scale(0.98); }
        .setup-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .setup-spinner { display: block; width: 1.25rem; height: 1.25rem; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: sspin 0.7s linear infinite; }
        @keyframes sspin { to { transform: rotate(360deg); } }
        .setup-photo-wrapper { position: relative; }
        .setup-photo-input { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border-width: 0; }
        .setup-photo-upload { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; min-height: 140px; border: 2px dashed rgba(255,255,255,0.15); border-radius: var(--radius-md); background: rgba(255,255,255,0.02); color: #94A3B8; font-size: var(--text-sm); cursor: pointer; transition: all 0.2s; }
        .setup-photo-upload:hover:not(:disabled) { border-color: rgba(167,139,250,0.4); background: rgba(255,255,255,0.04); }
        .setup-photo-hint { font-size: 0.75rem; color: #64748B; }
        .setup-photo-preview { position: relative; width: 100%; max-width: 240px; aspect-ratio: 16/9; border-radius: var(--radius-md); overflow: hidden; }
        .setup-photo-img { width: 100%; height: 100%; object-fit: cover; }
        .setup-photo-remove { position: absolute; top: 0.5rem; right: 0.5rem; width: 2rem; height: 2rem; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.7); border: none; border-radius: 50%; color: #FCA5A5; cursor: pointer; transition: all 0.2s; }
        .setup-photo-remove:hover:not(:disabled) { background: rgba(239,68,68,0.9); color: #fff; transform: scale(1.1); }
      `}</style>
    </main>
  );
}
