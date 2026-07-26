/**
 * Delivery History Page
 * Shows completed deliveries with earnings
 * 
 * Features:
 * - List of completed deliveries
 * - Earnings per delivery
 * - Date/time stamps
 * - Filter by date range
 * - Total earnings summary
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/client';

interface DeliveryRecord {
  orderId: string;
  orderNumber: string;
  deliveredAt: any;
  customerName: string;
  deliveryAddress: string;
  distance: number;
  earnings: number;
  rating?: number;
  tip?: number;
}

export default function HistoryPage() {
  const router = useRouter();
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'today' | 'week' | 'month' | 'all'>('today');

  useEffect(() => {
    fetchDeliveryHistory();
  }, [filter]);

  const fetchDeliveryHistory = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      
      // Fetch completed orders for this partner
      const response = await fetch(
        `http://localhost:3001/api/orders?state=DELIVERED&limit=50`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const orders = data.data || [];

        // Transform to delivery records with earnings calculation
        const records: DeliveryRecord[] = orders.map((order: any) => ({
          orderId: order.orderId,
          orderNumber: order.orderNumber,
          deliveredAt: order.deliveredAt,
          customerName: order.deliveryAddress?.fullName || 'Customer',
          deliveryAddress: order.deliveryAddress?.city || 'Location',
          distance: 3, // Mock - would come from actual tracking
          earnings: 45, // ₹15/km × 3km average
          rating: 4.5,
          tip: 0,
        }));

        // Apply date filter
        const filtered = filterByDate(records, filter);
        setDeliveries(filtered);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterByDate = (
    records: DeliveryRecord[],
    filter: string
  ): DeliveryRecord[] => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return records.filter((record) => {
      if (!record.deliveredAt) return false;

      const deliveryDate = record.deliveredAt.toDate
        ? record.deliveredAt.toDate()
        : new Date(record.deliveredAt);

      switch (filter) {
        case 'today':
          return deliveryDate >= today;
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return deliveryDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return deliveryDate >= monthAgo;
        case 'all':
        default:
          return true;
      }
    });
  };

  const totalEarnings = deliveries.reduce((sum, d) => sum + d.earnings + (d.tip || 0), 0);
  const totalDistance = deliveries.reduce((sum, d) => sum + d.distance, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">📜</div>
          <p className="text-white text-xl">Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
          <h1 className="text-white text-2xl font-bold mb-2 flex items-center gap-2">
            <span className="text-3xl">📜</span>
            Delivery History
          </h1>
          <p className="text-slate-400 text-sm">
            {deliveries.length} deliveries • {totalDistance.toFixed(1)} km
          </p>
        </div>

        {/* Summary Card */}
        <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm mb-1">
                {filter === 'today'
                  ? 'Today's Earnings'
                  : filter === 'week'
                  ? 'This Week'
                  : filter === 'month'
                  ? 'This Month'
                  : 'Total Earnings'}
              </p>
              <p className="text-white text-4xl font-bold">₹{totalEarnings}</p>
              <p className="text-green-100 text-sm mt-2">
                {deliveries.length} {deliveries.length === 1 ? 'delivery' : 'deliveries'}
              </p>
            </div>
            <div className="text-6xl">💰</div>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="grid grid-cols-4 gap-2">
          {(['today', 'week', 'month', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`h-12 rounded-xl font-medium text-sm transition-all ${
                filter === f
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/50'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              {f === 'today' ? 'Today' : f === 'week' ? 'Week' : f === 'month' ? 'Month' : 'All'}
            </button>
          ))}
        </div>

        {/* Deliveries List */}
        <div className="space-y-3">
          {deliveries.length === 0 ? (
            <div className="bg-slate-800 rounded-2xl p-12 text-center border border-slate-700">
              <div className="text-6xl mb-4">📦</div>
              <p className="text-slate-400 text-lg">No deliveries yet</p>
              <p className="text-slate-500 text-sm mt-2">
                Complete your first delivery to see it here
              </p>
            </div>
          ) : (
            deliveries.map((delivery) => (
              <div
                key={delivery.orderId}
                onClick={() => router.push(`/delivery/orders/${delivery.orderId}`)}
                className="bg-slate-800 rounded-2xl p-4 border border-slate-700 hover:border-slate-600 transition-all cursor-pointer active:scale-98"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">✅</span>
                      <h3 className="text-white font-bold text-lg">
                        {delivery.customerName}
                      </h3>
                    </div>
                    <p className="text-slate-400 text-sm">
                      Order #{delivery.orderNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 text-2xl font-bold">
                      ₹{delivery.earnings}
                    </p>
                    {delivery.tip && delivery.tip > 0 && (
                      <p className="text-yellow-400 text-xs">+₹{delivery.tip} tip</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-slate-400">
                  <span className="flex items-center gap-1">
                    📍 {delivery.distance.toFixed(1)} km
                  </span>
                  <span className="flex items-center gap-1">
                    📍 {delivery.deliveryAddress}
                  </span>
                  {delivery.rating && (
                    <span className="flex items-center gap-1">
                      ⭐ {delivery.rating.toFixed(1)}
                    </span>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-slate-700">
                  <p className="text-slate-500 text-xs">
                    {delivery.deliveredAt?.toDate
                      ? delivery.deliveredAt.toDate().toLocaleString()
                      : new Date(delivery.deliveredAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Back Button */}
        <button
          onClick={() => router.push('/delivery')}
          className="w-full h-14 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all active:scale-95 border border-slate-700"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
