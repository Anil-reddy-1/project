/**
 * Wishlist Page (Buyer)
 * View and manage saved/favorite products
 */

import { DashboardLayout } from '../../components/layout';
import { ProductCard } from '../../components/products';
import { LoadingSpinner } from '../../components/ui';
import { useWishlist } from '../../hooks/useWishlist';
import { useCart } from '../../context/CartContext';
import { Heart } from 'lucide-react';
import { showSuccessToast, showErrorToast } from '../../utils/toast';

export function Wishlist() {
  const {
    wishlistItems,
    wishlistCount,
    loading,
    error,
    removeFromWishlist,
    clearWishlist,
    refetch,
  } = useWishlist();

  const { addToCart, isInCart } = useCart();

  // Handle remove from wishlist
  const handleRemoveFromWishlist = async (productId: string) => {
    const success = await removeFromWishlist(productId);
    if (success) {
      // Wishlist is automatically refetched in the hook
    }
  };

  // Handle add to cart
  const handleAddToCart = async (productId: string) => {
    try {
      // Check if already in cart
      if (isInCart(productId)) {
        showErrorToast('This product is already in your cart');
        return;
      }

      // Add to cart with default quantity of 1
      await addToCart(productId, 1);
      showSuccessToast('Product added to cart successfully!');
    } catch (error) {
      console.error('Failed to add to cart:', error);
      showErrorToast('Failed to add product to cart');
    }
  };

  // Handle clear all
  const handleClearAll = async () => {
    if (wishlistItems.length === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to remove all ${wishlistCount} items from your wishlist?`
    );
    
    if (confirmed) {
      await clearWishlist();
    }
  };

  if (loading && wishlistItems.length === 0) {
    return (
      <DashboardLayout>
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-6 border-b border-ivory-200">
          <div>
            <p className="shop-eyebrow">Saved for you</p>
            <h1 className="shop-title mt-2">Wishlist</h1>
            <p className="shop-subtitle mt-2">
              {wishlistCount > 0
                ? `You have ${wishlistCount} ${wishlistCount === 1 ? 'item' : 'items'} in your wishlist`
                : 'Your wishlist is empty'}
            </p>
          </div>

          {/* Actions */}
          {wishlistCount > 0 && (
            <div className="flex flex-wrap gap-2">
              <button onClick={refetch} className="shop-btn-outline h-10 px-5">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.75}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh
              </button>
              <button
                onClick={handleClearAll}
                className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-full border border-red-200 bg-white text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="px-4 py-3.5 bg-red-50 border border-red-200 rounded-2xl">
            <p className="text-sm text-red-700">Error: {error}</p>
          </div>
        )}

        {/* Empty State */}
        {wishlistCount === 0 && !loading ? (
          <div className="shop-card px-6 py-14 sm:py-20 text-center">
            <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-ivory-50 border border-ivory-300 flex items-center justify-center ring-1 ring-brass-100 ring-offset-4">
              <Heart className="w-7 h-7 text-ink" strokeWidth={1.25} />
            </div>
            <h2 className="shop-heading text-2xl">Your wishlist is empty</h2>
            <p className="shop-subtitle mt-2 max-w-sm mx-auto">
              Start adding products to your wishlist to save them for later
            </p>
            <button
              onClick={() => (window.location.href = '/buyer/products')}
              className="shop-btn-primary mt-8"
            >
              Browse products
            </button>
          </div>
        ) : (
          <>
            {/* Wishlist Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
              {wishlistItems.map((item) => (
                <ProductCard
                  key={item.wishlistId}
                  product={item.product}
                  isInWishlist={true}
                  onWishlistToggle={handleRemoveFromWishlist}
                  onAddToCart={handleAddToCart}
                  showRemoveButton={true}
                />
              ))}
            </div>

            {/* Loading State */}
            {loading && wishlistItems.length > 0 && (
              <div className="text-center py-4" role="status" aria-label="Loading">
                <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-ivory-300 border-t-ink"></div>
              </div>
            )}
          </>
        )}

        {/* Info Card */}
        {wishlistCount > 0 && (
          <div className="rounded-2xl border border-ivory-200 bg-ivory-50 p-6 sm:p-8">
            <p className="shop-eyebrow">Good to know</p>
            <h3 className="shop-heading mt-1.5 mb-4">
              Wishlist tips
            </h3>
            <ul className="grid gap-4 sm:grid-cols-3 text-sm text-ink-700">
              <li className="flex items-start gap-3">
                <span className="font-display text-brass-600 tabular-nums">01</span>
                <span className="leading-relaxed">
                  Your wishlist is saved and synced across all your devices
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-display text-brass-600 tabular-nums">02</span>
                <span className="leading-relaxed">
                  Click the heart icon on any product to add it to your wishlist
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-display text-brass-600 tabular-nums">03</span>
                <span className="leading-relaxed">
                  Quickly add wishlist items to cart when you're ready to purchase
                </span>
              </li>
            </ul>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
