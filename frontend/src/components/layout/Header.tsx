import { useState } from 'react';
import { Search, Bell, User, Store } from 'lucide-react';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export function Header({ title = 'OPS HUB', subtitle = 'Console' }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="fixed top-0 left-64 right-0 h-14 bg-surface-container-lowest z-40 shadow-sm flex items-center justify-between px-6">
      {/* Left Section */}
      <div className="flex items-center gap-6 flex-1">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-on-surface">{title}</span>
          <span className="text-outline">/</span>
          <span className="text-on-surface-variant capitalize">{subtitle}</span>
        </div>

        {/* Search Bar */}
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-9 pr-3 text-on-surface bg-surface-container-low rounded-lg text-sm placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
            placeholder="Search inventory, orders, staff..."
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        {/* Shift Status */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-surface-container-low text-sm">
          <span className="w-2 h-2 rounded-full bg-success shrink-0"></span>
          <span className="font-medium text-on-surface">Shift #1 Active</span>
        </div>

        {/* Store Info */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-surface-container text-on-surface text-sm">
          <Store className="w-3.5 h-3.5 text-secondary" />
          <span className="font-medium">Main Store #04</span>
        </div>

        {/* Notifications */}
        <button
          className="relative p-1.5 rounded-lg hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface transition-colors"
          type="button"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full"></span>
        </button>

        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-white" />
        </div>
      </div>
    </header>
  );
}
