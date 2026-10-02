import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, User, Store, ShoppingCart, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../hooks/useCart";

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export function Header({
  title = "OPS HUB",
  subtitle = "Console",
}: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { cartCount } = useCart();

  const isBuyer = user?.role === "buyer";

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    navigate("/login");
  };

  return (
    <header className="fixed top-0 left-64 right-0 h-14 bg-white border-b border-slate-200 z-40 flex items-center justify-between px-5 shadow-sm">
      {/* Left Section */}
      <div className="flex items-center gap-5 flex-1 min-w-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm shrink-0">
          <span className="font-semibold text-slate-800">{title}</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-500 capitalize">{subtitle}</span>
        </div>

        {/* Search Bar */}
        <div className="relative w-72 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            placeholder="Search inventory, orders, staff…"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Cart Button (Buyer Only) */}
        {isBuyer && (
          <button
            onClick={() => navigate("/buyer/cart")}
            className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
            type="button"
            title="My Cart"
          >
            <ShoppingCart className="w-4.5 h-4.5" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </button>
        )}

        {/* Shift Status */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 text-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-emerald-700 text-xs">
            Shift #1 Active
          </span>
        </div>

        {/* Store Info */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs">
          <Store className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-medium text-slate-600">Main Store #04</span>
        </div>

        {/* Notifications */}
        <button
          className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
          type="button"
          title="Notifications"
        >
          <Bell className="w-4.5 h-4.5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>

        {/* User Profile */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((open) => !open)}
            aria-expanded={profileOpen}
            aria-label="Open profile menu"
            className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0 shadow-sm hover:shadow-md transition-shadow"
          >
            <User className="w-4 h-4 text-white" />
          </button>

          {profileOpen && (
            <>
              <button
                type="button"
                aria-label="Close profile menu"
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setProfileOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl z-20">
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {user?.name || "User"}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {user?.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
