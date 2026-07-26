/**
 * Delivery Partner route group layout.
 * Phase 5: Modern UI for semi-literate delivery partners
 * 
 * Design principles:
 * - Large buttons (60px+), high contrast
 * - Icon-based navigation, minimal text
 * - Outdoor-readable, bright colors
 * - One-hand operation optimized
 * - Minimum tap target: 60×60px
 */

'use client';

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";

interface DeliveryLayoutProps {
  children: ReactNode;
}

export default function DeliveryLayout({ children }: DeliveryLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        // Not authenticated, redirect to login
        router.push('/delivery/login');
        return;
      }

      try {
        // Get ID token to check role
        const token = await firebaseUser.getIdToken(true);
        const decodedToken = await firebaseUser.getIdTokenResult();
        
        // Check if user has delivery role
        if (decodedToken.claims.role !== 'delivery' && decodedToken.claims.role !== 'delivery_partner') {
          console.error('Unauthorized: User is not a delivery partner');
          router.push('/');
          return;
        }

        setUser(firebaseUser);
      } catch (error) {
        console.error('Auth error:', error);
        router.push('/delivery/login');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📦</div>
          <p className="text-white text-xl">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Modern, minimal header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-white text-xl font-bold">📦 Deliveries</h1>
          <button
            onClick={() => {
              auth.signOut();
              router.push('/delivery/login');
            }}
            className="text-slate-400 hover:text-white transition-colors text-sm"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="pb-24">{children}</main>

      {/* Bottom navigation - Modern, icon-based */}
      {user && !pathname?.includes('/login') && (
        <nav className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 safe-area-inset-bottom z-50">
          <div className="max-w-7xl mx-auto px-2 py-2">
            <div className="grid grid-cols-3 gap-2">
              {/* Home / Active Deliveries */}
              <button
                onClick={() => router.push('/delivery')}
                className={`flex flex-col items-center justify-center h-16 rounded-xl transition-all ${
                  pathname === '/delivery'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                <span className="text-2xl mb-1">🏠</span>
                <span className="text-xs font-medium">Home</span>
              </button>

              {/* Assignments */}
              <button
                onClick={() => router.push('/delivery/assignments')}
                className={`flex flex-col items-center justify-center h-16 rounded-xl transition-all relative ${
                  pathname?.includes('/assignments')
                    ? 'bg-green-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                <span className="text-2xl mb-1">🔔</span>
                <span className="text-xs font-medium">Alerts</span>
              </button>

              {/* Profile / Settings */}
              <button
                onClick={() => router.push('/delivery/profile')}
                className={`flex flex-col items-center justify-center h-16 rounded-xl transition-all ${
                  pathname?.includes('/profile')
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                <span className="text-2xl mb-1">👤</span>
                <span className="text-xs font-medium">Profile</span>
              </button>
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}
