/**
 * CartLoadingSkeleton Component
 * Loading skeleton for cart page while data is being fetched
 */

import { Skeleton } from '../ui';

interface CartLoadingSkeletonProps {
  itemCount?: number;
  showSidebar?: boolean;
  showSavedSection?: boolean;
}

export function CartLoadingSkeleton({
  itemCount = 3,
  showSidebar = true,
  showSavedSection = false,
}: CartLoadingSkeletonProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cart Items Section */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            {/* Section Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
              <Skeleton className="h-6 w-40" />
            </div>

            {/* Cart Items */}
            <div className="p-6 space-y-4">
              {Array.from({ length: itemCount }).map((_, index) => (
                <CartItemSkeleton key={index} />
              ))}
            </div>
          </div>

          {/* Saved Items Section */}
          {showSavedSection && (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              {/* Section Header */}
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-5 w-5 rounded" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <div className="lg:col-span-1">
            <InvoiceSidebarSkeleton />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Skeleton for individual cart item card
 */
function CartItemSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex gap-4">
        {/* Image */}
        <Skeleton className="w-24 h-24 rounded-lg flex-shrink-0" />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="hidden sm:block text-right space-y-1">
              <Skeleton className="h-6 w-20 ml-auto" />
              <Skeleton className="h-3 w-24 ml-auto" />
            </div>
          </div>

          {/* Badges Row */}
          <div className="flex gap-2 mb-3">
            <Skeleton className="h-6 w-20 rounded-md" />
            <Skeleton className="h-6 w-24 rounded-md" />
          </div>

          {/* Controls Row */}
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-9 w-32 rounded-lg" />
            <div className="hidden sm:block w-px h-6 bg-slate-200" />
            <div className="flex gap-2">
              <Skeleton className="h-7 w-16 rounded-md" />
              <Skeleton className="h-7 w-20 rounded-md" />
              <Skeleton className="h-7 w-20 rounded-md" />
            </div>
          </div>

          {/* Mobile Price */}
          <div className="sm:hidden mt-3 pt-3 border-t border-slate-200">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for invoice sidebar
 */
function InvoiceSidebarSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden sticky top-6">
      {/* Header */}
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
        <Skeleton className="h-6 w-40" />
      </div>

      {/* Content */}
      <div className="px-6 py-5 space-y-5">
        {/* Stats */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-8" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>

        <div className="h-px bg-slate-200" />

        {/* Price Breakdown */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>

        <div className="h-px bg-slate-200" />

        {/* Total */}
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-8 w-32" />
        </div>

        {/* Alert Box */}
        <Skeleton className="h-20 w-full rounded-lg" />

        {/* Checkout Button */}
        <Skeleton className="h-12 w-full rounded-lg" />

        {/* Info Text */}
        <Skeleton className="h-3 w-full" />
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      </div>
    </div>
  );
}

/**
 * Simple loading skeleton for minimal cart view
 */
export function SimpleCartLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 2 }).map((_, index) => (
        <div key={index} className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex gap-3">
            <Skeleton className="w-16 h-16 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Loading skeleton for saved items section
 */
export function SavedItemsSkeleton({ itemCount = 2 }: { itemCount?: number }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-5 w-5 rounded" />
        </div>
      </div>

      {/* Items */}
      <div className="p-6 space-y-4">
        {Array.from({ length: itemCount }).map((_, index) => (
          <div key={index} className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex gap-4">
              <Skeleton className="w-20 h-20 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-24" />
                <div className="flex gap-2 mt-3">
                  <Skeleton className="h-7 w-24 rounded-md" />
                  <Skeleton className="h-7 w-20 rounded-md" />
                  <Skeleton className="h-7 w-20 rounded-md" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
