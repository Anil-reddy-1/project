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
import { showSuccessToast, showErrorToast, showInfoToast } from '../../utils/toast';
import { listContainerVariants, listItemVariants, fadeVariants, transitions } from '../../utils/animations';

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <div>
              <h3 className="font-semibold">Failed to load cart</h3>
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Cart</h1>
            <p className="text-sm text-slate-600 mt-1">
              {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} in your cart
            </p>
          </div>
          
          {/* Clear Cart Button */}
          {cartItems.length > 0 && (
            <button
              onClick={handleClearCart}
              disabled={clearingCart}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Clear entire cart"
            >
              <Trash2 className="w-4 h-4" />
              {clearingCart ? 'Clearing...' : 'Clear Cart'}
            </button>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Cart Items & Saved Items */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cart Items Section */}
            {cartItems.length > 0 ? (
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                {/* Section Header */}
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-slate-600" />
                    <h2 className="text-lg font-semibold text-slate-900">
                      Cart Items
                    </h2>
                  </div>
                </div>

                {/* Cart Items List */}
                <motion.div 
                  className="p-6 space-y-4"
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
              </div>
            ) : (
              // Show message if only saved items exist
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <ShoppingCart className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">Your cart is empty</p>
                    <p className="text-sm text-blue-700 mt-1">
                      You have items saved for later below. Move them to cart when you're ready!
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
