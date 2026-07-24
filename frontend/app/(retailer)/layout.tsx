/**
 * Retailer route group layout.
 * Derived from: tech-spec.md §12.1, design-doc.md §4.1, ui-design-reference.md §6
 *
 * Design considerations (design-doc.md §4.1):
 * - Optimized for a single question at a time
 * - Generous whitespace, large status displays
 * - Minimal simultaneous information
 * - Single-column, thumb-first layout below 768px
 * - Should feel closer to a well-designed consumer app
 */

'use client';

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface RetailerLayoutProps {
  children: ReactNode;
}

export default function RetailerLayout({ children }: RetailerLayoutProps) {
  const pathname = usePathname();

  const navItems = [
    { href: '/retailer', label: 'Home', icon: '🏠' },
    { href: '/retailer/orders', label: 'My Orders', icon: '📦' },
    { href: '/retailer/checkout', label: 'Cart', icon: '🛒' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/retailer" className="text-xl font-bold text-blue-600">
                B2B Wholesale
              </Link>
              
              <div className="hidden md:flex space-x-4">
                {navItems.map((item) => {
                  const isActive = item.href === '/retailer' 
                    ? pathname === '/retailer'
                    : pathname === item.href || pathname?.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span className="mr-2">{item.icon}</span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center">
              <button className="text-gray-600 hover:text-gray-900">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
        <div className="flex justify-around">
          {navItems.map((item) => {
            const isActive = item.href === '/retailer' 
              ? pathname === '/retailer'
              : pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center py-3 px-4 flex-1 ${
                  isActive ? 'text-blue-600' : 'text-gray-600'
                }`}
              >
                <span className="text-2xl mb-1">{item.icon}</span>
                <span className="text-xs">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <main className="pb-20 md:pb-0">{children}</main>
    </div>
  );
}
