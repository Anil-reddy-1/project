/**
 * Loading State Components
 * Task #19: Loading/error state components
 * 
 * Skeleton loaders for async data loading states
 */

'use client';

export function CheckoutSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 animate-pulse">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Skeleton */}
        <div className="h-10 w-48 bg-gray-300 rounded mb-8" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Skeleton */}
          <div className="lg:col-span-2 space-y-6">
            {/* Address Section */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="h-6 w-40 bg-gray-300 rounded mb-4" />
              <div className="space-y-3">
                <div className="h-32 bg-gray-200 rounded" />
                <div className="h-32 bg-gray-200 rounded" />
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="h-6 w-32 bg-gray-300 rounded mb-4" />
              <div className="space-y-3">
                <div className="h-24 bg-gray-200 rounded" />
                <div className="h-24 bg-gray-200 rounded" />
              </div>
            </div>

            {/* Place Order */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="h-12 bg-gray-300 rounded" />
            </div>
          </div>

          {/* Sidebar Skeleton */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="h-6 w-32 bg-gray-300 rounded mb-4" />
              <div className="space-y-4">
                <div className="h-20 bg-gray-200 rounded" />
                <div className="h-20 bg-gray-200 rounded" />
                <div className="h-20 bg-gray-200 rounded" />
              </div>
              <div className="border-t border-gray-200 mt-4 pt-4">
                <div className="h-8 bg-gray-300 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OrderListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="h-5 w-32 bg-gray-300 rounded mb-2" />
              <div className="h-4 w-48 bg-gray-200 rounded" />
            </div>
            <div className="h-6 w-24 bg-gray-300 rounded" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full bg-gray-200 rounded" />
            <div className="h-4 w-3/4 bg-gray-200 rounded" />
          </div>
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
            <div className="h-6 w-24 bg-gray-300 rounded" />
            <div className="h-8 w-28 bg-gray-300 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function OrderDetailsSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <div className="h-8 w-48 bg-gray-300 rounded mb-2" />
            <div className="h-4 w-32 bg-gray-200 rounded" />
          </div>
          <div className="h-8 w-32 bg-gray-300 rounded" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Timeline */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="h-6 w-32 bg-gray-300 rounded mb-4" />
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-gray-300 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 w-48 bg-gray-300 rounded mb-2" />
                  <div className="h-3 w-32 bg-gray-200 rounded" />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 w-48 bg-gray-200 rounded mb-2" />
                  <div className="h-3 w-32 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="h-6 w-24 bg-gray-300 rounded mb-4" />
            <div className="space-y-4">
              <div className="h-24 bg-gray-200 rounded" />
              <div className="h-24 bg-gray-200 rounded" />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="h-6 w-32 bg-gray-300 rounded mb-4" />
            <div className="space-y-3">
              <div className="h-4 w-full bg-gray-200 rounded" />
              <div className="h-4 w-full bg-gray-200 rounded" />
              <div className="h-4 w-full bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PaymentProcessingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4" />
        <div className="h-6 w-48 bg-gray-300 rounded mx-auto mb-2 animate-pulse" />
        <div className="h-4 w-64 bg-gray-200 rounded mx-auto animate-pulse" />
      </div>
    </div>
  );
}

export function AddressListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 border-2 border-gray-200 rounded-lg">
          <div className="h-4 w-3/4 bg-gray-300 rounded mb-2" />
          <div className="h-3 w-full bg-gray-200 rounded mb-1" />
          <div className="h-3 w-1/2 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
}

export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-4',
  };

  return (
    <div
      className={`animate-spin rounded-full border-blue-600 border-t-transparent ${sizeClasses[size]}`}
    />
  );
}

export function PageLoader() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
