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
} from 'lucide-react';

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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* ── TOP NAV ── */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-4 h-16">

            {/* Brand */}
            <Link to="/buyer/home" className="flex items-center gap-2 shrink-0 mr-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow">
                <span className="text-white font-black text-xs tracking-tight">GJ</span>
              </div>
              <span className="font-bold text-slate-800 text-[15px] hidden sm:block">Ganga Jamuna</span>
            </Link>

            {/* Global Search */}
            <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full h-10 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
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
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
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
                className="relative p-2.5 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all"
                title="Cart"
              >
                <ShoppingCart className="w-5 h-5" />
              </Link>

              {/* Profile dropdown */}
              <div className="relative">
                <button
                  onClick={() => setProfileOpen((v) => !v)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-50 transition-all"
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
                onClick={() => setMobileMenuOpen((v) => !v)}
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
              const isActive = location.pathname === path;
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
          </div>
        )}
      </header>

      {/* ── PAGE CONTENT ── */}
      <main className="flex-1">
        {children}
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
