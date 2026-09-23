import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../hooks/useCart';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  BadgeCheck,
  Package,
  DollarSign,
  Truck,
  Wallet,
  BarChart3,
  ShoppingCart,
  Heart,
  LogOut,
  Home,
  ClipboardList,
  MapPin,
  User,
  Boxes,
  Navigation,
  History,
  Bell,
} from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  dynamicBadge?: () => string | number | undefined;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

/* ─── Admin navigation ─── */
const adminSections: NavSection[] = [
  {
    title: 'MAIN',
    items: [
      { path: '/admin/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    ],
  },
  {
    title: 'INVENTORY & STOCK',
    items: [
      { path: '/admin/products', label: 'Product Management', icon: <Package className="w-4 h-4" /> },
      { path: '/admin/pricing', label: 'Pricing & Margins', icon: <DollarSign className="w-4 h-4" /> },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      { path: '/admin/deliveries', label: 'Delivery Management', icon: <Truck className="w-4 h-4" /> },
      { path: '/admin/debts', label: 'Pending Debts', icon: <Wallet className="w-4 h-4" /> },
    ],
  },
  {
    title: 'PEOPLE & ACCESS',
    items: [
      { path: '/admin/staff', label: 'Staff Management', icon: <BadgeCheck className="w-4 h-4" /> },
      { path: '/admin/users', label: 'User Management', icon: <Users className="w-4 h-4" /> },
      { path: '/admin/roles', label: 'Roles & Permissions', icon: <ShieldCheck className="w-4 h-4" /> },
    ],
  },
  {
    title: 'REPORTS & ANALYTICS',
    items: [
      { path: '/admin/reports', label: 'Reports', icon: <BarChart3 className="w-4 h-4" /> },
    ],
  },
];

/* ─── Buyer navigation ─── */
const buyerSections: NavSection[] = [
  {
    title: 'STORE',
    items: [
      { path: '/buyer/home', label: 'Home', icon: <Home className="w-4 h-4" /> },
      { path: '/buyer/products', label: 'Browse Products', icon: <ShoppingCart className="w-4 h-4" /> },
    ],
  },
  {
    title: 'MY SHOPPING',
    items: [
      { path: '/buyer/cart', label: 'My Cart', icon: <Boxes className="w-4 h-4" /> },
      { path: '/buyer/orders', label: 'My Orders', icon: <ClipboardList className="w-4 h-4" /> },
      { path: '/buyer/wishlist', label: 'Wishlist', icon: <Heart className="w-4 h-4" /> },
    ],
  },
  {
    title: 'ACCOUNT',
    items: [
      { path: '/buyer/profile', label: 'My Profile', icon: <User className="w-4 h-4" /> },
      { path: '/buyer/addresses', label: 'Addresses', icon: <MapPin className="w-4 h-4" /> },
    ],
  },
];

/* ─── Delivery Partner navigation ─── */
const deliverySections: NavSection[] = [
  {
    title: 'OPERATIONS',
    items: [
      { path: '/delivery/home', label: 'Home', icon: <Home className="w-4 h-4" /> },
      { path: '/delivery/deliveries', label: 'My Deliveries', icon: <Navigation className="w-4 h-4" /> },
    ],
  },
  {
    title: 'HISTORY & ACCOUNT',
    items: [
      { path: '/delivery/history', label: 'Delivery History', icon: <History className="w-4 h-4" /> },
      { path: '/delivery/notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
      { path: '/delivery/profile', label: 'My Profile', icon: <User className="w-4 h-4" /> },
    ],
  },
];

/* ─── Role meta: brand subtitle & accent colour ─── */
type Role = 'admin' | 'buyer' | 'delivery' | string;

interface RoleMeta {
  subtitle: string;
  accentBg: string;       // bg-* class for active item
  accentText: string;     // text-* class for active item
  accentIcon: string;     // text-* class for active icon
  accentDot: string;      // bg-* class for active dot
  brandSubtitle: string;  // sidebar brand subtitle line
}

const ROLE_META: Record<string, RoleMeta> = {
  admin: {
    subtitle: 'Administrator',
    accentBg: 'bg-blue-50',
    accentText: 'text-blue-700',
    accentIcon: 'text-blue-600',
    accentDot: 'bg-blue-500',
    brandSubtitle: 'Operations Hub',
  },
  buyer: {
    subtitle: 'Buyer Account',
    accentBg: 'bg-emerald-50',
    accentText: 'text-emerald-700',
    accentIcon: 'text-emerald-600',
    accentDot: 'bg-emerald-500',
    brandSubtitle: 'Wholesale Store',
  },
  delivery: {
    subtitle: 'Delivery Partner',
    accentBg: 'bg-amber-50',
    accentText: 'text-amber-700',
    accentIcon: 'text-amber-600',
    accentDot: 'bg-amber-500',
    brandSubtitle: 'Delivery Portal',
  },
};

function getSections(role: Role): NavSection[] {
  if (role === 'admin') return adminSections;
  if (role === 'buyer') return buyerSections;
  if (role === 'delivery') return deliverySections;
  return adminSections;
}

function getBuyerSectionsWithCartBadge(cartCount: number): NavSection[] {
  return [
    {
      title: 'STORE',
      items: [
        { path: '/buyer/home', label: 'Home', icon: <Home className="w-4 h-4" /> },
        { path: '/buyer/products', label: 'Browse Products', icon: <ShoppingCart className="w-4 h-4" /> },
      ],
    },
    {
      title: 'MY SHOPPING',
      items: [
        { 
          path: '/buyer/cart', 
          label: 'My Cart', 
          icon: <Boxes className="w-4 h-4" />,
          badge: cartCount > 0 ? String(cartCount) : undefined,
        },
        { path: '/buyer/orders', label: 'My Orders', icon: <ClipboardList className="w-4 h-4" /> },
        { path: '/buyer/wishlist', label: 'Wishlist', icon: <Heart className="w-4 h-4" /> },
      ],
    },
    {
      title: 'ACCOUNT',
      items: [
        { path: '/buyer/profile', label: 'My Profile', icon: <User className="w-4 h-4" /> },
        { path: '/buyer/addresses', label: 'Addresses', icon: <MapPin className="w-4 h-4" /> },
      ],
    },
  ];
}

function getRoleMeta(role: Role): RoleMeta {
  return ROLE_META[role] ?? ROLE_META.admin;
}

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { cartCount } = useCart();

  const role: Role = user?.role ?? 'admin';
  
  // Get sections with dynamic cart badge for buyers
  const sections = role === 'buyer' 
    ? getBuyerSectionsWithCartBadge(cartCount)
    : getSections(role);
  
  const meta = getRoleMeta(role);

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  /** Check if a path is "active" — supports prefix matching for sub-pages */
  const isPathActive = (path: string) => {
    if (location.pathname === path) return true;
    // Active if it's the products page and we're on a product detail
    if (path === '/buyer/products' && location.pathname.startsWith('/buyer/products/')) return true;
    if (path === '/delivery/deliveries' && location.pathname.startsWith('/delivery/deliveries/')) return true;
    return false;
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-200 z-50 flex flex-col shadow-sm">

      {/* ── Brand Header ── */}
      <div className="h-14 flex items-center px-4 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2.5 w-full">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-sm shrink-0">
            <span className="text-white font-black text-xs tracking-tight">GJ</span>
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="font-bold text-[13.5px] text-slate-800 truncate">Ganga Jamuna</span>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
              {meta.brandSubtitle}
            </span>
          </div>
          {/* Role pill */}
          <span className={`ml-auto shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${meta.accentBg} ${meta.accentText}`}>
            {role}
          </span>
        </div>
      </div>

      {/* ── Navigation ── */}
      <div className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        {sections.map((section, idx) => (
          <div key={idx} className="mb-0.5">
            {section.title && (
              <div className="px-4 pt-3.5 pb-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {section.title}
                </span>
              </div>
            )}
            <nav className="flex flex-col gap-0.5 px-2">
              {section.items.map((item) => {
                const active = isPathActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`group flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 ${
                      active
                        ? `${meta.accentBg} ${meta.accentText}`
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`shrink-0 transition-colors ${
                          active ? meta.accentIcon : 'text-slate-400 group-hover:text-slate-600'
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span className={`text-[13px] truncate ${active ? 'font-semibold' : 'font-medium'}`}>
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.badge && (
                        <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                          item.path === '/buyer/cart' 
                            ? `${meta.accentBg} ${meta.accentText} border border-current`
                            : 'bg-red-500 text-white'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                      {active && (
                        <div className={`w-1.5 h-1.5 rounded-full ${meta.accentDot}`} />
                      )}
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* ── User Footer ── */}
      <div className="border-t border-slate-200 p-3 shrink-0">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center font-bold text-xs text-white shrink-0">
            {user?.name ? getInitials(user.name) : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[12.5px] text-slate-700 truncate">
              {user?.name || 'User'}
            </div>
            <div className={`text-[11px] font-medium capitalize truncate ${meta.accentText}`}>
              {meta.subtitle}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-slate-400 hover:text-red-500 shrink-0 transition-colors p-1.5 rounded-lg hover:bg-red-50"
            type="button"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
