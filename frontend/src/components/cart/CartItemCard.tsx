/**
 * CartItemCard Component
 * Individual cart item with image, details, quantity controls, and action buttons
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Minus, Plus, Trash2, Heart, Bookmark } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CartItem } from '../../types/cart.types';
import { formatPrice, getPrimaryImageUrl } from '../../utils/productUtils';
import { StockWarning, MOQWarning, StockBadge } from './StockWarning';
import { fadeVariants, transitions } from '../../utils/animations';

interface CartItemCardProps {
  item: CartItem;
  onQuantityChange: (productId: string, quantity: number) => Promise<void>;
  onRemove: (productId: string) => Promise<void>;
  onSaveForLater: (productId: string) => Promise<void>;
  onMoveToWishlist: (productId: string) => Promise<void>;
}

export function CartItemCard({
  item,
  onQuantityChange,
  onRemove,
  onSaveForLater,
  onMoveToWishlist,
}: CartItemCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMovingToWishlist, setIsMovingToWishlist] = useState(false);

  const { product, quantity } = item;
  const itemTotal = product.price * quantity;
  const isBelowMOQ = quantity < product.minOrderQuantity;
  const hasStockIssue = product.hasStockIssue;
  const isOutOfStock = product.stockStatus === 'out';

  /**
   * Handle quantity increment
   */
  const handleIncrement = async () => {
    if (isUpdating || isOutOfStock) return;
    setIsUpdating(true);
    try {
      await onQuantityChange(product.id, quantity + 1);
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Handle quantity decrement
   */
  const handleDecrement = async () => {
    if (isUpdating || quantity <= 1) return;
    setIsUpdating(true);
    try {
      await onQuantityChange(product.id, quantity - 1);
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Handle manual quantity input
   */
  const handleQuantityInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuantity = parseInt(e.target.value, 10);
    if (isNaN(newQuantity) || newQuantity < 1 || isUpdating) return;
    
    setIsUpdating(true);
    try {
      await onQuantityChange(product.id, newQuantity);
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Handle remove from cart
   */
  const handleRemove = async () => {
    if (isRemoving) return;
    setIsRemoving(true);
    try {
      await onRemove(product.id);
    } finally {
      setIsRemoving(false);
    }
  };

  /**
   * Handle save for later
   */
  const handleSaveForLater = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onSaveForLater(product.id);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handle move to wishlist
   */
  const handleMoveToWishlist = async () => {
    if (isMovingToWishlist) return;
    setIsMovingToWishlist(true);
    try {
      await onMoveToWishlist(product.id);
    } finally {
      setIsMovingToWishlist(false);
    }
  };

  /**
   * Get stock status badge
   */
  const getStockBadge = () => {
    return <StockBadge stockStatus={product.stockStatus} size="sm" />;
  };

  const anyActionPending = isUpdating || isRemoving || isSaving || isMovingToWishlist;

  return (
    <motion.div
      layout
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={fadeVariants}
      transition={transitions.normal}
      className={`bg-white rounded-lg border transition-all duration-200 ${
        hasStockIssue ? 'border-red-200 bg-red-50/30' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="p-4">
        <div className="flex gap-4">
          {/* Product Image */}
          <Link
            to={`/buyer/products/${product.id}`}
            className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-slate-100 hover:opacity-90 transition-opacity"
          >
            <img
              src={getPrimaryImageUrl(product, '/placeholder-product.png')}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </Link>

          {/* Product Details */}
          <div className="flex-1 min-w-0">
            {/* Header Row */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <Link
                  to={`/buyer/products/${product.id}`}
                  className="text-base font-semibold text-slate-900 hover:text-blue-600 transition-colors line-clamp-1"
                >
                  {product.name}
                </Link>
                <p className="text-xs text-slate-500 mt-0.5">SKU: {product.sku}</p>
              </div>

              {/* Item Total - Desktop */}
              <div className="hidden sm:block text-right flex-shrink-0">
                <p className="text-lg font-bold text-slate-900">
                  {formatPrice(itemTotal)}
                </p>
                <p className="text-xs text-slate-500">
                  {formatPrice(product.price)} × {quantity}
                </p>
              </div>
            </div>

            {/* Badges Row */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {getStockBadge()}
              
              {isBelowMOQ && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  Below MOQ ({product.minOrderQuantity})
                </span>
              )}

              {product.minOrderQuantity > 1 && !isBelowMOQ && (
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
                  MOQ: {product.minOrderQuantity}
                </span>
              )}
            </div>

            {/* Stock Issue Message */}
            {hasStockIssue && (
              <div className="mb-3 p-2 rounded-md bg-red-50 border border-red-200">
                <p className="text-xs text-red-700 font-medium">
                  Stock issue detected
                </p>
              </div>
            )}

            {/* MOQ Warning Message */}
            {/* Stock Warnings */}
            {(hasStockIssue || isBelowMOQ) && (
              <div className="mb-3 space-y-2">
                {/* Stock Warning */}
                {hasStockIssue && (
                  <StockWarning
                    stockStatus={product.stockStatus}
                    availableQuantity={product.availableQuantity}
                    requestedQuantity={quantity}
                    minOrderQuantity={product.minOrderQuantity}
                    productName={product.name}
                    variant="inline"
                  />
                )}
                
                {/* MOQ Warning */}
                {isBelowMOQ && !isOutOfStock && (
                  <MOQWarning
                    currentQuantity={quantity}
                    minOrderQuantity={product.minOrderQuantity}
                    productName={product.name}
                    variant="inline"
                  />
                )}
              </div>
            )}

            {/* Controls Row */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Quantity Controls */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 font-medium">Qty:</span>
                <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden">
                  <motion.button
                    whileHover={{ backgroundColor: 'rgb(248 250 252)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleDecrement}
                    disabled={quantity <= 1 || anyActionPending}
                    className="px-2 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Decrease quantity"
                  >
                    <Minus className="w-3.5 h-3.5 text-slate-600" />
                  </motion.button>
                  
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={handleQuantityInput}
                    disabled={anyActionPending}
                    className="w-14 px-2 py-1.5 text-center text-sm font-semibold text-slate-900 border-x border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                  
                  <motion.button
                    whileHover={{ backgroundColor: 'rgb(248 250 252)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleIncrement}
                    disabled={isOutOfStock || anyActionPending}
                    className="px-2 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Increase quantity"
                  >
                    <Plus className="w-3.5 h-3.5 text-slate-600" />
                  </motion.button>
                </div>
              </div>

              {/* Divider - Desktop */}
              <div className="hidden sm:block w-px h-6 bg-slate-200" />

              {/* Action Buttons */}
              <div className="flex items-center gap-2 text-xs">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSaveForLater}
                  disabled={anyActionPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Save for later"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span className="font-medium">{isSaving ? 'Saving...' : 'Save'}</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleMoveToWishlist}
                  disabled={anyActionPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Move to wishlist"
                >
                  <Heart className="w-3.5 h-3.5" />
                  <span className="font-medium">{isMovingToWishlist ? 'Moving...' : 'Wishlist'}</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRemove}
                  disabled={anyActionPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Remove from cart"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="font-medium">{isRemoving ? 'Removing...' : 'Remove'}</span>
                </motion.button>
              </div>
            </div>

            {/* Item Total - Mobile */}
            <div className="sm:hidden mt-3 pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Item Total:</span>
                <div className="text-right">
                  <p className="text-base font-bold text-slate-900">
                    {formatPrice(itemTotal)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatPrice(product.price)} × {quantity}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
