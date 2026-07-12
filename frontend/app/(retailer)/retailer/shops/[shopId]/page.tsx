"use client";

/**
 * Retailer — Shop Detail & Catalog.
 * URL: /retailer/shops/[shopId]
 * Derived from: app-flow.md section 1.3, schema.md section 2 & 3
 *
 * Shows:
 *  - Shop info card (name, category, address, MOQ, operating hours, verification status)
 *  - All available items (isAvailable=true only — the backend filters for non-owners)
 *  - Phase 3 will add "Add to cart / Place order" from this page.
 */

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { API_BASE_URL } from "@/lib/firebase/config";

type Shop = {
  shopId: string;
  name: string;
  category: string;
  address: string;
  moqThreshold: number;
  verificationStatus: "pending" | "verified" | "rejected";
  operatingHours: { days: string[]; open: string; close: string };
};

type Item = {
  itemId: string;
  name: string;
  price: number;
  stockQty: number;
  unit: string;
  isAvailable: boolean;
  images?: Array<{ url: string; publicId: string }>;
};

const DAY_LABELS: Record<string, string> = {
  monday: "Mon", tuesday: "Tue", wednesday: "Wed",
  thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun",
};

type CartItem = {
  item: Item;
  qty: number;
};

export default function ShopDetailPage() {
  const router = useRouter();
  const { shopId } = useParams<{ shopId: string }>();
  const { user, logout } = useAuth();

  const [shop, setShop] = useState<Shop | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [isCartOpen, setIsCartOpen] = useState(false);

  const updateCartQty = (item: Item, delta: number) => {
    setCart((prev) => {
      const current = prev[item.itemId]?.qty || 0;
      const nextQty = current + delta;
      
      if (nextQty <= 0) {
        const copy = { ...prev };
        delete copy[item.itemId];
        return copy;
      }
      if (nextQty > item.stockQty) return prev;

      return {
        ...prev,
        [item.itemId]: { item, qty: nextQty },
      };
    });
  };

  const cartItems = Object.values(cart);
  const totalItems = cartItems.reduce((acc, ci) => acc + ci.qty, 0);
  const totalPrice = cartItems.reduce((acc, ci) => acc + (ci.qty * ci.item.price), 0);

  useEffect(() => {
    if (!user || !shopId) return;

    async function load() {
      setLoading(true);
      try {
        const token = await user.getIdToken();
        const [shopRes, itemsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/shops/${shopId}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/shops/${shopId}/items`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (!shopRes.ok) {
          if (shopRes.status === 404) setError("This shop doesn't exist or has been removed.");
          else setError("Failed to load shop. Please try again.");
          return;
        }

        const [shopData, itemsData] = await Promise.all([shopRes.json(), itemsRes.json()]);
        setShop(shopData);
        setItems(itemsData.items ?? []);
      } catch {
        setError("Network error. Please check your connection and try again.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user, shopId]);

  async function handleSignOut() {
    await logout();
    router.push("/");
  }

  const filteredItems = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  const allDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

  return (
    <div className="sdetail-page">
      <header className="sdetail-header">
        <div className="sdetail-header-left">
          <button className="sdetail-back tap-target" onClick={() => router.push("/retailer/shops")} aria-label="Back to shops">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <div className="sdetail-brand">
            <svg width="22" height="22" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="10" fill="#1F4E8C"/>
              <path d="M10 28L16 12h3l4 10.5L27 12h3L20 32l-4-10L10 28z" fill="white" fillOpacity="0.95"/>
            </svg>
            <span className="sdetail-wordmark">Shop Details</span>
          </div>
        </div>
        <button className="sdetail-signout tap-target" onClick={handleSignOut}>Sign out</button>
      </header>

      <main className="sdetail-main">
        {loading ? (
          <div className="sdetail-loader" aria-label="Loading…">
            <div className="sdetail-spinner" />
          </div>
        ) : error ? (
          <div className="sdetail-error">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p>{error}</p>
            <button className="sdetail-back-btn tap-target" onClick={() => router.push("/retailer/shops")}>
              Back to shops
            </button>
          </div>
        ) : shop ? (
          <div className="sdetail-content">
            {/* Shop info card */}
            <div className="sdetail-shop-card">
              <div className="sdetail-shop-hero">
                <div className="sdetail-avatar" aria-hidden="true">
                  {shop.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <span className="sdetail-cat-badge">{shop.category}</span>
                  <h1 className="sdetail-shop-name">{shop.name}</h1>
                  <p className="sdetail-address">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    {shop.address}
                  </p>
                </div>
              </div>

              <div className="sdetail-info-grid">
                <div className="sdetail-info-item">
                  <span className="sdetail-info-label">Min. order value</span>
                  <span className="sdetail-info-value sdetail-info-value--highlight">
                    &#8377;{shop.moqThreshold.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="sdetail-info-item">
                  <span className="sdetail-info-label">Hours</span>
                  <span className="sdetail-info-value">{shop.operatingHours.open} – {shop.operatingHours.close}</span>
                </div>
              </div>

              {/* Operating days */}
              <div className="sdetail-days">
                {allDays.map((day) => (
                  <span
                    key={day}
                    className={`sdetail-day-chip ${shop.operatingHours.days.includes(day) ? "sdetail-day-chip--open" : "sdetail-day-chip--closed"}`}
                  >
                    {DAY_LABELS[day]}
                  </span>
                ))}
              </div>

              {shop.verificationStatus !== "verified" && (
                <div className="sdetail-unverified-notice">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  This shop is pending verification and may not be accepting orders yet.
                </div>
              )}
            </div>

            {/* Catalog section */}
            <div className="sdetail-catalog-section">
              <div className="sdetail-catalog-header">
                <h2 className="sdetail-catalog-title">
                  Catalog
                  {items.length > 0 && <span className="sdetail-item-count">{items.length}</span>}
                </h2>
                {items.length > 4 && (
                  <div className="sdetail-catalog-search-wrap">
                    <svg className="sdetail-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                      id="catalog-search"
                      type="search"
                      className="sdetail-catalog-search"
                      placeholder="Search items…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {filteredItems.length === 0 ? (
                <div className="sdetail-no-items">
                  {search ? (
                    <>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="11" cy="11" r="8"/>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      </svg>
                      <p>No items match &ldquo;{search}&rdquo;.</p>
                      <button 
                        className="sdetail-clear-search tap-target"
                        onClick={() => setSearch("")}
                      >
                        Clear search
                      </button>
                    </>
                  ) : (
                    <>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                        <line x1="3" y1="6" x2="21" y2="6"/>
                        <path d="M16 10a4 4 0 0 1-8 0"/>
                      </svg>
                      <p>This shop has no available items yet.</p>
                      <p>Check back later for new products!</p>
                    </>
                  )}
                </div>
              ) : (
                <>
                  {/* Category Summary */}
                  <div className="sdetail-catalog-summary">
                    <div className="sdetail-summary-stats">
                      <span className="sdetail-summary-stat">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                          <line x1="3" y1="6" x2="21" y2="6"/>
                        </svg>
                        {filteredItems.length} items available
                      </span>
                      <span className="sdetail-summary-stat">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2v6M12 16v6M5.64 7.05l4.24 4.24M14.12 14.12l4.24 4.24M1 12h6M17 12h6"/>
                        </svg>
                        {filteredItems.filter(i => i.stockQty > 0).length} in stock
                      </span>
                    </div>
                  </div>

                  <div className="sdetail-items-grid">
                    {filteredItems.map((item) => {
                      const qty = cart[item.itemId]?.qty || 0;
                      return (
                        <div 
                          key={item.itemId} 
                          className="sdetail-item-card tap-target"
                          onClick={() => { setSelectedItem(item); setActiveImageIndex(0); }}
                        >
                          <div className="sdetail-item-card-image">
                            {item.images && item.images.length > 0 ? (
                              <>
                                <img 
                                  src={item.images[0].url} 
                                  alt={item.name}
                                  loading="lazy"
                                />
                                {item.images.length > 1 && (
                                  <span className="sdetail-image-count">+{item.images.length - 1}</span>
                                )}
                              </>
                            ) : (
                              <div className="sdetail-no-image-fallback">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                  <circle cx="8.5" cy="8.5" r="1.5"/>
                                  <polyline points="21 15 16 10 5 21"/>
                                </svg>
                              </div>
                            )}
                          </div>
                          
                          <div className="sdetail-item-card-body">
                            <span className="sdetail-item-name">{item.name}</span>
                            <span className="sdetail-item-unit">per {item.unit}</span>
                            
                            <div className="sdetail-item-card-footer">
                              <span className="sdetail-item-price">&#8377;{item.price.toLocaleString("en-IN")}</span>
                              
                              <div className="sdetail-item-card-action" onClick={(e) => e.stopPropagation()}>
                                {item.stockQty === 0 ? (
                                  <span className="sdetail-item-stock sdetail-item-stock--out">Out of stock</span>
                                ) : qty > 0 ? (
                                  <div className="sdetail-qty-control">
                                    <button onClick={() => updateCartQty(item, -1)}>-</button>
                                    <span>{qty}</span>
                                    <button onClick={() => updateCartQty(item, 1)}>+</button>
                                  </div>
                                ) : (
                                  <button className="sdetail-add-btn" onClick={() => updateCartQty(item, 1)}>ADD</button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Phase 3 placeholder */}
              <div className="sdetail-phase3-notice">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                Order placement (cart, checkout, and payment) is coming in Phase 3.
              </div>
            </div>
          </div>
        ) : null}

        {/* Item Details Modal with Image Carousel */}
        {selectedItem && (
          <div className="sdetail-modal-overlay" onClick={() => setSelectedItem(null)}>
            <div className="sdetail-modal" onClick={(e) => e.stopPropagation()}>
              <div className="sdetail-modal-header">
                <h3 className="sdetail-modal-title">{selectedItem.name}</h3>
                <button className="sdetail-modal-close tap-target" onClick={() => setSelectedItem(null)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className="sdetail-modal-body">
                {selectedItem.images && selectedItem.images.length > 0 ? (
                  <div className="sdetail-carousel">
                    <div className="sdetail-carousel-main">
                      <img src={selectedItem.images[activeImageIndex].url} alt={selectedItem.name} />
                      {selectedItem.images.length > 1 && (
                        <>
                          <button className="sdetail-carousel-btn sdetail-carousel-btn--prev" onClick={() => setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : selectedItem.images!.length - 1))}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                          </button>
                          <button className="sdetail-carousel-btn sdetail-carousel-btn--next" onClick={() => setActiveImageIndex((prev) => (prev < selectedItem.images!.length - 1 ? prev + 1 : 0))}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                          </button>
                        </>
                      )}
                    </div>
                    {selectedItem.images.length > 1 && (
                      <div className="sdetail-carousel-thumbnails">
                        {selectedItem.images.map((img, idx) => (
                          <div 
                            key={idx} 
                            className={`sdetail-carousel-thumb ${idx === activeImageIndex ? "active" : ""}`}
                            onClick={() => setActiveImageIndex(idx)}
                          >
                            <img src={img.url} alt={`Thumbnail ${idx + 1}`} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="sdetail-modal-no-image">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <p>No image available</p>
                  </div>
                )}
                
                <div className="sdetail-modal-info">
                  <div className="sdetail-modal-price-row">
                    <span className="sdetail-modal-price">&#8377;{selectedItem.price.toLocaleString("en-IN")}</span>
                    <span className="sdetail-modal-unit">per {selectedItem.unit}</span>
                  </div>
                  <div className="sdetail-modal-stock">
                    {selectedItem.stockQty > 0 ? (
                      <span className="sdetail-item-stock">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 6L9 17l-5-5"/>
                        </svg>
                        {selectedItem.stockQty} available in stock
                      </span>
                    ) : (
                      <span className="sdetail-item-stock sdetail-item-stock--out">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                        </svg>
                        Out of stock
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sticky Zomato Cart Bar */}
        {totalItems > 0 && (
          <div className="zomato-cart-bar">
            <div className="zomato-cart-bar-left">
              <span className="zomato-cart-count">{totalItems} {totalItems === 1 ? 'Item' : 'Items'}</span>
              <span className="zomato-cart-total">&#8377;{totalPrice.toLocaleString("en-IN")}</span>
              <span className="zomato-cart-plus-taxes">plus taxes</span>
            </div>
            <button className="zomato-cart-btn tap-target" onClick={() => setIsCartOpen(true)}>
              View Cart
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        )}

        {/* Cart Drawer Modal */}
        {isCartOpen && (
          <div className="sdetail-modal-overlay" onClick={() => setIsCartOpen(false)}>
            <div className="sdetail-cart-drawer" onClick={(e) => e.stopPropagation()}>
              <div className="sdetail-cart-header">
                <h3 className="sdetail-cart-title">Your Cart</h3>
                <button className="sdetail-modal-close tap-target" onClick={() => setIsCartOpen(false)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              
              <div className="sdetail-cart-body">
                {cartItems.length === 0 ? (
                  <div className="sdetail-cart-empty">Your cart is empty.</div>
                ) : (
                  <div className="sdetail-cart-items">
                    {cartItems.map(({ item, qty }) => (
                      <div key={item.itemId} className="sdetail-cart-item">
                        <div className="sdetail-cart-item-info">
                          <span className="sdetail-cart-item-name">{item.name}</span>
                          <span className="sdetail-cart-item-price">&#8377;{(item.price * qty).toLocaleString("en-IN")}</span>
                        </div>
                        <div className="sdetail-qty-control sdetail-qty-control--cart">
                          <button onClick={() => updateCartQty(item, -1)}>-</button>
                          <span>{qty}</span>
                          <button onClick={() => updateCartQty(item, 1)}>+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {cartItems.length > 0 && (
                <div className="sdetail-cart-footer">
                  <div className="sdetail-cart-summary">
                    <span>Item Total</span>
                    <span>&#8377;{totalPrice.toLocaleString("en-IN")}</span>
                  </div>
                  <button 
                    className="sdetail-checkout-btn tap-target"
                    onClick={() => router.push(`/retailer/checkout?shopId=${shopId}`)}
                  >
                    Proceed to Checkout
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <style>{`
        .sdetail-page { min-height: 100svh; background: #F8FAFC; display: flex; flex-direction: column; }
        .sdetail-header { display: flex; align-items: center; justify-content: space-between; padding: 0.875rem 1.5rem; border-bottom: 1px solid #E2E8F0; background: #fff; position: sticky; top: 0; z-index: 20; }
        .sdetail-header-left { display: flex; align-items: center; gap: 0.75rem; }
        .sdetail-back { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border: 1px solid #E2E8F0; border-radius: var(--radius-md); background: none; cursor: pointer; color: #64748B; transition: background 0.15s; }
        .sdetail-back:hover { background: #F1F5F9; color: #1E293B; }
        .sdetail-brand { display: flex; align-items: center; gap: 0.5rem; }
        .sdetail-wordmark { font-family: var(--font-display); font-size: 1.125rem; font-weight: 700; color: #1E293B; }
        .sdetail-signout { font-size: var(--text-sm); font-weight: 500; color: #64748B; background: none; border: none; cursor: pointer; padding: 0.375rem 0.5rem; border-radius: var(--radius-sm); transition: color 0.15s; }
        .sdetail-signout:hover { color: #1E293B; }
        .sdetail-main { flex: 1; padding: 1.5rem; max-width: 640px; margin: 0 auto; width: 100%; display: flex; flex-direction: column; gap: 1.25rem; }
        .sdetail-loader { display: flex; align-items: center; justify-content: center; height: 240px; }
        .sdetail-spinner { width: 32px; height: 32px; border: 3px solid #E2E8F0; border-top-color: #1F4E8C; border-radius: 50%; animation: sdspin 0.7s linear infinite; }
        @keyframes sdspin { to { transform: rotate(360deg); } }
        .sdetail-error { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; height: 280px; text-align: center; color: #64748B; }
        .sdetail-error p { margin: 0; font-size: var(--text-sm); max-width: 280px; line-height: 1.5; }
        .sdetail-back-btn { padding: 0.5rem 1.25rem; background: #1F4E8C; color: #fff; border: none; border-radius: var(--radius-md); font-family: var(--font-body); font-size: var(--text-sm); font-weight: 600; cursor: pointer; }
        .sdetail-content { display: flex; flex-direction: column; gap: 1.25rem; }
        .sdetail-shop-card { background: #fff; border: 1px solid #E2E8F0; border-radius: 16px; padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
        .sdetail-shop-hero { display: flex; align-items: flex-start; gap: 1rem; }
        .sdetail-avatar { width: 56px; height: 56px; border-radius: 12px; background: linear-gradient(135deg, #1F4E8C, #3B82F6); color: #fff; font-family: var(--font-display); font-size: 1.5rem; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .sdetail-cat-badge { display: inline-block; font-size: 0.6875rem; font-weight: 600; color: #1F4E8C; background: rgba(31,78,140,0.08); padding: 0.175rem 0.5rem; border-radius: 999px; margin-bottom: 0.375rem; }
        .sdetail-shop-name { font-family: var(--font-display); font-size: var(--text-xl); font-weight: 700; color: #1E293B; margin: 0 0 0.375rem; letter-spacing: -0.01em; }
        .sdetail-address { display: flex; align-items: flex-start; gap: 0.35rem; font-size: var(--text-sm); color: #64748B; margin: 0; line-height: 1.4; }
        .sdetail-address svg { flex-shrink: 0; margin-top: 2px; }
        .sdetail-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding-top: 1rem; border-top: 1px solid #F1F5F9; }
        .sdetail-info-item { display: flex; flex-direction: column; gap: 0.25rem; }
        .sdetail-info-label { font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #94A3B8; }
        .sdetail-info-value { font-size: var(--text-base); font-weight: 600; color: #1E293B; }
        .sdetail-info-value--highlight { color: #1F4E8C; }
        .sdetail-days { display: flex; flex-wrap: wrap; gap: 0.375rem; }
        .sdetail-day-chip { padding: 0.2rem 0.5rem; border-radius: 999px; font-size: 0.6875rem; font-weight: 600; }
        .sdetail-day-chip--open { background: rgba(16,185,129,0.1); color: #065F46; }
        .sdetail-day-chip--closed { background: #F1F5F9; color: #94A3B8; }
        .sdetail-unverified-notice { display: flex; align-items: flex-start; gap: 0.5rem; font-size: var(--text-sm); color: #92400E; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: var(--radius-md); padding: 0.75rem; }
        .sdetail-unverified-notice svg { flex-shrink: 0; margin-top: 1px; color: #F59E0B; }
        .sdetail-catalog-section { background: #fff; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; }
        .sdetail-catalog-header { display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem; border-bottom: 1px solid #F1F5F9; gap: 1rem; flex-wrap: wrap; }
        .sdetail-catalog-title { font-family: var(--font-display); font-size: var(--text-lg); font-weight: 700; color: #1E293B; margin: 0; display: flex; align-items: center; gap: 0.5rem; }
        .sdetail-item-count { display: inline-flex; align-items: center; justify-content: center; background: #F1F5F9; color: #64748B; font-size: 0.75rem; font-weight: 700; border-radius: 999px; padding: 0.1rem 0.5rem; }
        .sdetail-catalog-search-wrap { position: relative; }
        .sdetail-search-icon { position: absolute; left: 0.625rem; top: 50%; transform: translateY(-50%); color: #94A3B8; pointer-events: none; }
        .sdetail-catalog-search { padding: 0.5rem 0.75rem 0.5rem 2rem; border: 1.5px solid #E2E8F0; border-radius: var(--radius-md); font-family: var(--font-body); font-size: var(--text-sm); color: #1E293B; outline: none; transition: border-color 0.2s; }
        .sdetail-catalog-search:focus { border-color: #1F4E8C; }
        .sdetail-no-items { padding: 2rem 1.5rem; text-align: center; color: #94A3B8; font-size: var(--text-sm); display: flex; flex-direction: column; align-items: center; gap: 1rem; }
        .sdetail-no-items p { margin: 0; }
        .sdetail-no-items svg { color: #CBD5E1; }
        
        .sdetail-clear-search {
          padding: 0.5rem 1rem;
          background: #1F4E8C;
          color: #fff;
          border: none;
          border-radius: var(--radius-md);
          font-size: var(--text-sm);
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s;
        }
        
        .sdetail-clear-search:hover {
          background: #173f70;
        }
        
        .sdetail-catalog-summary {
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #F8FAFC;
          background: #FAFBFC;
        }
        
        .sdetail-summary-stats {
          display: flex;
          gap: 1.5rem;
          flex-wrap: wrap;
        }
        
        .sdetail-summary-stat {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.75rem;
          color: #64748B;
          font-weight: 500;
        }
        
        .sdetail-summary-stat svg {
          color: #94A3B8;
        }
        
        .sdetail-items-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); 
          gap: 1rem; 
          padding: 1rem 1.5rem; 
        }
        
        @media (min-width: 480px) {
          .sdetail-items-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
        }
        
        .sdetail-item-card { 
          display: flex; 
          flex-direction: column; 
          background: #fff; 
          border: 1px solid #E2E8F0; 
          border-radius: 12px; 
          overflow: hidden; 
          transition: transform 0.2s, box-shadow 0.2s; 
          cursor: pointer;
        }
        
        .sdetail-item-card:hover { 
          transform: translateY(-2px); 
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03); 
        }
        
        .sdetail-item-card-image {
          position: relative;
          width: 100%;
          aspect-ratio: 1;
          background: #F8FAFC;
          border-bottom: 1px solid #F1F5F9;
        }
        
        .sdetail-item-card-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .sdetail-no-image-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #CBD5E1;
        }
        
        .sdetail-image-count {
          position: absolute;
          bottom: 6px;
          right: 6px;
          background: rgba(0,0,0,0.6);
          color: #fff;
          font-size: 0.625rem;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 4px;
        }
        
        .sdetail-item-card-body { 
          padding: 0.75rem; 
          display: flex; 
          flex-direction: column; 
          flex: 1; 
        }
        
        .sdetail-item-name { 
          font-size: var(--text-sm); 
          font-weight: 600; 
          color: #1E293B; 
          line-height: 1.25; 
          margin-bottom: 0.25rem; 
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .sdetail-item-unit { 
          font-size: 0.6875rem; 
          color: #64748B; 
          margin-bottom: 0.75rem;
          flex: 1;
        }
        
        .sdetail-item-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: auto;
        }
        
        .sdetail-item-price { 
          font-size: var(--text-base); 
          font-weight: 700; 
          color: #1E293B; 
        }
        
        .sdetail-item-card-action {
          position: relative;
        }
        
        .sdetail-add-btn {
          background: #F1F5F9;
          color: #1F4E8C;
          border: 1px solid #E2E8F0;
          border-radius: 6px;
          padding: 0.35rem 0.75rem;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
        }
        
        .sdetail-add-btn:hover {
          background: #E2E8F0;
          border-color: #CBD5E1;
        }
        
        .sdetail-qty-control {
          display: flex;
          align-items: center;
          background: #1F4E8C;
          color: #fff;
          border-radius: 6px;
          overflow: hidden;
          font-size: 0.75rem;
          font-weight: 700;
          height: 28px;
        }
        
        .sdetail-qty-control button {
          background: none;
          border: none;
          color: #fff;
          width: 28px;
          height: 100%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.1s;
        }
        
        .sdetail-qty-control button:hover {
          background: rgba(0,0,0,0.1);
        }
        
        .sdetail-qty-control span {
          width: 24px;
          text-align: center;
        }

        .sdetail-item-stock { font-size: 0.6875rem; color: #10B981; font-weight: 600; display: flex; align-items: center; gap: 0.25rem; }
        .sdetail-item-stock--out { color: #EF4444; font-size: 0.6875rem; }

        /* Zomato Cart Bar */
        .zomato-cart-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: #fff;
          border-top: 1px solid #E2E8F0;
          padding: 0.75rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 40;
          box-shadow: 0 -4px 6px -1px rgba(0,0,0,0.05);
          padding-bottom: calc(0.75rem + env(safe-area-inset-bottom));
        }

        .zomato-cart-bar-left {
          display: flex;
          flex-direction: column;
        }

        .zomato-cart-count {
          font-size: 0.6875rem;
          font-weight: 600;
          color: #64748B;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .zomato-cart-total {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1E293B;
          line-height: 1.2;
        }

        .zomato-cart-plus-taxes {
          font-size: 0.625rem;
          color: #94A3B8;
        }

        .zomato-cart-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #1F4E8C;
          color: #fff;
          border: none;
          padding: 0.75rem 1.25rem;
          border-radius: var(--radius-md);
          font-size: var(--text-sm);
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        }
        
        .zomato-cart-btn:hover { background: #173f70; }

        /* Cart Drawer */
        .sdetail-cart-drawer {
          background: #fff; 
          width: 100%; 
          max-width: 500px; 
          border-radius: 20px 20px 0 0; 
          box-shadow: 0 -10px 25px -5px rgba(0,0,0,0.1); 
          display: flex; 
          flex-direction: column; 
          max-height: 85vh; 
          position: absolute;
          bottom: 0;
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        .sdetail-cart-header {
          padding: 1.25rem 1.5rem; 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          border-bottom: 1px solid #F1F5F9;
        }

        .sdetail-cart-title {
          margin: 0; 
          font-family: var(--font-display); 
          font-size: var(--text-lg); 
          font-weight: 700; 
          color: #1E293B;
        }

        .sdetail-cart-body {
          padding: 0; 
          overflow-y: auto;
          flex: 1;
        }

        .sdetail-cart-empty {
          padding: 3rem 1.5rem;
          text-align: center;
          color: #94A3B8;
          font-weight: 500;
        }

        .sdetail-cart-items {
          display: flex;
          flex-direction: column;
        }

        .sdetail-cart-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #F8FAFC;
        }

        .sdetail-cart-item-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .sdetail-cart-item-name {
          font-weight: 600;
          color: #1E293B;
          font-size: var(--text-sm);
        }

        .sdetail-cart-item-price {
          font-size: var(--text-sm);
          color: #64748B;
        }

        .sdetail-qty-control--cart {
          background: #F1F5F9;
          color: #1E293B;
          border: 1px solid #E2E8F0;
        }

        .sdetail-qty-control--cart button {
          color: #1F4E8C;
        }

        .sdetail-cart-footer {
          padding: 1.25rem 1.5rem;
          border-top: 1px solid #E2E8F0;
          background: #FAFBFC;
          padding-bottom: calc(1.25rem + env(safe-area-inset-bottom));
        }

        .sdetail-cart-summary {
          display: flex;
          justify-content: space-between;
          font-weight: 700;
          color: #1E293B;
          font-size: var(--text-lg);
          margin-bottom: 1rem;
        }

        .sdetail-checkout-btn {
          width: 100%;
          padding: 1rem;
          background: #10B981;
          color: #fff;
          border: none;
          border-radius: var(--radius-md);
          font-size: var(--text-base);
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s;
        }

        .sdetail-checkout-btn:hover {
          background: #059669;
        }

        /* Modal Styles */
        .sdetail-modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 1rem; }
        .sdetail-modal { background: #fff; width: 100%; max-width: 500px; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1); overflow: hidden; display: flex; flex-direction: column; max-height: 90vh; }
        .sdetail-modal-header { padding: 1.25rem 1.5rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #F1F5F9; }
        .sdetail-modal-title { margin: 0; font-family: var(--font-display); font-size: var(--text-lg); font-weight: 700; color: #1E293B; }
        .sdetail-modal-close { background: none; border: none; color: #64748B; cursor: pointer; padding: 0.5rem; margin: -0.5rem; border-radius: 50%; transition: background 0.15s; display: flex; }
        .sdetail-modal-close:hover { background: #F1F5F9; color: #0F172A; }
        .sdetail-modal-body { padding: 1.5rem; overflow-y: auto; }
        
        /* Carousel Styles */
        .sdetail-carousel { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem; }
        .sdetail-carousel-main { position: relative; width: 100%; aspect-ratio: 1; border-radius: 12px; overflow: hidden; background: #F8FAFC; border: 1px solid #E2E8F0; }
        .sdetail-carousel-main img { width: 100%; height: 100%; object-fit: contain; }
        .sdetail-carousel-btn { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.9); border: 1px solid #E2E8F0; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #1E293B; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .sdetail-carousel-btn:hover { background: #fff; transform: translateY(-50%) scale(1.05); }
        .sdetail-carousel-btn--prev { left: 0.75rem; }
        .sdetail-carousel-btn--next { right: 0.75rem; }
        .sdetail-carousel-thumbnails { display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 0.5rem; }
        .sdetail-carousel-thumb { width: 60px; height: 60px; flex-shrink: 0; border-radius: 8px; overflow: hidden; cursor: pointer; border: 2px solid transparent; opacity: 0.6; transition: all 0.2s; background: #F8FAFC; }
        .sdetail-carousel-thumb.active { border-color: #1F4E8C; opacity: 1; }
        .sdetail-carousel-thumb img { width: 100%; height: 100%; object-fit: cover; }
        
        .sdetail-modal-no-image { aspect-ratio: 1; background: #F1F5F9; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #94A3B8; margin-bottom: 1.5rem; gap: 0.75rem; }
        .sdetail-modal-no-image p { margin: 0; font-size: var(--text-sm); font-weight: 500; }
        
        .sdetail-modal-info { display: flex; flex-direction: column; gap: 0.75rem; padding-top: 1.5rem; border-top: 1px solid #F1F5F9; }
        .sdetail-modal-price-row { display: flex; align-items: baseline; gap: 0.5rem; }
        .sdetail-modal-price { font-size: 1.5rem; font-weight: 700; color: #1E293B; }
        .sdetail-modal-unit { color: #64748B; font-size: var(--text-sm); font-weight: 500; }
        .sdetail-modal-stock { display: flex; align-items: center; }
        
        .sdetail-phase3-notice { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; color: #94A3B8; padding: 1rem 1.5rem; border-top: 1px solid #F1F5F9; }
      `}</style>
    </div>
  );
}
