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
  TrendingUp,
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
      className="group bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-indigo-300/80 hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col relative"
    >
      {/* Product image */}
      <div className="relative h-44 bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            width="640"
            height="400"
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
          />
        ) : (
          <Package className="w-12 h-12 text-slate-300" />
        )}
        
        {/* Discount Badge */}
        {product.discountPercent && product.discountPercent > 0 && !isOutOfStock && (
          <span className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[10px] font-bold rounded-lg shadow-sm">
            {Math.round(product.discountPercent)}% OFF
          </span>
        )}
        
        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center">
            <span className="px-3 py-1 bg-rose-500/90 text-white text-xs font-bold rounded-full shadow-lg">
              Out of Stock
            </span>
          </div>
        )}
        
        {/* Low Stock Indicator */}
        {product.stockStatus === 'low' && !isOutOfStock && (
          <span className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-amber-500/90 backdrop-blur-sm text-white text-[10px] font-bold rounded-lg shadow-sm">
            Low Stock
          </span>
        )}
      </div>

      {/* Details */}
      <div className="p-4 flex flex-col gap-1.5 flex-1">
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-indigo-600 font-bold uppercase tracking-wider line-clamp-1">
            {product.categoryTags?.[0] ?? 'General'}
          </p>
          {product.minOrderQuantity > 1 && (
            <span className="text-[10px] text-slate-400 font-medium">
              MOQ: {product.minOrderQuantity}
            </span>
          )}
        </div>

        <h3 className="text-sm font-semibold text-slate-800 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
          {product.name}
        </h3>

        <div className="mt-auto pt-3 border-t border-slate-100/80">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-lg font-extrabold text-slate-900 tracking-tight">
              {formatPrice(product.sellingPrice ?? product.price)}
            </span>
            <span className="text-xs text-slate-400 font-medium">/{product.unit}</span>
            {product.displayPrice && product.displayPrice > (product.sellingPrice ?? product.price) && (
              <span className="text-xs text-slate-400 line-through">
                {formatPrice(product.displayPrice)}
              </span>
            )}
          </div>
          {product.discountAmount && product.discountAmount > 0 && (
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
              Save {formatPrice(product.discountAmount)}
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
      <div className="max-w-6xl mx-auto space-y-10 py-2">

        {/* ── Premium Deep Space Hero Banner ── */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white p-8 md:p-12 shadow-2xl shadow-indigo-950/40 border border-indigo-500/20">
          {/* Animated floating glow orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl" />
            <div className="absolute bottom-0 left-10 w-72 h-72 rounded-full bg-purple-500/15 blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-8">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase bg-gradient-to-r from-amber-400/15 via-amber-400/25 to-orange-500/15 text-amber-300 border border-amber-400/30 backdrop-blur-md mb-4 shadow-sm">
                <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                Wholesale B2B Marketplace
              </div>
              <h1 className="text-3xl md:text-5xl font-black leading-tight tracking-tight mb-3">
                Welcome back,<br />
                <span className="gradient-text-gold">{firstName}!</span>
              </h1>
              <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-6 max-w-lg font-normal">
                Direct warehouse wholesale pricing on verified bulk inventory. Guaranteed dispatch, live order tracking, and tiered volume discounts.
              </p>

              {/* Hero Search */}
              <form onSubmit={handleSearch} className="flex gap-2.5 max-w-md">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search wholesale products, brands, SKUs…"
                    className="w-full h-12 pl-10 pr-4 bg-white/[0.08] border border-white/20 rounded-xl text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white/[0.12] transition-all backdrop-blur-md"
                  />
                </div>
                <button
                  type="submit"
                  className="h-12 px-6 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.02]"
                >
                  Search
                </button>
              </form>
            </div>

            {/* Frosted Glass Quick Action Cards */}
            <div className="grid grid-cols-2 gap-3.5 md:w-64 shrink-0">
              {[
                { label: 'Browse All', icon: Package, to: '/buyer/products', iconColor: 'text-indigo-400' },
                { label: 'My Cart', icon: ShoppingCart, to: '/buyer/cart', iconColor: 'text-amber-400' },
                { label: 'My Orders', icon: ClipboardList, to: '/buyer/orders', iconColor: 'text-emerald-400' },
                { label: 'Wishlist', icon: Heart, to: '/buyer/wishlist', iconColor: 'text-rose-400' },
              ].map(({ label, icon: Icon, to, iconColor }) => (
                <Link
                  key={to}
                  to={to}
                  className="bg-white/[0.06] hover:bg-white/[0.12] backdrop-blur-md rounded-2xl p-4 flex flex-col items-center gap-2.5 transition-all duration-300 border border-white/10 hover:border-indigo-400/40 hover:-translate-y-1 shadow-lg group"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/[0.08] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                  </div>
                  <span className="text-xs font-bold text-white/90 group-hover:text-white tracking-wide">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── Category Filter ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">Browse by Category</h2>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {CATEGORIES.map(({ label, value }) => {
              const isActive = selectedCategory === value;
              return (
                <button
                  key={label}
                  onClick={() => setSelectedCategory(value)}
                  className={`px-4.5 py-2 rounded-full text-xs font-bold transition-all duration-200 border ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-transparent shadow-md shadow-indigo-500/25 scale-[1.02]'
                      : 'bg-white text-slate-600 border-slate-200/90 hover:border-indigo-300 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Featured Products ── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {selectedCategory ? selectedCategory : 'Latest Wholesale Arrivals'}
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {selectedCategory ? `Showing ${filteredProducts.length} items in ${selectedCategory}` : 'Verified products recently stocked in warehouse'}
              </p>
            </div>
            <Link
              to={selectedCategory ? `/buyer/products?category=${encodeURIComponent(selectedCategory)}` : '/buyer/products'}
              className="flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              View catalog
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <LoadingSpinner size="lg" text="Loading catalog…" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-sm">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-semibold">No products currently in this category</p>
              <button
                onClick={() => setSelectedCategory(null)}
                className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-bold"
              >
                View all products
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4.5">
              {filteredProducts.slice(0, 8).map((product) => (
                <ProductMiniCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {/* CTA to full catalog */}
          <div className="mt-8 text-center">
            <Link
              to="/buyer/products"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white text-sm font-bold rounded-2xl hover:from-slate-800 hover:to-indigo-900 transition-all shadow-lg hover:shadow-indigo-900/20 hover:scale-[1.02]"
            >
              Explore Full Catalog ({products.length > 0 ? `${products.length}+ Items` : 'Catalog'})
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* ── Perks Row ── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Truck, title: 'Bulk Delivery', desc: 'Direct warehouse delivery for high-volume orders', gradient: 'from-blue-500 to-indigo-600' },
            { icon: Shield, title: 'Verified Stock', desc: 'Real-time live inventory guarantee with zero surprises', gradient: 'from-emerald-500 to-teal-600' },
            { icon: Zap, title: 'Express Processing', desc: 'Instant order confirmation and scheduled dispatch', gradient: 'from-amber-500 to-orange-600' },
            { icon: Star, title: 'Wholesale Rates', desc: 'Direct factory pricing with tiered business discounts', gradient: 'from-purple-500 to-pink-600' },
          ].map(({ icon: Icon, title, desc, gradient }) => (
            <div key={title} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col items-start gap-3.5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center shadow-md`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm">{title}</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </section>

        {/* ── Quick Links ── */}
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <h2 className="text-base font-bold text-slate-800 mb-4">Quick Navigation</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            {[
              { label: 'All Products', to: '/buyer/products', icon: Package, color: 'text-blue-600 bg-blue-50 border-blue-100' },
              { label: 'My Orders', to: '/buyer/orders', icon: ClipboardList, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
              { label: 'My Cart', to: '/buyer/cart', icon: ShoppingCart, color: 'text-amber-600 bg-amber-50 border-amber-100' },
              { label: 'Wishlist', to: '/buyer/wishlist', icon: Heart, color: 'text-rose-500 bg-rose-50 border-rose-100' },
            ].map(({ label, to, icon: Icon, color }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200/70 hover:border-indigo-300 hover:bg-slate-50/80 transition-all duration-200 group"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors truncate">{label}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 ml-auto shrink-0 transition-colors" />
              </Link>
            ))}
          </div>
        </section>

      </div>
    </DashboardLayout>
  );
}
