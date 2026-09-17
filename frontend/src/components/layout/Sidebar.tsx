import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
} from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  roles?: string[];
  badge?: string;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'MAIN',
    items: [
      {
        path: '/admin/dashboard',
        label: 'Dashboard',
        icon: <LayoutDashboard className="w-[18px] h-[18px]" />,
        roles: ['admin'],
      },
    ],
  },
  {
    title: 'INVENTORY & STOCK',
    items: [
      {
        path: '/admin/products',
        label: 'Product Management',
        icon: <Package className="w-[18px] h-[18px]" />,
        roles: ['admin'],
      },
      {
        path: '/admin/pricing',
        label: 'Pricing & Margins',
        icon: <DollarSign className="w-[18px] h-[18px]" />,
        roles: ['admin'],
      },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      {
        path: '/admin/deliveries',
        label: 'Delivery Management',
        icon: <Truck className="w-[18px] h-[18px]" />,
        roles: ['admin'],
      },
      {
        path: '/admin/debts',
        label: 'Pending Debts',
        icon: <Wallet className="w-[18px] h-[18px]" />,
        roles: ['admin'],
      },
    ],
  },
  {
    title: 'SHOPPING',
    items: [
      {
        path: '/buyer/products',
        label: 'Browse Products',
        icon: <ShoppingCart className="w-[18px] h-[18px]" />,
        roles: ['admin', 'buyer'],
      },
      {
        path: '/buyer/wishlist',
        label: 'My Wishlist',
        icon: <Heart className="w-[18px] h-[18px]" />,
        roles: ['admin', 'buyer'],
      },
    ],
  },
  {
    title: 'PEOPLE & ACCESS',
    items: [
      {
        path: '/admin/staff',
        label: 'Staff Management',
        icon: <BadgeCheck className="w-[18px] h-[18px]" />,
        roles: ['admin'],
      },
      {
        path: '/admin/users',
        label: 'User Management',
        icon: <Users className="w-[18px] h-[18px]" />,
        roles: ['admin'],
      },
      {
        path: '/admin/roles',
        label: 'Roles & Permissions',
        icon: <ShieldCheck className="w-[18px] h-[18px]" />,
        roles: ['admin'],
      },
    ],
  },
  {
    title: 'REPORTS & ANALYTICS',
    items: [
      {
        path: '/admin/reports',
        label: 'Reports',
        icon: <BarChart3 className="w-[18px] h-[18px]" />,
        roles: ['admin'],
      },
    ],
  },
];

export function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = async () => {
    await logout();
  };

  // Filter nav items based on user role
  const filterNavItems = (items: NavItem[]) =>
    items.filter((item) => !item.roles || (user?.role && item.roles.includes(user.role)));

  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: filterNavItems(section.items),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-50 flex flex-col">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm">GJ</span>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-base text-gray-900">Ganga Jamuna</span>
            <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">
              Operations
            </span>
          </div>
        </div>
      </div>

      {/* Navigation - Scrollable */}
      <div className="flex-1 overflow-y-auto py-4">
        {visibleSections.map((section, idx) => (
          <div key={idx} className="mb-6">
            {section.title && (
              <div className="px-6 mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {section.title}
                </span>
              </div>
            )}
            <nav className="flex flex-col gap-1 px-3">
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm'
                        : 'text-gray-700 hover:bg-gray-100 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={isActive ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'}>
                        {item.icon}
                      </span>
                      <span className="text-sm">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* User Section */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center font-semibold text-sm text-white shrink-0 shadow-sm">
            {user?.name ? getInitials(user.name) : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm text-gray-900 truncate">
              {user?.name || 'User'}
            </div>
            <div className="text-xs text-gray-500 truncate capitalize">
              {user?.role || 'Role'}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-red-600 shrink-0 transition-colors p-1.5 rounded-lg hover:bg-red-50"
            type="button"
            title="Logout"
          >
            <LogOut className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>
    </aside>
  );
}
