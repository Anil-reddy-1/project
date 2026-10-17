import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout';
import { LoadingSpinner } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useProducts } from '../../hooks/useProducts';
import { formatPrice, getPrimaryImageUrl } from '../../utils/productUtils';
import {
  ShoppingCart,
  Heart,
  Package,
  ClipboardList,
  ArrowRight,
  Star,
  Zap,
  Shield,
  Truck,
  ChevronRight,
  Search,
} from 'lucide-react';
import type { Product } from '../../types';

/* ── Category definitions ── */
const CATEGORIES = [
  { label: 'All', value: null, color: 'bg-blue-600 text-white' },
  { label: 'Snacks & Pantry', value: 'Snacks & Pantry', color: 'bg-amber-100 text-amber-700' },
  { label: 'Beverages', value: 'Beverages', color: 'bg-sky-100 text-sky-700' },
  { label: 'Dairy', value: 'Dairy', color: 'bg-yellow-100 text-yellow-700' },
  { label: 'Grains & Pulses', value: 'Grains & Pulses', color: 'bg-orange-100 text-orange-700' },
  { label: 'Oils & Spices', value: 'Oils & Spices', color: 'bg-red-100 text-red-700' },
];

function ProductMiniCard({ product }: { product: Product }) {
  const imageUrl = getPrimaryImageUrl(product);
  const isOutOfStock = product.quantity === 0;

  return (
    <Link
      to={`/buyer/products/${product.id}`}
      className="group bg-white rounded-2xl border border-ivory-200 overflow-hidden flex flex-col relative transition-[border-color,box-shadow] duration-300 hover:border-ink-300/60 hover:shadow-[0_12px_32px_-20px_rgba(20,33,61,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brass-300"
    >
      {/* Product image */}
      <div className="relative aspect-[4/3] bg-ivory-100 flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            width="640"
            height="480"
            loading="lazy"
            className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04] ${isOutOfStock ? 'opacity-60' : ''}`}
          />
        ) : (
          <Package className="w-10 h-10 text-ink-300/60" strokeWidth={1.25} />
        )}

        {/* Discount Badge */}
        {product.discountPercent && product.discountPercent > 0 && !isOutOfStock && (
          <span className="absolute top-3 left-3 px-2.5 py-0.5 bg-ink text-ivory-50 text-[10px] font-semibold uppercase tracking-[0.12em] rounded-full">
            {Math.round(product.discountPercent)}% off
          </span>
        )}

        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <span className="absolute top-3 left-3 px-2.5 py-0.5 bg-white border border-red-200 text-red-700 text-[10px] font-semibold uppercase tracking-[0.12em] rounded-full">
            Out of stock
          </span>
        )}

        {/* Low Stock Indicator */}
        {product.stockStatus === 'low' && !isOutOfStock && (
          <span className="absolute top-3 right-3 px-2.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-semibold uppercase tracking-[0.12em] rounded-full">
            Low stock
          </span>
        )}
      </div>

      {/* Details */}
      <div className="p-3.5 sm:p-5 flex flex-col gap-1.5 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] text-brass-600 font-semibold uppercase tracking-[0.2em] line-clamp-1">
            {product.categoryTags?.[0] ?? 'General'}
          </p>
          {product.minOrderQuantity > 1 && (
            <span className="shrink-0 text-[10px] text-stone-500 font-medium">
              MOQ {product.minOrderQuantity}
            </span>
          )}
        </div>

        <h3 className="font-display text-[15px] sm:text-[17px] font-medium text-ink line-clamp-2 leading-snug">
          {product.name}
        </h3>

        <div className="mt-auto pt-3 sm:pt-4 border-t border-ivory-200">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="shop-price text-base sm:text-lg">
              {formatPrice(product.sellingPrice ?? product.price)}
            </span>
            <span className="text-[11px] text-stone-500">/ {product.unit}</span>
            {product.displayPrice && product.displayPrice > (product.sellingPrice ?? product.price) && (
              <span className="text-xs text-stone-400 line-through tabular-nums">
                {formatPrice(product.displayPrice)}
              </span>
            )}
          </div>
          {product.discountAmount && product.discountAmount > 0 && (
            <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
              You save {formatPrice(product.discountAmount)}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

export function BuyerHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { products, loading, fetchProducts } = useProducts(
    { page: 1, limit: 8, sortBy: 'created_at', sortOrder: 'DESC' },
    false
  );

  const firstName = user?.name?.split(' ')[0] ?? 'there';

  useEffect(() => {
    fetchProducts({
      page: 1,
      limit: 8,
      sortBy: 'created_at',
      sortOrder: 'DESC',
      categoryTags: selectedCategory ? [selectedCategory] : undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  const filteredProducts = products;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/buyer/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };


  return (
    <DashboardLayout title="Store" subtitle="Home">
      <div className="max-w-6xl mx-auto space-y-14 sm:space-y-20 py-2">

        {/* ── Hero ── */}
        <section className="relative overflow-hidden rounded-3xl bg-white border border-ivory-200">
          {/* Fine brass frame */}
          <div className="absolute inset-3 sm:inset-4 rounded-[1.25rem] border border-brass-100 pointer-events-none" aria-hidden="true" />

          <div className="relative grid md:grid-cols-[1fr_auto] gap-10 md:gap-12 p-7 sm:p-12 lg:p-14">
            <div className="max-w-xl">
              <p className="shop-eyebrow">Wholesale marketplace</p>
              <h1 className="font-display text-[2.25rem] leading-[1.08] sm:text-5xl lg:text-[3.5rem] font-medium tracking-tight text-ink mt-4">
                Welcome back,{' '}
                <span className="italic text-brass-600">{firstName}.</span>
              </h1>
              <p className="text-stone-500 text-[15px] sm:text-base leading-relaxed mt-5 max-w-lg">
                Direct warehouse pricing on verified bulk inventory, with guaranteed dispatch, live order tracking and tiered volume discounts.
              </p>

              {/* Hero Search */}
              <form onSubmit={handleSearch} className="mt-8 flex flex-col min-[420px]:flex-row gap-2.5 max-w-lg" role="search">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products, brands or SKUs…"
                    aria-label="Search products"
                    className="shop-input h-12 pl-11 rounded-full"
                  />
                </div>
                <button
                  type="submit"
                  className="shop-btn-primary h-12 px-7"
                >
                  Search
                </button>
              </form>
            </div>

            {/* Quick Actions */}
            <nav className="md:w-64 md:border-l md:border-ivory-200 md:pl-10 self-center" aria-label="Quick actions">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500 mb-2">Your account</p>
              <ul className="grid grid-cols-2 md:grid-cols-1 gap-x-6">
                {[
                  { label: 'Browse all', icon: Package, to: '/buyer/products' },
                  { label: 'My cart', icon: ShoppingCart, to: '/buyer/cart' },
                  { label: 'My orders', icon: ClipboardList, to: '/buyer/orders' },
                  { label: 'Wishlist', icon: Heart, to: '/buyer/wishlist' },
                ].map(({ label, icon: Icon, to }) => (
                  <li key={to}>
                    <Link
                      to={to}
                      className="group flex items-center gap-3 py-3 border-b border-ivory-200 text-sm font-medium text-ink-700 hover:text-ink transition-colors"
                    >
                      <Icon className="w-4 h-4 text-brass-600 shrink-0" />
                      <span className="truncate">{label}</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-auto shrink-0 text-stone-300 group-hover:text-ink group-hover:translate-x-0.5 transition-[color,transform]" />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </section>

        {/* ── Category Filter + Featured Products ── */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
            <div>
              <p className="shop-eyebrow">{selectedCategory ? 'Department' : 'New in'}</p>
              <h2 className="font-display text-2xl sm:text-3xl font-medium tracking-tight text-ink mt-2">
                {selectedCategory ? selectedCategory : 'Latest wholesale arrivals'}
              </h2>
              <p className="shop-subtitle mt-1.5">
                {selectedCategory ? `Showing ${filteredProducts.length} items in ${selectedCategory}` : 'Verified products recently stocked in our warehouse'}
              </p>
            </div>
            <Link
              to={selectedCategory ? `/buyer/products?category=${encodeURIComponent(selectedCategory)}` : '/buyer/products'}
              className="inline-flex items-center gap-1 self-start sm:self-auto text-sm font-semibold text-ink underline decoration-brass-300 decoration-1 underline-offset-[6px] hover:decoration-ink transition-colors"
            >
              View catalogue
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Category chips */}
          <div className="mb-8">
            <h3 className="sr-only">Browse by category</h3>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(({ label, value }) => {
                const isActive = selectedCategory === value;
                return (
                  <button
                    type="button"
                    key={label}
                    onClick={() => setSelectedCategory(value)}
                    aria-pressed={isActive}
                    className={`h-9 px-4 rounded-full text-[13px] font-medium transition-colors border ${
                      isActive
                        ? 'bg-ink text-white border-ink'
                        : 'bg-white text-ink-700 border-ivory-300 hover:border-ink-300 hover:text-ink'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <LoadingSpinner size="lg" text="Loading catalogue…" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="shop-card px-6 py-14 text-center">
              <div className="w-14 h-14 mx-auto rounded-full border border-ivory-300 bg-ivory-50 flex items-center justify-center mb-5">
                <Package className="w-6 h-6 text-ink-300" />
              </div>
              <p className="shop-heading">Nothing here just yet</p>
              <p className="shop-subtitle mt-1.5">No products are currently listed in this category.</p>
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className="shop-btn-outline mt-6"
              >
                View all products
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
              {filteredProducts.slice(0, 8).map((product) => (
                <ProductMiniCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {/* CTA to full catalog */}
          <div className="mt-10 text-center">
            <Link
              to="/buyer/products"
              className="shop-btn-primary px-8"
            >
              Explore the full catalogue{products.length > 0 ? ` (${products.length}+ items)` : ''}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* ── Perks Row ── */}
        <section aria-label="Why buy with us">
          <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4 gap-px bg-ivory-200 border border-ivory-200 rounded-2xl overflow-hidden">
            {[
              { icon: Truck, title: 'Bulk delivery', desc: 'Direct warehouse delivery for high-volume orders' },
              { icon: Shield, title: 'Verified stock', desc: 'Real-time inventory, with no surprises at dispatch' },
              { icon: Zap, title: 'Express processing', desc: 'Instant order confirmation and scheduled dispatch' },
              { icon: Star, title: 'Wholesale rates', desc: 'Direct factory pricing with tiered business discounts' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-ivory-50 p-6 sm:p-7 flex flex-col items-start gap-4">
                <div className="w-11 h-11 rounded-full border border-brass-300 bg-white flex items-center justify-center">
                  <Icon className="w-[18px] h-[18px] text-brass-600" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-display text-lg font-medium text-ink">{title}</p>
                  <p className="text-sm text-stone-500 mt-1 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Quick Links ── */}
        <section className="shop-card">
          <div className="shop-card-header">
            <h2 className="shop-heading">Quick navigation</h2>
          </div>
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-4 gap-3 p-4 sm:p-6">
            {[
              { label: 'All products', to: '/buyer/products', icon: Package },
              { label: 'My orders', to: '/buyer/orders', icon: ClipboardList },
              { label: 'My cart', to: '/buyer/cart', icon: ShoppingCart },
              { label: 'Wishlist', to: '/buyer/wishlist', icon: Heart },
            ].map(({ label, to, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-3 p-3.5 rounded-xl border border-ivory-200 hover:border-ink-300 hover:bg-ivory-50 transition-colors group"
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-ivory-100 border border-ivory-200">
                  <Icon className="w-4 h-4 text-ink-700" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink-700 group-hover:text-ink transition-colors truncate">{label}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-ink ml-auto shrink-0 transition-colors" />
              </Link>
            ))}
          </div>
        </section>

      </div>
    </DashboardLayout>
  );
}
