/**
 * Order Details Page - Delivery Partner View
 * Mobile-optimized with large buttons and clear visual hierarchy
 * 
 * Features:
 * - Pickup location with call/navigate
 * - Delivery location with call/navigate
 * - Order items list
 * - Status tracking
 * - OTP verification
 * - Photo proof upload
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/client';
import { navigationService } from '@/lib/services/navigation.service';

interface Order {
  orderId: string;
  orderNumber: string;
  state: string;
  
  // Shop details (pickup)
  shopDetails: {
    name: string;
    phone: string;
    address: string;
    location: {
      latitude: number;
      longitude: number;
    };
  };
  
  // Retailer details (delivery)
  retailerSnapshot: {
    name: string;
    phone: string;
  };
  
  deliveryAddress: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    pincode: string;
    landmark?: string;
  };
  
  // Order items
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
  }>;
  
  // Payment
  paymentMethod: string;
  grandTotal: number;
  
  // OTPs
  pickupOTP?: string;
  deliveryOTP?: string;
  
  // COD
  codAmount?: number;
}

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.orderId as string;
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickupOTP, setPickupOTP] = useState('');
  const [deliveryOTP, setDeliveryOTP] = useState('');
  const [photoProof, setPhotoProof] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const response = await fetch(`http://localhost:3001/api/orders/${orderId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrder(data.data);
      }
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  const makeCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const openNavigation = (latitude: number, longitude: number, label: string) => {
    navigationService.navigateTo({
      latitude,
      longitude,
      label,
      mode: 'driving',
    });
  };

  const verifyPickup = async () => {
    if (!pickupOTP || pickupOTP.length !== 6) {
      alert('Please enter 6-digit pickup OTP');
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const response = await fetch(
        `http://localhost:3001/api/orders/${orderId}/verify-pickup`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ otp: pickupOTP }),
        }
      );

      if (response.ok) {
        alert('✅ Pickup verified!');
        await fetchOrderDetails();
      } else {
        const error = await response.json();
        alert(`❌ ${error.message || 'Invalid OTP'}`);
      }
    } catch (error) {
      console.error('Error verifying pickup:', error);
      alert('Error verifying pickup');
    }
  };

  const verifyDelivery = async () => {
    if (!deliveryOTP || deliveryOTP.length !== 6) {
      alert('Please enter 6-digit delivery OTP');
      return;
    }

    try {
      setUploading(true);
      const user = auth.currentUser;
      if (!user) return;

      let photoProofUrl: string | undefined;

      // Upload photo if provided
      if (photoProof) {
        const token = await user.getIdToken();
        const formData = new FormData();
        formData.append('file', photoProof);
        formData.append('folder', 'delivery_proof');

        const uploadResponse = await fetch('http://localhost:3001/api/upload', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          photoProofUrl = uploadData.url;
        }
      }

      // Verify delivery with OTP
      const token = await user.getIdToken();
      const response = await fetch(
        `http://localhost:3001/api/orders/${orderId}/verify-delivery`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            otp: deliveryOTP,
            photoProofUrl,
          }),
        }
      );

      if (response.ok) {
        alert('✅ Delivery completed successfully!');
        router.push('/delivery');
      } else {
        const error = await response.json();
        alert(`❌ ${error.message || 'Invalid OTP'}`);
      }
    } catch (error) {
      console.error('Error verifying delivery:', error);
      alert('Error verifying delivery');
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPhotoProof(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoProof(null);
    setPhotoPreview(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">📦</div>
          <p className="text-white text-xl">Loading order...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <p className="text-white text-xl mb-6">Order not found</p>
          <button
            onClick={() => router.push('/delivery')}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const statusColor =
    order.state === 'DELIVERED'
      ? 'bg-green-600'
      : order.state === 'PICKED_UP' || order.state === 'ON_THE_WAY'
      ? 'bg-blue-600'
      : 'bg-yellow-600';

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-white text-xl font-bold">
              Order #{order.orderNumber}
            </h1>
            <span className={`${statusColor} text-white text-sm px-3 py-1 rounded-full font-medium`}>
              {order.state}
            </span>
          </div>
          <p className="text-slate-400 text-sm">
            {order.items.length} items • ₹{order.grandTotal}
          </p>
        </div>

        {/* PICKUP SECTION */}
        <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-4xl">🏪</div>
            <div>
              <p className="text-slate-400 text-sm">Pickup From</p>
              <h2 className="text-white text-2xl font-bold">{order.shopDetails.name}</h2>
            </div>
          </div>

          <div className="bg-slate-700/50 rounded-2xl p-4 mb-4">
            <p className="text-slate-300 text-base leading-relaxed">
              {order.shopDetails.address}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => makeCall(order.shopDetails.phone)}
              className="h-14 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span className="text-2xl">📞</span>
              <span>Call</span>
            </button>

            <button
              onClick={() =>
                openNavigation(
                  order.shopDetails.location.latitude,
                  order.shopDetails.location.longitude,
                  order.shopDetails.name
                )
              }
              className="h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span className="text-2xl">📍</span>
              <span>Navigate</span>
            </button>
          </div>

          {/* Pickup OTP */}
          {order.state === 'ASSIGNED' && (
            <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl">
              <p className="text-yellow-400 text-sm font-medium mb-3">
                Enter Pickup OTP from Shop
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={pickupOTP}
                  onChange={(e) => setPickupOTP(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="flex-1 h-14 bg-slate-900 border-2 border-yellow-500/30 rounded-xl text-white text-center text-2xl font-mono tracking-widest focus:border-yellow-500 focus:outline-none"
                />
                <button
                  onClick={verifyPickup}
                  disabled={pickupOTP.length !== 6}
                  className="h-14 px-6 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all active:scale-95"
                >
                  Verify
                </button>
              </div>
            </div>
          )}

          {order.state === 'PICKED_UP' && (
            <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-2xl">
              <p className="text-green-400 font-medium text-center flex items-center justify-center gap-2">
                <span className="text-2xl">✅</span>
                <span>Picked Up Successfully</span>
              </p>
            </div>
          )}
        </div>

        {/* DELIVERY SECTION */}
        <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-4xl">👤</div>
            <div>
              <p className="text-slate-400 text-sm">Deliver To</p>
              <h2 className="text-white text-2xl font-bold">
                {order.deliveryAddress.fullName}
              </h2>
            </div>
          </div>

          <div className="bg-slate-700/50 rounded-2xl p-4 mb-4">
            <p className="text-slate-300 text-base leading-relaxed">
              {order.deliveryAddress.addressLine1}
              {order.deliveryAddress.addressLine2 && `, ${order.deliveryAddress.addressLine2}`}
              <br />
              {order.deliveryAddress.city}, {order.deliveryAddress.pincode}
              {order.deliveryAddress.landmark && (
                <>
                  <br />
                  <span className="text-slate-400">📍 {order.deliveryAddress.landmark}</span>
                </>
              )}
            </p>
          </div>

          {/* COD Amount */}
          {order.paymentMethod === 'cod' && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-4">
              <p className="text-red-400 text-sm mb-1">Collect Cash on Delivery</p>
              <p className="text-red-300 text-3xl font-bold">₹{order.grandTotal}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => makeCall(order.deliveryAddress.phone)}
              className="h-14 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span className="text-2xl">📞</span>
              <span>Call</span>
            </button>

            <button
              onClick={() => {
                // Note: We don't have lat/lng for delivery address yet
                // This would need geocoding or user to provide coordinates
                alert('Navigation to delivery address coming soon');
              }}
              className="h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span className="text-2xl">📍</span>
              <span>Navigate</span>
            </button>
          </div>

          {/* Delivery OTP */}
          {order.state === 'PICKED_UP' && (
            <div className="mt-4 space-y-4">
              {/* Photo Proof Section */}
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-2xl">
                <p className="text-blue-400 text-sm font-medium mb-3">
                  📸 Delivery Proof Photo (Optional)
                </p>

                {!photoPreview ? (
                  <label className="block">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoCapture}
                      className="hidden"
                    />
                    <div className="h-32 bg-slate-900 border-2 border-dashed border-blue-500/30 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 transition-all active:scale-95">
                      <span className="text-4xl mb-2">📷</span>
                      <span className="text-blue-400 text-sm font-medium">
                        Tap to take photo
                      </span>
                    </div>
                  </label>
                ) : (
                  <div className="relative">
                    <img
                      src={photoPreview}
                      alt="Delivery proof"
                      className="w-full h-48 object-cover rounded-xl"
                    />
                    <button
                      onClick={removePhoto}
                      className="absolute top-2 right-2 w-10 h-10 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* OTP Input */}
              <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-2xl">
                <p className="text-purple-400 text-sm font-medium mb-3">
                  Enter Delivery OTP from Customer
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={deliveryOTP}
                    onChange={(e) => setDeliveryOTP(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="flex-1 h-14 bg-slate-900 border-2 border-purple-500/30 rounded-xl text-white text-center text-2xl font-mono tracking-widest focus:border-purple-500 focus:outline-none"
                  />
                  <button
                    onClick={verifyDelivery}
                    disabled={deliveryOTP.length !== 6 || uploading}
                    className="h-14 px-6 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        <span className="text-sm">Uploading...</span>
                      </>
                    ) : (
                      <span>Deliver</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Order Items */}
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">📦</span>
            Items ({order.items.length})
          </h3>
          <div className="space-y-3">
            {order.items.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-slate-700/50 rounded-xl"
              >
                <div className="flex-1">
                  <p className="text-white font-medium">{item.productName}</p>
                  <p className="text-slate-400 text-sm">
                    Qty: {item.quantity} × ₹{item.unitPrice}
                  </p>
                </div>
                <p className="text-green-400 font-bold text-lg">
                  ₹{item.quantity * item.unitPrice}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
