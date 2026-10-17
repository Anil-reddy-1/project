/**
 * Cart Page
 * Complete cart functionality with persistent storage, invoice, save-for-later, and address management
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Trash2, AlertCircle } from 'lucide-react';
import { DashboardLayout } from '../../components/layout';
import { useCart } from '../../hooks/useCart';
import {
  CartItemCard,
  InvoiceSidebar,
  SavedItemsSection,
  EmptyCartState,
  CartLoadingSkeleton,
} from '../../components/cart';
import { CartStockSummary, calculateStockStats } from '../../components/cart/StockWarning';
import { Alert } from '../../components/ui';
import { showSuccessToast, showErrorToast } from '../../utils/toast';
import { listContainerVariants, fadeVariants, transitions } from '../../utils/animations';

export function Cart() {
  const navigate = useNavigate();
  const {
    cartItems,
    savedItems,
    loading,
    error,
    updateQuantity,
    removeFromCart,
    clearCart,
    saveForLater,
    moveToCart,
    removeSavedItem,
    moveToWishlist,
  } = useCart();

  const [clearingCart, setClearingCart] = useState(false);

  // Calculate stock statistics
  const stockStats = useMemo(() => calculateStockStats(cartItems), [cartItems]);

  // Handler: Update item quantity
  const handleUpdateQuantity = async (productId: string, newQuantity: number) => {
    await updateQuantity(productId, newQuantity);
  };

  // Handler: Remove item from cart
  const handleRemoveItem = async (productId: string) => {
    await removeFromCart(productId);
  };

  // Handler: Save item for later
  const handleSaveForLater = async (productId: string) => {
    await saveForLater(productId);
  };

  // Handler: Move item to wishlist
  const handleMoveToWishlist = async (productId: string) => {
    await moveToWishlist(productId);
  };

  // Handler: Move saved item back to cart
  const handleMoveToCart = async (productId: string) => {
    await moveToCart(productId);
  };

  // Handler: Remove saved item
  const handleRemoveSavedItem = async (productId: string) => {
    await removeSavedItem(productId);
  };

  // Handler: Clear entire cart
  const handleClearCart = async () => {
    if (!window.confirm('Are you sure you want to clear your entire cart?')) {
      return;
    }

    setClearingCart(true);
    try {
      await clearCart();
      showSuccessToast('Cart cleared successfully');
    } catch (error) {
      showErrorToast('Failed to clear cart');
    } finally {
      setClearingCart(false);
    }
  };

  // Handler: Proceed to checkout
  const handleCheckout = () => {
    // Check for stock issues
    if (stockStats.outOfStockCount > 0 || stockStats.insufficientStockCount > 0) {
      showErrorToast('Please resolve stock issues before checkout');
      return;
    }
    
    // Navigate to checkout
    navigate('/buyer/checkout');
  };

  // Show loading skeleton
  if (loading) {
    return (
      <DashboardLayout title="Store" subtitle="My Cart">
        <CartLoadingSkeleton 
          itemCount={3} 
          showSidebar={true} 
          showSavedSection={false} 
        />
      </DashboardLayout>
    );
  }

  // Show error state
  if (error) {
    return (
      <DashboardLayout title="Store" subtitle="My Cart">
        <div className="max-w-2xl">
          <Alert variant="destructive" className="rounded-2xl">
            <AlertCircle className="h-4 w-4" />
            <div>
              <h3 className="font-display text-base font-medium">Failed to load cart</h3>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  // Show empty cart state
  if (cartItems.length === 0 && savedItems.length === 0) {
    return (
      <DashboardLayout title="Store" subtitle="My Cart">
        <EmptyCartState />
      </DashboardLayout>
    );
  }

  // Main cart view
  return (
    <DashboardLayout title="Store" subtitle="My Cart">
      <div className="w-full">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between pb-6 mb-8 border-b border-ivory-200">
          <div>
            <p className="shop-eyebrow">Your basket</p>
            <h1 className="shop-title mt-2">Shopping cart</h1>
            <p className="shop-subtitle mt-2">
              {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} ready for checkout
            </p>
          </div>

          {/* Clear Cart Button */}
          {cartItems.length > 0 && (
            <button
              onClick={handleClearCart}
              disabled={clearingCart}
              className="self-start sm:self-auto inline-flex items-center gap-2 h-10 px-4 rounded-full text-xs font-semibold text-red-600 border border-red-200 bg-white hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Clear entire cart"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {clearingCart ? 'Clearing...' : 'Clear cart'}
            </button>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
          {/* Left Column: Cart Items & Saved Items */}
          <div className="lg:col-span-2 space-y-8 min-w-0">
            {/* Cart Items Section */}
            {cartItems.length > 0 ? (
              <section>
                {/* Section Header */}
                <div className="flex items-baseline justify-between gap-3 mb-4">
                  <h2 className="shop-heading flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-brass-600" />
                    In your cart
                  </h2>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400 tabular-nums">
                    {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
                  </span>
                </div>

                {/* Cart Items List */}
                <motion.div
                  className="space-y-3"
                  variants={listContainerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {/* Stock Summary Warning */}
                  <AnimatePresence>
                    {(stockStats.hasStockIssues || stockStats.hasMOQViolations) && (
                      <motion.div
                        variants={fadeVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={transitions.normal}
                      >
                        <CartStockSummary
                          hasStockIssues={stockStats.hasStockIssues}
                          hasMOQViolations={stockStats.hasMOQViolations}
                          outOfStockCount={stockStats.outOfStockCount}
                          insufficientStockCount={stockStats.insufficientStockCount}
                          lowStockCount={stockStats.lowStockCount}
                          moqViolationCount={stockStats.moqViolationCount}
                          className="mb-4"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Cart Items */}
                  <AnimatePresence mode="popLayout">
                    {cartItems.map((item) => (
                      <CartItemCard
                        key={item.cartItemId}
                        item={item}
                        onQuantityChange={handleUpdateQuantity}
                        onRemove={handleRemoveItem}
                        onSaveForLater={handleSaveForLater}
                        onMoveToWishlist={handleMoveToWishlist}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              </section>
            ) : (
              // Show message if only saved items exist
              <div className="shop-card p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 shrink-0 rounded-full border border-ivory-300 bg-ivory-50 flex items-center justify-center text-brass-600">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-display text-lg font-medium text-ink">Your cart is empty</p>
                    <p className="text-sm text-stone-500 mt-1 leading-relaxed">
                      You have items saved for later below. Move them to cart when you're ready.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Saved Items Section */}
            {savedItems.length > 0 && (
              <SavedItemsSection
                savedItems={savedItems}
                onMoveToCart={handleMoveToCart}
                onRemove={handleRemoveSavedItem}
                onMoveToWishlist={handleMoveToWishlist}
                initiallyExpanded={cartItems.length === 0}
              />
            )}
          </div>

          {/* Right Column: Invoice Sidebar */}
          {cartItems.length > 0 && (
            <div className="lg:col-span-1">
              <InvoiceSidebar
                cartItems={cartItems}
                onCheckout={handleCheckout}
                sticky={true}
              />
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
