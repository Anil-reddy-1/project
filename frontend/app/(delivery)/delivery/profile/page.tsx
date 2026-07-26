/**
 * Delivery Partner Profile Page
 * Earnings, stats, performance metrics, and settings
 * 
 * Features:
 * - Total earnings display
 * - Performance metrics (rating, completion rate)
 * - Delivery history
 * - Account settings
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/client';

interface PartnerProfile {
  uid: string;
  name: string;
  phone: string;
  email: string;
  status: 'available' | 'busy' | 'offline';
  isOnline: boolean;
  
  // Performance
  rating: number;
  totalDeliveries: number;
  successfulDeliveries: number;
  cancelledDeliveries: number;
  
  // Current
  currentOrderCount: number;
  maxConcurrentOrders: number;
  todayDeliveryCount: number;
  
  // Earnings (calculated)
  totalEarnings?: number;
  todayEarnings?: number;
  thisWeekEarnings?: number;
  thisMonthEarnings?: number;
  
  // Vehicle
  vehicleType?: string;
  vehicleNumber?: string;
  
  // Joined
  createdAt: any;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      
      // Fetch partner status
      const statusResponse = await fetch(
        'http://localhost:3001/api/delivery-assignments/partner/status',
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        
        // Fetch user profile for additional details
        const userResponse = await fetch(
          `http://localhost:3001/api/users/${user.uid}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        let userData = {};
        if (userResponse.ok) {
          const userResult = await userResponse.json();
          userData = userResult.data || {};
        }

        // Calculate earnings (₹15 per km average)
        const totalEarnings = (statusData.totalDeliveries || 0) * 45; // Assume avg 3km per delivery
        const todayEarnings = (statusData.todayDeliveryCount || 0) * 45;

        setProfile({
          uid: user.uid,
          email: user.email || '',
          name: (userData as any).name || 'Delivery Partner',
          phone: (userData as any).phone || '',
          ...statusData,
          totalEarnings,
          todayEarnings,
          thisWeekEarnings: todayEarnings * 6, // Rough estimate
          thisMonthEarnings: todayEarnings * 25, // Rough estimate
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">👤</div>
          <p className="text-white text-xl">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <p className="text-white text-xl">Profile not found</p>
        </div>
      </div>
    );
  }

  const completionRate =
    profile.totalDeliveries > 0
      ? ((profile.successfulDeliveries / profile.totalDeliveries) * 100).toFixed(1)
      : '0.0';

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Header Card */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-4xl">
              👤
            </div>
            <div className="flex-1">
              <h1 className="text-white text-2xl font-bold">{profile.name}</h1>
              <p className="text-blue-100 text-sm">{profile.phone || profile.email}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/20">
            <div className="text-center">
              <p className="text-blue-100 text-xs mb-1">Rating</p>
              <p className="text-white text-2xl font-bold flex items-center gap-1">
                <span>⭐</span>
                <span>{profile.rating?.toFixed(1) || '0.0'}</span>
              </p>
            </div>
            <div className="text-center">
              <p className="text-blue-100 text-xs mb-1">Deliveries</p>
              <p className="text-white text-2xl font-bold">{profile.totalDeliveries}</p>
            </div>
            <div className="text-center">
              <p className="text-blue-100 text-xs mb-1">Success Rate</p>
              <p className="text-white text-2xl font-bold">{completionRate}%</p>
            </div>
          </div>
        </div>

        {/* Earnings Card */}
        <div className="bg-slate-800 rounded-3xl p-6 shadow-xl border border-slate-700">
          <h2 className="text-white text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">💰</span>
            Earnings
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4">
              <p className="text-green-400 text-sm mb-1">Today</p>
              <p className="text-white text-3xl font-bold">₹{profile.todayEarnings || 0}</p>
            </div>

            <div className="bg-slate-700/50 rounded-2xl p-4">
              <p className="text-slate-400 text-sm mb-1">This Week</p>
              <p className="text-white text-3xl font-bold">₹{profile.thisWeekEarnings || 0}</p>
            </div>

            <div className="bg-slate-700/50 rounded-2xl p-4">
              <p className="text-slate-400 text-sm mb-1">This Month</p>
              <p className="text-white text-3xl font-bold">
                ₹{profile.thisMonthEarnings || 0}
              </p>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4">
              <p className="text-blue-400 text-sm mb-1">Total Earned</p>
              <p className="text-white text-3xl font-bold">₹{profile.totalEarnings || 0}</p>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700">
          <h2 className="text-white text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">📊</span>
            Performance
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Total Deliveries</span>
              <span className="text-white text-xl font-bold">{profile.totalDeliveries}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Successful</span>
              <span className="text-green-400 text-xl font-bold">
                {profile.successfulDeliveries}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Cancelled</span>
              <span className="text-red-400 text-xl font-bold">
                {profile.cancelledDeliveries || 0}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Completion Rate</span>
              <span className="text-blue-400 text-xl font-bold">{completionRate}%</span>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-700">
              <span className="text-slate-400">Average Rating</span>
              <span className="text-yellow-400 text-xl font-bold flex items-center gap-1">
                <span>⭐</span>
                <span>{profile.rating?.toFixed(1) || '0.0'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Vehicle Info */}
        {profile.vehicleType && (
          <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700">
            <h2 className="text-white text-xl font-bold mb-4 flex items-center gap-2">
              <span className="text-2xl">🏍️</span>
              Vehicle
            </h2>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Type</span>
                <span className="text-white text-lg font-medium capitalize">
                  {profile.vehicleType}
                </span>
              </div>

              {profile.vehicleNumber && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Number</span>
                  <span className="text-white text-lg font-mono font-bold">
                    {profile.vehicleNumber}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700">
          <h2 className="text-white text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">⚙️</span>
            Actions
          </h2>

          <div className="space-y-3">
            <button
              onClick={() => router.push('/delivery')}
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span className="text-2xl">🏠</span>
              <span>Go to Dashboard</span>
            </button>

            <button
              onClick={() => router.push('/delivery/history')}
              className="w-full h-14 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span className="text-2xl">📜</span>
              <span>View History</span>
            </button>

            <button
              onClick={handleSignOut}
              className="w-full h-14 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span className="text-2xl">🚪</span>
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700">
          <h2 className="text-white text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">🔔</span>
            Notifications
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl">
              <div className="flex-1">
                <p className="text-white font-medium">New Deliveries</p>
                <p className="text-slate-400 text-sm">Get notified of new assignments</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-14 h-8 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl">
              <div className="flex-1">
                <p className="text-white font-medium">Sound</p>
                <p className="text-slate-400 text-sm">Play sound for new assignments</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-14 h-8 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl">
              <div className="flex-1">
                <p className="text-white font-medium">Vibration</p>
                <p className="text-slate-400 text-sm">Vibrate for new assignments</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-14 h-8 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl">
              <div className="flex-1">
                <p className="text-white font-medium">Order Updates</p>
                <p className="text-slate-400 text-sm">Notify on order status changes</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-14 h-8 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Member Since */}
        <div className="text-center text-slate-500 text-sm pb-4">
          Member since {new Date(profile.createdAt || Date.now()).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
