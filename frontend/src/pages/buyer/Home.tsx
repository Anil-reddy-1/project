import { useState } from 'react';
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

const PERKS = [
  { icon: Truck, title: 'Bulk Delivery', desc: 'Direct warehouse delivery for large orders' },
  { icon: Shield, title: 'Verified Stock', desc: 'Real-time inventory, no surprises' },
  { icon: Zap, title: 'Fast Processing', desc: 'Orders confirmed and dispatched quickly' },
  { icon: Star, title: 'Wholesale Pricing', desc: 'Best rates for business buyers' },
];

function ProductMiniCard({ product }: { product: Product }) {
  const imageUrl = getPrimaryImageUrl(product);
  const isOutOfStock = product.quantity === 0;

  return (
    <Link
      to={`/buyer/products/${product.id}`}
      className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col"
    >
      {/* Product image */}
      <div className="relative h-40 bg-slate-50 flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <Package className="w-12 h-12 text-slate-300" />
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="px-2 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-full border border-red-100">
              Out of Stock
            </span>
          </div>
        )}
        {product.stockStatus === 'low' && !isOutOfStock && (
          <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full border border-amber-200">
            Low Stock
          </span>
        )}
      </div>

      {/* Details */}
      <div className="p-3.5 flex flex-col gap-1.5 flex-1">
        <p className="text-[11px] text-slate-400 font-mono uppercase tracking-wider line-clamp-1">
          {product.categoryTags?.[0] ?? 'General'}
        </p>
        <h3 className="text-sm font-semibold text-slate-800 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
          {product.name}
        </h3>
        <div className="mt-auto pt-2 flex items-center justify-between">
          <span className="text-[17px] font-bold text-slate-800">
            {formatPrice(product.price)}
          </span>
          <span className="text-xs text-slate-400">per {product.unit}</span>
        </div>
        {product.minOrderQuantity > 1 && (
          <p className="text-[11px] text-slate-400">
            Min. order: {product.minOrderQuantity} {product.unit}
          </p>
        )}
      </div>
    </Link>
  );
}

export function BuyerHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { products, loading } = useProducts({ page: 1, limit: 8, sortBy: 'created_at', sortOrder: 'DESC' }, false);

  const firstName = user?.name?.split(' ')[0] ?? 'there';

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.categoryTags?.includes(selectedCategory))
    : products;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/buyer/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <DashboardLayout title="Store" subtitle="Home">
      <div className="max-w-6xl mx-auto space-y-10 py-2">

        {/* ── Hero Banner ── */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 text-white p-8 md:p-12 shadow-xl shadow-blue-200">
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-20 w-64 h-64 rounded-full bg-white translate-y-1/2" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-8">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/15 rounded-full text-xs font-semibold mb-4">
                <TrendingUp className="w-3.5 h-3.5" />
                Wholesale Bulk Ordering
              </div>
              <h1 className="text-3xl md:text-4xl font-black leading-tight mb-3">
                Welcome back,<br />
                <span className="text-blue-200">{firstName}!</span>
              </h1>
              <p className="text-blue-100 text-sm md:text-base leading-relaxed mb-6 max-w-md">
                Browse our latest catalog. Get the best wholesale prices on bulk orders — 
                from snacks to grains, oils to beverages.
              </p>

              {/* Hero Search */}
              <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products…"
                    className="w-full h-11 pl-10 pr-4 bg-white/15 border border-white/20 rounded-xl text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/20 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  className="h-11 px-5 bg-white text-blue-700 text-sm font-bold rounded-xl hover:bg-blue-50 transition-colors shadow"
                >
                  Search
                </button>
              </form>
            </div>

            {/* Quick Action Cards */}
            <div className="grid grid-cols-2 gap-3 md:w-56 shrink-0">
              {[
                { label: 'Browse All', icon: Package, to: '/buyer/products', bg: 'bg-white/15' },
                { label: 'My Cart', icon: ShoppingCart, to: '/buyer/cart', bg: 'bg-white/15' },
                { label: 'My Orders', icon: ClipboardList, to: '/buyer/orders', bg: 'bg-white/15' },
                { label: 'Wishlist', icon: Heart, to: '/buyer/wishlist', bg: 'bg-white/15' },
              ].map(({ label, icon: Icon, to, bg }) => (
                <Link
                  key={to}
                  to={to}
                  className={`${bg} hover:bg-white/25 rounded-2xl p-4 flex flex-col items-center gap-2 transition-all text-center border border-white/10 hover:border-white/20 hover:-translate-y-0.5`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-semibold">{label}</span>
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
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(({ label, value, color: _color }) => {
              const isActive = selectedCategory === value;
              return (
                <button
                  key={label}
                  onClick={() => setSelectedCategory(value)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
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
              <h2 className="text-lg font-bold text-slate-800">
                {selectedCategory ? selectedCategory : 'Latest Products'}
              </h2>
              <p className="text-sm text-slate-400 mt-0.5">
                {selectedCategory ? `Showing ${filteredProducts.length} products in this category` : 'Recently added to the catalog'}
              </p>
            </div>
            <Link
              to={selectedCategory ? `/buyer/products?category=${encodeURIComponent(selectedCategory)}` : '/buyer/products'}
              className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              View all
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <LoadingSpinner size="lg" text="Loading products…" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No products in this category</p>
              <button
                onClick={() => setSelectedCategory(null)}
                className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-semibold"
              >
                View all products
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.slice(0, 8).map((product) => (
                <ProductMiniCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {/* CTA to full catalog */}
          <div className="mt-6 text-center">
            <Link
              to="/buyer/products"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
            >
              Explore Full Catalog
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* ── Perks Row ── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {PERKS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Icon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">{title}</p>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </section>

        {/* ── Quick Links ── */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-base font-bold text-slate-800 mb-4">Quick Access</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'All Products', to: '/buyer/products', icon: Package, color: 'text-blue-600 bg-blue-50' },
              { label: 'My Orders', to: '/buyer/orders', icon: ClipboardList, color: 'text-emerald-600 bg-emerald-50' },
              { label: 'My Cart', to: '/buyer/cart', icon: ShoppingCart, color: 'text-amber-600 bg-amber-50' },
              { label: 'Wishlist', to: '/buyer/wishlist', icon: Heart, color: 'text-red-500 bg-red-50' },
            ].map(({ label, to, icon: Icon, color }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all group"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-700 truncate">{label}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-400 ml-auto shrink-0 transition-colors" />
              </Link>
            ))}
          </div>
        </section>

      </div>
    </DashboardLayout>
  );
}
