/**
 * Delivery Partner Dashboard - Phase 5
 * Modern, visual-first UI for semi-literate users
 * 
 * Features:
 * - Large buttons and icons
 * - Color-coded status
 * - Minimal text, maximum visuals
 * - One-tap actions
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/client';
import { locationTrackingService } from '@/lib/services/location-tracking.service';

interface PartnerStatus {
  status: 'available' | 'busy' | 'offline';
  isOnline: boolean;
  currentOrderCount: number;
  maxConcurrentOrders: number;
  todayDeliveryCount: number;
  rating: number;
  totalDeliveries: number;
}

export default function DeliveryPage() {
  const router = useRouter();
  const [partnerStatus, setPartnerStatus] = useState<PartnerStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPartnerStatus();
    
    // Start location tracking when component mounts
    const initLocationTracking = async () => {
      try {
        await locationTrackingService.startTracking();
      } catch (error) {
        console.error('Failed to start location tracking:', error);
      }
    };
    
    initLocationTracking();
    
    // Cleanup on unmount
    return () => {
      locationTrackingService.stopTracking();
    };
  }, []);

  const fetchPartnerStatus = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const response = await fetch('http://localhost:3001/api/delivery-assignments/partner/status', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPartnerStatus(data);
      }
    } catch (error) {
      console.error('Error fetching partner status:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (newStatus: 'available' | 'offline') => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      await fetch('http://localhost:3001/api/delivery-assignments/partner/status', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          isOnline: newStatus === 'available',
        }),
      });

      // Start/stop location tracking based on status
      if (newStatus === 'available') {
        await locationTrackingService.startTracking();
      } else {
        locationTrackingService.stopTracking();
      }

      await fetchPartnerStatus();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">📦</div>
          <p className="text-white text-xl">Loading...</p>
        </div>
      </div>
    );
  }

  const statusIcon =
    partnerStatus?.status === 'available'
      ? '🟢'
      : partnerStatus?.status === 'busy'
      ? '🟡'
      : '⚪';

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Status Card */}
      <div className="bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-slate-400 text-sm mb-1">Your Status</p>
            <div className="flex items-center gap-3">
              <span className="text-4xl">{statusIcon}</span>
              <h2 className="text-white text-3xl font-bold capitalize">
                {partnerStatus?.status || 'Offline'}
              </h2>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-700/50 rounded-2xl p-4 text-center">
            <div className="text-3xl mb-2">📦</div>
            <div className="text-2xl font-bold text-white">
              {partnerStatus?.currentOrderCount || 0}
            </div>
            <div className="text-xs text-slate-400 mt-1">Active</div>
          </div>

          <div className="bg-slate-700/50 rounded-2xl p-4 text-center">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-2xl font-bold text-green-400">
              {partnerStatus?.todayDeliveryCount || 0}
            </div>
            <div className="text-xs text-slate-400 mt-1">Today</div>
          </div>

          <div className="bg-slate-700/50 rounded-2xl p-4 text-center">
            <div className="text-3xl mb-2">⭐</div>
            <div className="text-2xl font-bold text-yellow-400">
              {partnerStatus?.rating?.toFixed(1) || '0.0'}
            </div>
            <div className="text-xs text-slate-400 mt-1">Rating</div>
          </div>
        </div>

        {/* Status Toggle */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => toggleStatus('available')}
            disabled={partnerStatus?.status === 'available'}
            className={`h-16 rounded-2xl font-bold text-lg transition-all ${
              partnerStatus?.status === 'available'
                ? 'bg-green-600 text-white shadow-lg shadow-green-600/50'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl">✅</span>
              <span>Available</span>
            </div>
          </button>

          <button
            onClick={() => toggleStatus('offline')}
            disabled={partnerStatus?.status === 'offline'}
            className={`h-16 rounded-2xl font-bold text-lg transition-all ${
              partnerStatus?.status === 'offline'
                ? 'bg-slate-600 text-white shadow-lg shadow-slate-600/50'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl">⏸️</span>
              <span>Break</span>
            </div>
          </button>
        </div>
      </div>

      {/* Active Deliveries Section */}
      <div className="bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-700">
        <h3 className="text-white text-xl font-bold mb-4 flex items-center gap-2">
          <span className="text-2xl">🚚</span>
          Active Deliveries
        </h3>

        {partnerStatus?.currentOrderCount === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-slate-400 text-lg">No active deliveries</p>
            <p className="text-slate-500 text-sm mt-2">
              You'll be notified when new orders are available
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Placeholder for active deliveries - will be populated from API */}
            <p className="text-slate-400 text-center py-8">
              Active deliveries will appear here
            </p>
          </div>
        )}
      </div>

      {/* Total Earnings */}
      <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-100 text-sm mb-1">Total Deliveries</p>
            <p className="text-white text-4xl font-bold">
              {partnerStatus?.totalDeliveries || 0}
            </p>
          </div>
          <div className="text-6xl">💰</div>
        </div>
      </div>
    </div>
  );
}
