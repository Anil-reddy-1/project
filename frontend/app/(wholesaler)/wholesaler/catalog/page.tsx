"use client";

/**
 * Wholesaler Catalog — item management dashboard.
 * URL: /wholesaler/catalog
 * Derived from: app-flow.md section 2.4, schema.md section 3
 *
 * Features:
 *  - List all items for the wholesaler's shop (owner sees ALL items incl. unavailable)
 *  - Add a new item via inline modal
 *  - Toggle availability (show/hide from retailers without deleting)
 *  - Edit price / stock via inline modal
 *  - Delete item (with confirmation)
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { API_BASE_URL } from "@/lib/firebase/config";

type Item = {
  itemId: string;
  name: string;
  price: number;
  stockQty: number;
  unit: string;
  isAvailable: boolean;
  images?: Array<{ url: string; publicId: string }>;
};

type ModalMode = "add" | "edit";
type ModalState = { mode: ModalMode; item?: Item } | null;

const UNITS = ["kg", "g", "litre", "ml", "box", "carton", "pack", "unit", "dozen", "piece"] as const;

export default function WholesalerCatalogPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [shopId, setShopId] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Form state for add/edit modal
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formStock, setFormStock] = useState("");
  const [formUnit, setFormUnit] = useState("kg");
  const [formImages, setFormImages] = useState<Array<{ url: string; publicId: string }>>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function getToken() {
    if (!user) {
      throw new Error("User not authenticated");
    }
    return user.getIdToken();
  }

  const fetchItems = useCallback(async (sid: string) => {
    if (!user) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/shops/${sid}/items`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch items");
      const data = await res.json();
      setItems(data.items ?? []);
    } catch (err) {
      console.error("[CatalogPage] fetchItems:", err);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    async function init() {
      setLoading(true);
      try {
        const token = await getToken();
        const userRes = await fetch(`${API_BASE_URL}/users/${user!.uid}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!userRes.ok) throw new Error("Could not load user");
        const userData = await userRes.json();

        if (!userData.user?.shopId) {
          router.replace("/wholesaler/shop-setup");
          return;
        }

        setShopId(userData.user.shopId);
        await fetchItems(userData.user.shopId);
      } catch (err) {
        console.error("[CatalogPage] init:", err);
      } finally {
        setLoading(false);
      }
    }

    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function openAddModal() {
    setFormName("");
    setFormPrice("");
    setFormStock("");
    setFormUnit("kg");
    setFormImages([]);
    setActionError("");
    setModal({ mode: "add" });
  }

  function openEditModal(item: Item) {
    setFormName(item.name);
    setFormPrice(String(item.price));
    setFormStock(String(item.stockQty));
    setFormUnit(item.unit);
    setFormImages(item.images ?? []);
    setActionError("");
    setModal({ mode: "edit", item });
  }

  function closeModal() {
    if (submitting) return;
    setModal(null);
    setActionError("");
  }

  async function handleImageUpload(files: FileList) {
    if (!files.length || uploadingImages || !user) return;
    
    // Validate file types and sizes
    const maxFileSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const maxFiles = 10;
    
    const validFiles = Array.from(files).filter(file => {
      if (!allowedTypes.includes(file.type)) {
        setActionError(`File "${file.name}" is not a valid image type. Please use JPEG, PNG, WebP, or GIF.`);
        return false;
      }
      if (file.size > maxFileSize) {
        setActionError(`File "${file.name}" is too large. Maximum size is 5MB.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;
    
    if (formImages.length + validFiles.length > maxFiles) {
      setActionError(`You can only upload up to ${maxFiles} images per product.`);
      return;
    }
    
    setUploadingImages(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      
      // Add validated files
      validFiles.forEach((file) => {
        formData.append("files", file);
      });

      const res = await fetch(`${API_BASE_URL}/upload/multiple?folder=product_images`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message ?? "Upload failed");
      }

      const data = await res.json();
      setFormImages(prev => [...prev, ...data.files]);
      setActionError(""); // Clear any previous errors
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setUploadingImages(false);
    }
  }

  function removeImage(index: number) {
    setFormImages(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmitModal(e: React.FormEvent) {
    e.preventDefault();
    if (!shopId || submitting || !user) return;
    setActionError("");

    const priceNum = parseFloat(formPrice);
    const stockNum = parseInt(formStock, 10);

    if (isNaN(priceNum) || priceNum < 0) {
      setActionError("Price must be a non-negative number.");
      return;
    }
    if (isNaN(stockNum) || stockNum < 0) {
      setActionError("Stock qty must be a non-negative integer.");
      return;
    }

    setSubmitting(true);
    try {
      const token = await getToken();

      if (modal!.mode === "add") {
        const res = await fetch(`${API_BASE_URL}/shops/${shopId}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ 
            name: formName, 
            price: priceNum, 
            stockQty: stockNum, 
            unit: formUnit,
            images: formImages
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message ?? "Failed to add item.");
        }
      } else {
        const itemId = modal!.item!.itemId;
        const res = await fetch(`${API_BASE_URL}/shops/${shopId}/items/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ 
            name: formName, 
            price: priceNum, 
            stockQty: stockNum, 
            unit: formUnit,
            images: formImages
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message ?? "Failed to update item.");
        }
      }

      await fetchItems(shopId);
      setModal(null);
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleAvailability(item: Item) {
    if (!shopId || !user) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/shops/${shopId}/items/${item.itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isAvailable: !item.isAvailable }),
      });
      if (!res.ok) throw new Error("Toggle failed");
      // Optimistic update
      setItems((prev) =>
        prev.map((i) => (i.itemId === item.itemId ? { ...i, isAvailable: !i.isAvailable } : i))
      );
    } catch (err) {
      console.error("[CatalogPage] toggle availability:", err);
    }
  }

  async function handleDelete() {
    if (!shopId || !deleteTarget || deleting || !user) return;
    setDeleting(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/shops/${shopId}/items/${deleteTarget.itemId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      setItems((prev) => prev.filter((i) => i.itemId !== deleteTarget.itemId));
      setDeleteTarget(null);
    } catch (err) {
      console.error("[CatalogPage] delete:", err);
    } finally {
      setDeleting(false);
    }
  }

  async function handleSignOut() {
    await logout();
    router.push("/");
  }

  return (
    <div className="cat-page">
      <header className="cat-header">
        <div className="cat-header-left">
          <button className="cat-back tap-target" onClick={() => router.push("/wholesaler")} aria-label="Back to dashboard">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <div className="cat-brand">
            <svg width="22" height="22" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="10" fill="#1F4E8C"/>
              <path d="M10 28L16 12h3l4 10.5L27 12h3L20 32l-4-10L10 28z" fill="white" fillOpacity="0.95"/>
            </svg>
            <span className="cat-wordmark">Catalog</span>
          </div>
        </div>
        <div className="cat-header-right">
          <button id="catalog-add-btn" className="cat-add-btn tap-target" onClick={openAddModal}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add item
          </button>
          <button className="cat-signout tap-target" onClick={handleSignOut}>Sign out</button>
        </div>
      </header>

      <main className="cat-main">
        {loading ? (
          <div className="cat-loader" aria-label="Loading catalog…">
            <div className="cat-spinner" />
          </div>
        ) : items.length === 0 ? (
          <div className="cat-empty">
            <div className="cat-empty-icon" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
            </div>
            <h2 className="cat-empty-title">No items yet</h2>
            <p className="cat-empty-desc">Add your first product to start receiving orders from retailers.</p>
            <button className="cat-empty-btn tap-target" onClick={openAddModal}>Add first item</button>
          </div>
        ) : (
          <div className="cat-grid">
            {items.map((item) => (
              <div key={item.itemId} className={`cat-card ${!item.isAvailable ? "cat-card--hidden" : ""}`}>
                {/* Product images */}
                {item.images && item.images.length > 0 && (
                  <div className="cat-card-images">
                    <div className="cat-image-main">
                      <img src={item.images[0].url} alt={item.name} />
                    </div>
                    {item.images.length > 1 && (
                      <div className="cat-image-thumbnails">
                        {item.images.slice(1, 4).map((img, idx) => (
                          <div key={idx} className="cat-image-thumb">
                            <img src={img.url} alt={`${item.name} ${idx + 2}`} />
                          </div>
                        ))}
                        {item.images.length > 4 && (
                          <div className="cat-image-thumb cat-image-more">
                            <span>+{item.images.length - 4}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="cat-card-top">
                  <div className="cat-card-info">
                    <h3 className="cat-item-name">{item.name}</h3>
                    <span className="cat-item-unit">per {item.unit}</span>
                  </div>
                  <div className={`cat-avail-dot ${item.isAvailable ? "cat-avail-dot--on" : "cat-avail-dot--off"}`} title={item.isAvailable ? "Visible to retailers" : "Hidden from retailers"} />
                </div>

                <div className="cat-card-stats">
                  <div className="cat-stat">
                    <span className="cat-stat-label">Price</span>
                    <span className="cat-stat-value">&#8377;{item.price.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="cat-stat">
                    <span className="cat-stat-label">Stock</span>
                    <span className={`cat-stat-value ${item.stockQty === 0 ? "cat-stat-value--zero" : ""}`}>{item.stockQty}</span>
                  </div>
                </div>

                <div className="cat-card-actions">
                  <button className="cat-action-btn tap-target" onClick={() => openEditModal(item)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Edit
                  </button>
                  <button
                    className={`cat-action-btn tap-target ${item.isAvailable ? "cat-action-btn--warn" : "cat-action-btn--success"}`}
                    onClick={() => handleToggleAvailability(item)}
                  >
                    {item.isAvailable ? (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                        Hide
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                        Show
                      </>
                    )}
                  </button>
                  <button
                    className="cat-action-btn cat-action-btn--danger tap-target"
                    onClick={() => { setDeleteTarget(item); }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6"/>
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add / Edit modal */}
      {modal && (
        <div className="cat-modal-overlay" onClick={closeModal} role="dialog" aria-modal="true" aria-label={modal.mode === "add" ? "Add item" : "Edit item"}>
          <div className="cat-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cat-modal-header">
              <h2 className="cat-modal-title">{modal.mode === "add" ? "Add item" : "Edit item"}</h2>
              <button className="cat-modal-close tap-target" onClick={closeModal} aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmitModal} noValidate className="cat-modal-form">
              <div className="cat-modal-field">
                <label htmlFor="modal-name" className="cat-modal-label">Item name *</label>
                <input
                  id="modal-name"
                  type="text"
                  required
                  className="cat-modal-input"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  disabled={submitting}
                  placeholder="e.g. Basmati Rice"
                  autoFocus
                />
              </div>

              <div className="cat-modal-row">
                <div className="cat-modal-field">
                  <label htmlFor="modal-price" className="cat-modal-label">Price (INR) *</label>
                  <input
                    id="modal-price"
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    className="cat-modal-input"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    disabled={submitting}
                    placeholder="0.00"
                  />
                </div>
                <div className="cat-modal-field">
                  <label htmlFor="modal-stock" className="cat-modal-label">Stock qty *</label>
                  <input
                    id="modal-stock"
                    type="number"
                    required
                    min="0"
                    step="1"
                    className="cat-modal-input"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    disabled={submitting}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="cat-modal-field">
                <label htmlFor="modal-unit" className="cat-modal-label">Unit *</label>
                <select
                  id="modal-unit"
                  required
                  className="cat-modal-input cat-modal-select"
                  value={formUnit}
                  onChange={(e) => setFormUnit(e.target.value)}
                  disabled={submitting}
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              {/* Image Upload Section */}
              <div className="cat-modal-field">
                <label className="cat-modal-label">Product Images</label>
                <div className="cat-image-upload-section">
                  {formImages.length > 0 && (
                    <div className="cat-uploaded-images">
                      {formImages.map((img, idx) => (
                        <div key={idx} className="cat-uploaded-image">
                          <img src={img.url} alt={`Product ${idx + 1}`} />
                          <button
                            type="button"
                            className="cat-remove-image"
                            onClick={() => removeImage(idx)}
                            disabled={submitting}
                            title="Remove image"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="cat-image-upload">
                    <input
                      type="file"
                      id="image-upload"
                      multiple
                      accept="image/*"
                      onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                      disabled={submitting || uploadingImages}
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="image-upload" className="cat-upload-btn">
                      {uploadingImages ? (
                        <>
                          <span className="cat-btn-spinner" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="17 8 12 3 7 8"/>
                            <line x1="12" y1="3" x2="12" y2="15"/>
                          </svg>
                          Add Images
                        </>
                      )}
                    </label>
                  </div>
                  <p className="cat-upload-hint">
                    Upload multiple product images. First image will be the main display image.
                  </p>
                </div>
              </div>

              {actionError && (
                <div className="cat-modal-error" role="alert">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {actionError}
                </div>
              )}

              <div className="cat-modal-footer">
                <button type="button" className="cat-modal-cancel tap-target" onClick={closeModal} disabled={submitting}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cat-modal-submit tap-target"
                  disabled={submitting || !formName || !formPrice || !formStock}
                >
                  {submitting ? <span className="cat-btn-spinner" /> : modal.mode === "add" ? "Add item" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm dialog */}
      {deleteTarget && (
        <div className="cat-modal-overlay" role="dialog" aria-modal="true" aria-label="Confirm delete">
          <div className="cat-modal cat-modal--sm">
            <div className="cat-del-icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </div>
            <h2 className="cat-del-title">Delete item?</h2>
            <p className="cat-del-desc">
              <strong>{deleteTarget.name}</strong> will be permanently removed from your catalog.
            </p>
            <div className="cat-modal-footer">
              <button className="cat-modal-cancel tap-target" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancel
              </button>
              <button className="cat-modal-delete tap-target" onClick={handleDelete} disabled={deleting}>
                {deleting ? <span className="cat-btn-spinner" /> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .cat-page { min-height: 100svh; background: #F8FAFC; display: flex; flex-direction: column; }
        .cat-header { display: flex; align-items: center; justify-content: space-between; padding: 0.875rem 1.5rem; border-bottom: 1px solid #E2E8F0; background: #fff; position: sticky; top: 0; z-index: 20; gap: 1rem; }
        .cat-header-left { display: flex; align-items: center; gap: 0.75rem; }
        .cat-back { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border: 1px solid #E2E8F0; border-radius: var(--radius-md); background: none; cursor: pointer; color: #64748B; transition: background 0.15s, color 0.15s; }
        .cat-back:hover { background: #F1F5F9; color: #1E293B; }
        .cat-brand { display: flex; align-items: center; gap: 0.5rem; }
        .cat-wordmark { font-family: var(--font-display); font-size: 1.125rem; font-weight: 700; color: #1E293B; }
        .cat-header-right { display: flex; align-items: center; gap: 0.75rem; }
        .cat-add-btn { display: flex; align-items: center; gap: 0.375rem; padding: 0.5rem 1rem; background: #7C3AED; color: #fff; border: none; border-radius: var(--radius-md); font-family: var(--font-body); font-size: var(--text-sm); font-weight: 600; cursor: pointer; transition: background 0.15s, transform 0.1s; }
        .cat-add-btn:hover { background: #6D28D9; }
        .cat-add-btn:active { transform: scale(0.97); }
        .cat-signout { font-size: var(--text-sm); font-weight: 500; color: #64748B; background: none; border: none; cursor: pointer; padding: 0.375rem 0.5rem; border-radius: var(--radius-sm); transition: color 0.15s; }
        .cat-signout:hover { color: #1E293B; }
        .cat-main { flex: 1; padding: 1.5rem; max-width: 960px; margin: 0 auto; width: 100%; }
        .cat-loader { display: flex; align-items: center; justify-content: center; height: 240px; }
        .cat-spinner { width: 32px; height: 32px; border: 3px solid #E2E8F0; border-top-color: #7C3AED; border-radius: 50%; animation: catspin 0.7s linear infinite; }
        @keyframes catspin { to { transform: rotate(360deg); } }
        .cat-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; height: 360px; gap: 0.75rem; }
        .cat-empty-icon { width: 72px; height: 72px; border-radius: 50%; background: rgba(124,58,237,0.08); color: #7C3AED; display: flex; align-items: center; justify-content: center; }
        .cat-empty-title { font-family: var(--font-display); font-size: var(--text-xl); font-weight: 700; color: #1E293B; margin: 0; }
        .cat-empty-desc { font-size: var(--text-sm); color: #64748B; margin: 0; max-width: 280px; line-height: 1.5; }
        .cat-empty-btn { margin-top: 0.5rem; padding: 0.625rem 1.25rem; background: #7C3AED; color: #fff; border: none; border-radius: var(--radius-md); font-family: var(--font-body); font-size: var(--text-sm); font-weight: 600; cursor: pointer; transition: background 0.15s; }
        .cat-empty-btn:hover { background: #6D28D9; }
        .cat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
        .cat-card { background: #fff; border: 1px solid #E2E8F0; border-radius: 12px; padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; transition: box-shadow 0.15s, opacity 0.2s; }
        .cat-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.07); }
        .cat-card--hidden { opacity: 0.5; }
        
        /* Product Images */
        .cat-card-images { margin-bottom: 0.75rem; }
        .cat-image-main { width: 100%; height: 160px; border-radius: 8px; overflow: hidden; background: #F8FAFC; margin-bottom: 0.5rem; }
        .cat-image-main img { width: 100%; height: 100%; object-fit: cover; }
        .cat-image-thumbnails { display: flex; gap: 0.375rem; }
        .cat-image-thumb { width: 40px; height: 40px; border-radius: 6px; overflow: hidden; background: #F8FAFC; }
        .cat-image-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .cat-image-more { display: flex; align-items: center; justify-content: center; background: #E2E8F0; color: #64748B; font-size: 0.75rem; font-weight: 600; }
        
        .cat-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.5rem; }
        .cat-card-info { flex: 1; min-width: 0; }
        .cat-item-name { font-family: var(--font-display); font-size: var(--text-base); font-weight: 600; color: #1E293B; margin: 0 0 0.25rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cat-item-unit { font-size: 0.75rem; color: #94A3B8; }
        .cat-avail-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; margin-top: 4px; }
        .cat-avail-dot--on { background: #10B981; box-shadow: 0 0 0 3px rgba(16,185,129,0.15); }
        .cat-avail-dot--off { background: #94A3B8; }
        .cat-card-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; padding: 0.875rem 0; border-top: 1px solid #F1F5F9; border-bottom: 1px solid #F1F5F9; }
        .cat-stat { display: flex; flex-direction: column; gap: 0.2rem; }
        .cat-stat-label { font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #94A3B8; }
        .cat-stat-value { font-size: var(--text-base); font-weight: 700; color: #1E293B; }
        .cat-stat-value--zero { color: #EF4444; }
        .cat-card-actions { display: flex; gap: 0.5rem; }
        .cat-action-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.3rem; padding: 0.4rem 0.5rem; border-radius: var(--radius-sm); font-family: var(--font-body); font-size: 0.75rem; font-weight: 600; cursor: pointer; border: 1px solid #E2E8F0; background: #F8FAFC; color: #475569; transition: all 0.15s; }
        .cat-action-btn:hover { background: #F1F5F9; border-color: #CBD5E1; color: #1E293B; }
        .cat-action-btn--warn { color: #92400E; border-color: #FDE68A; background: #FFFBEB; }
        .cat-action-btn--warn:hover { background: #FEF3C7; }
        .cat-action-btn--success { color: #065F46; border-color: #A7F3D0; background: #ECFDF5; }
        .cat-action-btn--success:hover { background: #D1FAE5; }
        .cat-action-btn--danger { color: #991B1B; border-color: #FECACA; background: #FEF2F2; }
        .cat-action-btn--danger:hover { background: #FEE2E2; }
        
        /* Modal Image Upload Styles */
        .cat-image-upload-section { display: flex; flex-direction: column; gap: 0.75rem; }
        .cat-uploaded-images { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .cat-uploaded-image { position: relative; width: 80px; height: 80px; border-radius: 8px; overflow: hidden; background: #F8FAFC; }
        .cat-uploaded-image img { width: 100%; height: 100%; object-fit: cover; }
        .cat-remove-image { position: absolute; top: 2px; right: 2px; width: 20px; height: 20px; border-radius: 50%; background: rgba(0,0,0,0.6); color: #fff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s; }
        .cat-remove-image:hover { background: rgba(220,38,38,0.8); }
        .cat-upload-btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1rem; border: 2px dashed #CBD5E1; border-radius: 8px; background: #F8FAFC; color: #64748B; font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all 0.15s; text-align: center; }
        .cat-upload-btn:hover { border-color: #7C3AED; background: #F3F4F6; color: #7C3AED; }
        .cat-upload-hint { font-size: 0.75rem; color: #94A3B8; margin: 0; line-height: 1.4; }
        .cat-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1rem; }
        .cat-modal { background: #fff; border-radius: 16px; width: 100%; max-width: 440px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); overflow: hidden; }
        .cat-modal--sm { max-width: 360px; padding: 2rem; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
        .cat-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem; border-bottom: 1px solid #F1F5F9; }
        .cat-modal-title { font-family: var(--font-display); font-size: var(--text-lg); font-weight: 700; color: #1E293B; margin: 0; }
        .cat-modal-close { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: none; background: none; cursor: pointer; color: #94A3B8; border-radius: var(--radius-sm); transition: background 0.15s, color 0.15s; }
        .cat-modal-close:hover { background: #F1F5F9; color: #1E293B; }
        .cat-modal-form { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
        .cat-modal-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
        .cat-modal-field { display: flex; flex-direction: column; gap: 0.375rem; }
        .cat-modal-label { font-size: var(--text-sm); font-weight: 500; color: #475569; }
        .cat-modal-input { width: 100%; padding: 0.625rem 0.75rem; border: 1.5px solid #E2E8F0; border-radius: var(--radius-md); font-family: var(--font-body); font-size: var(--text-sm); color: #1E293B; background: #fff; outline: none; transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box; }
        .cat-modal-input:focus { border-color: #7C3AED; box-shadow: 0 0 0 3px rgba(124,58,237,0.12); }
        .cat-modal-input:disabled { opacity: 0.5; background: #F8FAFC; cursor: not-allowed; }
        .cat-modal-select { cursor: pointer; }
        .cat-modal-error { display: flex; align-items: center; gap: 0.5rem; font-size: var(--text-sm); color: #DC2626; background: #FEF2F2; border: 1px solid #FECACA; border-radius: var(--radius-sm); padding: 0.625rem 0.75rem; }
        .cat-modal-footer { display: flex; gap: 0.75rem; padding: 1.25rem 1.5rem; border-top: 1px solid #F1F5F9; margin-top: auto; }
        .cat-modal--sm .cat-modal-footer { border-top: none; padding: 0; margin-top: 0.5rem; }
        .cat-modal-cancel { flex: 1; padding: 0.625rem; border: 1.5px solid #E2E8F0; border-radius: var(--radius-md); background: #fff; font-family: var(--font-body); font-size: var(--text-sm); font-weight: 600; color: #475569; cursor: pointer; transition: background 0.15s; }
        .cat-modal-cancel:hover:not(:disabled) { background: #F1F5F9; }
        .cat-modal-cancel:disabled { opacity: 0.5; cursor: not-allowed; }
        .cat-modal-submit { flex: 1; padding: 0.625rem; border: none; border-radius: var(--radius-md); background: #7C3AED; color: #fff; font-family: var(--font-body); font-size: var(--text-sm); font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s; }
        .cat-modal-submit:hover:not(:disabled) { background: #6D28D9; }
        .cat-modal-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .cat-modal-delete { flex: 1; padding: 0.625rem; border: none; border-radius: var(--radius-md); background: #DC2626; color: #fff; font-family: var(--font-body); font-size: var(--text-sm); font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s; }
        .cat-modal-delete:hover:not(:disabled) { background: #B91C1C; }
        .cat-modal-delete:disabled { opacity: 0.5; cursor: not-allowed; }
        .cat-del-icon { width: 60px; height: 60px; border-radius: 50%; background: #FEF2F2; color: #DC2626; display: flex; align-items: center; justify-content: center; }
        .cat-del-title { font-family: var(--font-display); font-size: var(--text-lg); font-weight: 700; color: #1E293B; margin: 0; }
        .cat-del-desc { font-size: var(--text-sm); color: #64748B; margin: 0; line-height: 1.5; }
        .cat-btn-spinner { display: block; width: 1rem; height: 1rem; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: catspin 0.7s linear infinite; }
      `}</style>
    </div>
  );
}
