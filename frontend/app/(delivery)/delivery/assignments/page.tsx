/**
 * Assignment Notification Screen - Phase 5
 * Mobile-first, modern UI for delivery partners
 * 
 * Design features:
 * - Full-screen modal on mobile
 * - 60px+ touch targets
 * - Responsive: 360px - 768px+
 * - Emoji icons, minimal text
 * - Countdown timer with visual feedback
 * - Swipe-friendly on mobile
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/client';

interface Assignment {
  assignmentId: string;
  orderId: string;
  customerName: string;
  distance: number;
  earnings: number;
  remainingSeconds: number;
  orderNumber: string;
  deliveryAddress: string;
}

export default function AssignmentsPage() {
  const router = useRouter();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);

  // Fetch active assignment
  const fetchActiveAssignment = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const response = await fetch(
        'http://localhost:3001/api/delivery-assignments/partner/active',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.assignment) {
          const assignmentData = data.assignment;
          const timerInfo = data.timerInfo;

          setAssignment({
            assignmentId: assignmentData.assignmentId,
            orderId: assignmentData.orderId,
            customerName: 'Customer', // Will be populated from order details
            distance: assignmentData.partnerDistanceFromShop,
            earnings: Math.ceil(assignmentData.partnerDistanceFromShop * 15),
            remainingSeconds: timerInfo?.remainingSeconds || 60,
            orderNumber: assignmentData.orderId.slice(-8).toUpperCase(),
            deliveryAddress: 'Delivery location', // Will be populated
          });

          setTimeLeft(timerInfo?.remainingSeconds || 60);
        } else {
          setAssignment(null);
        }
      }
    } catch (error) {
      console.error('Error fetching assignment:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchActiveAssignment();
  }, [fetchActiveAssignment]);

  // Countdown timer
  useEffect(() => {
    if (!assignment || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Auto-decline on timeout
          handleResponse('decline', 'timeout');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [assignment, timeLeft]);

  const handleResponse = async (response: 'accept' | 'decline', reason?: string) => {
    if (!assignment || responding) return;

    setResponding(true);

    try {
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const apiResponse = await fetch(
        `http://localhost:3001/api/delivery-assignments/${assignment.assignmentId}/respond`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ response, reason }),
        }
      );

      if (apiResponse.ok) {
        if (response === 'accept') {
          // Navigate to order details
          router.push(`/delivery/orders/${assignment.orderId}`);
        } else {
          // Clear assignment and go back
          setAssignment(null);
          router.push('/delivery');
        }
      }
    } catch (error) {
      console.error('Error responding to assignment:', error);
    } finally {
      setResponding(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = (): string => {
    if (timeLeft > 30) return 'text-green-400 border-green-500/30 bg-green-500/10';
    if (timeLeft > 15) return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
    return 'text-red-400 border-red-500/30 bg-red-500/10 animate-pulse';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">📦</div>
          <p className="text-white text-xl">Checking for assignments...</p>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="text-center max-w-md w-full">
          <div className="bg-slate-800 rounded-3xl p-8 shadow-2xl border border-slate-700">
            <div className="text-7xl mb-6">🔔</div>
            <h2 className="text-white text-2xl font-bold mb-3">
              No New Assignments
            </h2>
            <p className="text-slate-400 text-lg mb-6">
              You'll be notified when a delivery request arrives
            </p>
            <button
              onClick={() => router.push('/delivery')}
              className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold rounded-2xl transition-all active:scale-95"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Full-screen assignment modal - Mobile optimized */}
      <div className="flex-1 flex flex-col p-4 sm:p-6 max-w-2xl mx-auto w-full">
        {/* Hero Icon */}
        <div className="text-center pt-6 pb-4">
          <div className="text-8xl sm:text-9xl mb-4 animate-bounce">📦</div>
          <h1 className="text-white text-3xl sm:text-4xl font-bold">
            New Delivery!
          </h1>
        </div>

        {/* Order Card - Mobile friendly */}
        <div className="flex-1 flex flex-col justify-center pb-32">
          <div className="bg-slate-800/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-slate-700/50 shadow-2xl">
            {/* Customer Info */}
            <div className="flex items-start gap-4 mb-6 pb-6 border-b border-slate-700">
              <span className="text-5xl sm:text-6xl">👤</span>
              <div className="flex-1 min-w-0">
                <p className="text-slate-400 text-sm mb-1">Customer</p>
                <p className="text-white text-2xl sm:text-3xl font-semibold truncate">
                  {assignment.customerName}
                </p>
                <p className="text-slate-500 text-sm mt-1 truncate">
                  Order #{assignment.orderNumber}
                </p>
              </div>
            </div>

            {/* Distance */}
            <div className="flex items-start gap-4 mb-6 pb-6 border-b border-slate-700">
              <span className="text-5xl sm:text-6xl">📍</span>
              <div className="flex-1">
                <p className="text-slate-400 text-sm mb-1">Distance</p>
                <p className="text-white text-2xl sm:text-3xl font-semibold">
                  {assignment.distance.toFixed(1)} km away
                </p>
              </div>
            </div>

            {/* Earnings - Highlighted */}
            <div className="flex items-start gap-4 mb-6">
              <span className="text-5xl sm:text-6xl">💰</span>
              <div className="flex-1">
                <p className="text-slate-400 text-sm mb-1">You'll earn</p>
                <p className="text-green-400 text-4xl sm:text-5xl font-bold">
                  ₹{assignment.earnings}
                </p>
              </div>
            </div>

            {/* Timer - Dynamic color */}
            <div
              className={`text-center p-6 sm:p-8 rounded-2xl border-2 transition-all ${getTimerColor()}`}
            >
              <p className="text-sm sm:text-base mb-2 font-medium">Time to respond</p>
              <p className="text-5xl sm:text-6xl font-mono font-bold tracking-wider">
                {formatTime(timeLeft)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Actions - Always visible on mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 via-slate-900 to-transparent p-4 sm:p-6 pb-safe">
        <div className="max-w-2xl mx-auto grid grid-cols-2 gap-3 sm:gap-4">
          {/* Accept Button - Left, Green */}
          <button
            onClick={() => handleResponse('accept')}
            disabled={responding}
            className="h-20 sm:h-24 bg-green-600 hover:bg-green-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl sm:rounded-3xl shadow-2xl shadow-green-600/50 transition-all flex flex-col items-center justify-center gap-1"
          >
            <span className="text-4xl sm:text-5xl">✅</span>
            <span className="text-xl sm:text-2xl font-bold">Accept</span>
          </button>

          {/* Decline Button - Right, Red */}
          <button
            onClick={() => handleResponse('decline', 'declined_by_partner')}
            disabled={responding}
            className="h-20 sm:h-24 bg-red-600 hover:bg-red-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl sm:rounded-3xl shadow-2xl shadow-red-600/50 transition-all flex flex-col items-center justify-center gap-1"
          >
            <span className="text-4xl sm:text-5xl">❌</span>
            <span className="text-xl sm:text-2xl font-bold">Decline</span>
          </button>
        </div>
      </div>

      {/* Safe area for mobile devices */}
      <style jsx global>{`
        .pb-safe {
          padding-bottom: max(1rem, env(safe-area-inset-bottom));
        }
      `}</style>
    </div>
  );
}
