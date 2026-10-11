import { type ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ShoppingCart,
  Heart,
  Search,
  Home,
  Package,
  ClipboardList,
  User,
  MapPin,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useCart } from '../../hooks/useCart';

interface BuyerLayoutProps {
  children: ReactNode;
  /** Override search bar placeholder */
  searchPlaceholder?: string;
  /** Fired when user submits global search */
  onSearch?: (query: string) => void;
}

const NAV_LINKS = [
  { path: '/buyer/home', label: 'Home', icon: Home },
  { path: '/buyer/products', label: 'Products', icon: Package },
  { path: '/buyer/orders', label: 'My Orders', icon: ClipboardList },
  { path: '/buyer/wishlist', label: 'Wishlist', icon: Heart },
];

export function BuyerLayout({ children, searchPlaceholder = 'Search products…', onSearch }: BuyerLayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { cartCount } = useCart();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    } else if (searchQuery.trim()) {
      navigate(`/buyer/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-[#f7f9fc] flex flex-col text-slate-900">
      <div className="bg-slate-950 text-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-9 flex items-center justify-center sm:justify-between text-[11px] font-medium tracking-wide">
          <span className="hidden sm:inline">Wholesale ordering, made simple.</span>
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            New season pricing is live
            <ArrowRight className="w-3 h-3 text-slate-400" />
          </span>
        </div>
      </div>
      {/* ── TOP NAV ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-4 h-[4.5rem]">

            {/* Brand */}
            <Link to="/buyer/home" className="flex items-center gap-2 shrink-0 mr-2">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 flex items-center justify-center shadow-lg shadow-blue-200/60">
                <span className="text-white font-black text-sm tracking-tight">GJ</span>
              </div>
              <div className="hidden sm:block leading-tight">
                <span className="font-extrabold text-slate-900 text-[15px] tracking-tight block">Ganga Jamuna</span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-[0.18em]">Wholesale</span>
              </div>
            </Link>

            {/* Global Search */}
            <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  name="catalog-search"
                  aria-label="Search products"
                  autoComplete="off"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full h-10 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-[color,background-color,border-color,box-shadow]"
                />
              </div>
            </form>

            {/* Desktop Nav Links */}
            <nav className="hidden lg:flex items-center gap-0.5 ml-2">
              {NAV_LINKS.map(({ path, label, icon: Icon }) => {
                const isActive = location.pathname === path ||
                  (path === '/buyer/products' && location.pathname.startsWith('/buyer/products'));
                return (
                  <Link
                    key={path}
                    to={path}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-[color,background-color] ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2 ml-auto">
              {/* Cart */}
              <Link
                to="/buyer/cart"
                className="relative p-2.5 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-[color,background-color]"
                title="Cart"
                aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ''}`}
              >
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Link>

              {/* Profile dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen((v) => !v)}
                  aria-label="Open account menu"
                  aria-expanded={profileOpen}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                    {user ? getInitials(user.name) : '?'}
                  </div>
                  <span className="text-sm font-medium text-slate-700 hidden sm:block max-w-[100px] truncate">
                    {user?.name?.split(' ')[0] ?? 'Account'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                </button>

                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 overflow-hidden py-1.5">
                      <div className="px-4 py-3 border-b border-slate-100">
                        <p className="text-sm font-semibold text-slate-800 truncate">{user?.name}</p>
                        <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                      </div>
                      <DropdownLink to="/buyer/profile" icon={User} label="My Profile" onClick={() => setProfileOpen(false)} />
                      <DropdownLink to="/buyer/addresses" icon={MapPin} label="Addresses" onClick={() => setProfileOpen(false)} />
                      <DropdownLink to="/buyer/orders" icon={ClipboardList} label="My Orders" onClick={() => setProfileOpen(false)} />
                      <DropdownLink to="/buyer/wishlist" icon={Heart} label="Wishlist" onClick={() => setProfileOpen(false)} />
                      <div className="border-t border-slate-100 mt-1 pt-1">
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Mobile menu toggle */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen((v) => !v)}
                aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={mobileMenuOpen}
                className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Search */}
          <div className="md:hidden pb-3">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                name="catalog-search-mobile"
                aria-label="Search products"
                autoComplete="off"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full h-10 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
            </form>
          </div>
        </div>

        {/* Mobile Nav Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-100 bg-white">
            {NAV_LINKS.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname === path ||
                (path === '/buyer/products' && location.pathname.startsWith('/buyer/products'));
              return (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-6 py-3.5 text-sm font-medium transition-colors border-b border-slate-50 last:border-0 ${
                    isActive ? 'text-blue-700 bg-blue-50' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
            <Link
              to="/buyer/cart"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-6 py-3.5 text-sm font-medium transition-colors border-t border-slate-100 ${
                location.pathname === '/buyer/cart' ? 'text-blue-700 bg-blue-50' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              Cart
              {cartCount > 0 && (
                <span className="ml-auto rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>
            <Link
              to="/buyer/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-6 py-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50 border-t border-slate-100"
            >
              <User className="w-4 h-4" />
              Account & addresses
            </Link>
          </div>
        )}
      </header>

      {/* ── PAGE CONTENT ── */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-10">
          {children}
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <span>© 2026 Ganga Jamuna Wholesale. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link to="/buyer/orders" className="hover:text-slate-600 transition-colors">Track Order</Link>
            <Link to="/buyer/profile" className="hover:text-slate-600 transition-colors">Profile</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function DropdownLink({
  to,
  icon: Icon,
  label,
  onClick,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
    >
      <Icon className="w-4 h-4 text-slate-400" />
      {label}
    </Link>
  );
}
