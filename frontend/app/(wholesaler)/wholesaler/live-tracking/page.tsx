'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { useRealtimeLocation } from '@/hooks';

interface Partner {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'available' | 'busy' | 'offline';
  currentOrderCount: number;
  currentLocation?: {
    lat: number;
    lng: number;
    accuracy: number;
    updatedAt: Date;
  };
}

interface ActiveOrder {
  id: string;
  orderNumber: string;
  partnerId?: string;
  status: string;
  deliveryAddress?: {
    coordinates: { latitude: number; longitude: number };
    fullAddress: string;
  };
}

export default function LiveTrackingPage() {
  const { user } = useAuth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Use real-time location hook
  const { currentLocation } = useRealtimeLocation({
    onLocationUpdate: (update) => {
      // Update partner location in real-time
      setPartners(prev => prev.map(p => 
        p.id === update.partnerId 
          ? {
              ...p,
              currentLocation: {
                lat: update.location.lat,
                lng: update.location.lng,
                accuracy: update.location.accuracy,
                updatedAt: new Date(update.timestamp),
              },
            }
          : p
      ));
    },
  });

  // Fetch active partners and orders
  useEffect(() => {
    if (!user) return;
    
    fetchActiveData();

    // Auto-refresh every 30 seconds if enabled
    if (autoRefresh) {
      const interval = setInterval(fetchActiveData, 30000);
      return () => clearInterval(interval);
    }
  }, [user, autoRefresh]);

  const fetchActiveData = async () => {
    if (!user) return;

    try {
      const token = await user.getIdToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

      // Fetch active partners
      const partnersResponse = await fetch(`${apiUrl}/delivery-assignments/partners/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (partnersResponse.ok) {
        const partnersData = await partnersResponse.json();
        setPartners(partnersData.partners || []);
      }

      // Fetch active orders
      const ordersResponse = await fetch(`${apiUrl}/orders?status=ASSIGNED,PICKED_UP`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        setActiveOrders(ordersData.orders || []);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return '🟢';
      case 'busy': return '🟡';
      case 'offline': return '⚪';
      default: return '⚪';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">📍</div>
          <p className="text-slate-600 text-xl">Loading live tracking...</p>
        </div>
      </div>
    );
  }

  const selectedPartnerData = partners.find(p => p.id === selectedPartner);
  const partnerOrders = activeOrders.filter(o => o.partnerId === selectedPartner);

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Live Tracking</h1>
            <p className="text-sm text-slate-600 mt-1">
              {partners.length} active partners • {activeOrders.length} active deliveries
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                autoRefresh
                  ? 'bg-green-100 text-green-700'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {autoRefresh ? '🔄 Auto-refresh ON' : '⏸️ Auto-refresh OFF'}
            </button>

            <button
              onClick={fetchActiveData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              🔄 Refresh Now
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Partners Sidebar */}
        <div className="w-80 bg-white border-r border-slate-200 overflow-y-auto">
          <div className="p-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">Active Partners</h2>
          </div>

          <div className="divide-y divide-slate-100">
            {partners.map(partner => (
              <button
                key={partner.id}
                onClick={() => setSelectedPartner(partner.id)}
                className={`w-full p-4 text-left hover:bg-slate-50 transition-colors ${
                  selectedPartner === partner.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 text-3xl">
                    {getStatusIcon(partner.status)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-slate-900 truncate">
                        {partner.name}
                      </h3>
                      <span className={`w-2 h-2 rounded-full ${getStatusColor(partner.status)}`} />
                    </div>

                    <p className="text-xs text-slate-600 mb-1 truncate">
                      {partner.phone}
                    </p>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500">
                        {partner.currentOrderCount} active
                      </span>
                      {partner.currentLocation && (
                        <span className="text-green-600">
                          📍 {new Date(partner.currentLocation.updatedAt).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}

            {partners.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                <div className="text-4xl mb-2">🚫</div>
                <p className="text-sm">No active partners</p>
              </div>
            )}
          </div>
        </div>

        {/* Map/Details Area */}
        <div className="flex-1 overflow-auto">
          {selectedPartnerData ? (
            <div className="p-6">
              {/* Partner Details */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-4xl">{getStatusIcon(selectedPartnerData.status)}</span>
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">
                          {selectedPartnerData.name}
                        </h2>
                        <p className="text-sm text-slate-600">
                          Status: <span className="capitalize font-medium">{selectedPartnerData.status}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedPartner(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-600 mb-1">Phone</p>
                    <p className="text-sm font-medium text-slate-900">{selectedPartnerData.phone}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-600 mb-1">Email</p>
                    <p className="text-sm font-medium text-slate-900 truncate">{selectedPartnerData.email}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-600 mb-1">Active Orders</p>
                    <p className="text-sm font-medium text-slate-900">{selectedPartnerData.currentOrderCount}</p>
                  </div>
                </div>

                {selectedPartnerData.currentLocation && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-green-600">📍</span>
                      <span className="text-green-700 font-medium">Last location update:</span>
                      <span className="text-green-600">
                        {new Date(selectedPartnerData.currentLocation.updatedAt).toLocaleString()}
                      </span>
                      <span className="text-green-600">
                        (±{selectedPartnerData.currentLocation.accuracy}m)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Active Orders */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">
                  Active Deliveries ({partnerOrders.length})
                </h3>

                {partnerOrders.length > 0 ? (
                  <div className="space-y-3">
                    {partnerOrders.map(order => (
                      <div
                        key={order.id}
                        className="p-4 bg-slate-50 rounded-lg border border-slate-200"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-sm font-semibold text-slate-900">
                            {order.orderNumber}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            order.status === 'PICKED_UP'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {order.status.replace(/_/g, ' ')}
                          </span>
                        </div>

                        {order.deliveryAddress && (
                          <p className="text-sm text-slate-600">
                            📍 {order.deliveryAddress.fullAddress}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <div className="text-4xl mb-2">📦</div>
                    <p className="text-sm">No active deliveries</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              <div className="text-center">
                <div className="text-6xl mb-4">🗺️</div>
                <p className="text-xl">Select a partner to view details</p>
                <p className="text-sm mt-2">Click on any partner from the sidebar</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
