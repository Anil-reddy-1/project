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
import { NotificationBell } from '../NotificationBell';

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
    <div className="min-h-screen bg-ivory flex flex-col text-ink">
      <div className="bg-ink text-ivory-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-9 flex items-center justify-center sm:justify-between text-[11px] font-medium tracking-[0.14em] uppercase">
          <span className="hidden sm:inline">Wholesale ordering, made simple.</span>
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brass-300" />
            New season pricing is live
            <ArrowRight className="w-3 h-3 text-ink-300" />
          </span>
        </div>
      </div>
      {/* ── TOP NAV ── */}
      <header className="sticky top-0 z-40 bg-ivory-50/95 backdrop-blur-xl border-b border-ivory-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-4 h-[4.5rem]">

            {/* Brand */}
            <Link to="/buyer/home" className="flex items-center gap-2 shrink-0 mr-2">
              <div className="w-10 h-10 rounded-full bg-ink flex items-center justify-center ring-1 ring-brass-300 ring-offset-2 ring-offset-ivory-50">
                <span className="font-display text-brass-100 font-semibold text-sm tracking-wide">GJ</span>
              </div>
              <div className="hidden sm:block leading-tight">
                <span className="font-display font-semibold text-ink text-[17px] tracking-tight block">Ganga Jamuna</span>
                <span className="text-[10px] text-brass-600 font-semibold uppercase tracking-[0.28em]">Wholesale</span>
              </div>
            </Link>

            {/* Global Search */}
            <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl hidden md:block">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                <input
                  name="catalog-search"
                  aria-label="Search products"
                  autoComplete="off"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full h-10 pl-9 pr-4 bg-white border border-ivory-300 rounded-full text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brass-100 focus:border-ink-300 transition-[color,background-color,border-color,box-shadow]"
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
                    className={`relative flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition-colors after:absolute after:left-3 after:right-3 after:-bottom-[1px] after:h-[2px] after:rounded-full after:transition-colors ${isActive
                        ? 'text-ink after:bg-brass'
                        : 'text-ink-500 hover:text-ink after:bg-transparent'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2 ml-auto">
              {/* Notifications */}
              <NotificationBell />

              {/* Cart */}
              <Link
                to="/buyer/cart"
                className="relative p-2.5 rounded-full text-ink-500 hover:text-ink hover:bg-ivory-100 transition-[color,background-color]"
                title="Cart"
                aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ''}`}
              >
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 rounded-full bg-brass text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-ivory-50">
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
                  className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-ivory-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-ink text-brass-100 font-semibold text-xs flex items-center justify-center">
                    {user ? getInitials(user.name) : '?'}
                  </div>
                  <span className="text-sm font-medium text-ink hidden sm:block max-w-[100px] truncate">
                    {user?.name?.split(' ')[0] ?? 'Account'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-ink-300 hidden sm:block" />
                </button>

                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-ivory-200 rounded-2xl shadow-[0_18px_40px_-12px_rgba(20,33,61,0.18)] z-20 overflow-hidden py-1.5">
                      <div className="px-4 py-3 border-b border-ivory-200">
                        <p className="font-display text-[15px] font-medium text-ink truncate">{user?.name}</p>
                        <p className="text-xs text-stone-500 truncate">{user?.email}</p>
                      </div>
                      <DropdownLink to="/buyer/profile" icon={User} label="My Profile" onClick={() => setProfileOpen(false)} />
                      <DropdownLink to="/buyer/addresses" icon={MapPin} label="Addresses" onClick={() => setProfileOpen(false)} />
                      <DropdownLink to="/buyer/orders" icon={ClipboardList} label="My Orders" onClick={() => setProfileOpen(false)} />
                      <DropdownLink to="/buyer/wishlist" icon={Heart} label="Wishlist" onClick={() => setProfileOpen(false)} />
                      <div className="border-t border-ivory-200 mt-1 pt-1">
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
                className="lg:hidden p-2 rounded-full text-ink-500 hover:bg-ivory-100 transition-colors"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Search */}
          <div className="md:hidden pb-3">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
              <input
                name="catalog-search-mobile"
                aria-label="Search products"
                autoComplete="off"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full h-10 pl-9 pr-4 bg-white border border-ivory-300 rounded-full text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brass-100 focus:border-ink-300"
              />
            </form>
          </div>
        </div>

        {/* Mobile Nav Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-ivory-200 bg-ivory-50">
            {NAV_LINKS.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname === path ||
                (path === '/buyer/products' && location.pathname.startsWith('/buyer/products'));
              return (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-6 py-3.5 text-sm font-medium transition-colors border-b border-ivory-100 last:border-b-0 border-l-2 ${isActive ? 'text-ink bg-white border-l-brass' : 'text-ink-500 border-l-transparent hover:bg-white'
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
              className={`flex items-center gap-3 px-6 py-3.5 text-sm font-medium transition-colors border-t border-ivory-200 ${location.pathname === '/buyer/cart' ? 'text-ink bg-white' : 'text-ink-500 hover:bg-white'
                }`}
            >
              <ShoppingCart className="w-4 h-4" />
              Cart
              {cartCount > 0 && (
                <span className="ml-auto rounded-full bg-brass px-2 py-0.5 text-[10px] font-bold text-white">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>
            <Link
              to="/buyer/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-6 py-3.5 text-sm font-medium text-ink-500 hover:bg-white border-t border-ivory-200"
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
      <footer className="bg-ink text-ivory-100 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid gap-8 sm:grid-cols-3">
          <div>
            <p className="font-display text-xl font-medium text-white">Ganga Jamuna</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-brass-300">Wholesale</p>
            <p className="mt-4 text-sm text-ink-300 leading-relaxed max-w-xs">
              Trusted wholesale supplies, delivered to your counter with OTP-verified handover.
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brass-300">Shop</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/buyer/products" className="text-ivory-100/80 hover:text-white transition-colors">All products</Link></li>
              <li><Link to="/buyer/wishlist" className="text-ivory-100/80 hover:text-white transition-colors">Wishlist</Link></li>
              <li><Link to="/buyer/cart" className="text-ivory-100/80 hover:text-white transition-colors">Cart</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brass-300">Account</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/buyer/orders" className="text-ivory-100/80 hover:text-white transition-colors">Track order</Link></li>
              <li><Link to="/buyer/addresses" className="text-ivory-100/80 hover:text-white transition-colors">Addresses</Link></li>
              <li><Link to="/buyer/profile" className="text-ivory-100/80 hover:text-white transition-colors">Profile</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 text-xs text-ink-300">
            © 2026 Ganga Jamuna Wholesale. All rights reserved.
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
      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-700 hover:bg-ivory-50 transition-colors"
    >
      <Icon className="w-4 h-4 text-brass-500" />
      {label}
    </Link>
  );
}
