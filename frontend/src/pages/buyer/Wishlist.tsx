/**
 * Wishlist Page (Buyer)
 * View and manage saved/favorite products
 */

import { DashboardLayout } from '../../components/layout';
import { ProductCard } from '../../components/products';
import { LoadingSpinner, EmptyState, ActionButton } from '../../components/ui';
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Heart className="w-8 h-8 text-red-500 fill-red-500" />
              My Wishlist
            </h1>
            <p className="text-gray-600 mt-1">
              {wishlistCount > 0
                ? `You have ${wishlistCount} ${wishlistCount === 1 ? 'item' : 'items'} in your wishlist`
                : 'Your wishlist is empty'}
            </p>
          </div>

          {/* Actions */}
          {wishlistCount > 0 && (
            <div className="flex gap-3">
              <ActionButton variant="secondary" onClick={refetch}>
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh
              </ActionButton>
              <ActionButton variant="danger" onClick={handleClearAll}>
                Clear All
              </ActionButton>
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">Error: {error}</p>
          </div>
        )}

        {/* Empty State */}
        {wishlistCount === 0 && !loading ? (
          <EmptyState
            icon={Heart}
            title="Your wishlist is empty"
            description="Start adding products to your wishlist to save them for later"
            action={
              <ActionButton
                variant="primary"
                onClick={() => (window.location.href = '/buyer/products')}
              >
                Browse Products
              </ActionButton>
            }
          />
        ) : (
          <>
            {/* Wishlist Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            )}
          </>
        )}

        {/* Info Card */}
        {wishlistCount > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              💡 Wishlist Tips
            </h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>
                  Your wishlist is saved and synced across all your devices
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>
                  Click the heart icon on any product to add it to your wishlist
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>
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
