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
  const unitPrice = product.sellingPrice ?? product.price;
  const itemTotal = unitPrice * quantity;
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
      className={`rounded-2xl border transition-colors duration-200 ${
        hasStockIssue
          ? 'border-red-200 bg-red-50/40'
          : 'border-ivory-200 bg-white hover:border-ivory-300'
      }`}
    >
      <div className="p-4 sm:p-5">
        <div className="flex gap-4 sm:gap-5">
          {/* Product Image */}
          <Link
            to={`/buyer/products/${product.id}`}
            className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-ivory-100 border border-ivory-200 hover:opacity-90 transition-opacity"
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
                  className="font-display text-[17px] font-medium leading-snug text-ink hover:text-brass-700 transition-colors line-clamp-2 sm:line-clamp-1"
                >
                  {product.name}
                </Link>
                <p className="text-[11px] uppercase tracking-[0.14em] text-stone-400 mt-1">SKU {product.sku}</p>
              </div>

              {/* Item Total - Desktop */}
              <div className="hidden sm:block text-right flex-shrink-0">
                <p className="shop-price text-lg">
                  {formatPrice(itemTotal)}
                </p>
                <p className="text-xs text-stone-500 tabular-nums mt-0.5">
                  {formatPrice(unitPrice)}
                  {product.displayPrice && product.displayPrice > unitPrice && (
                    <span className="ml-1 line-through text-stone-400">
                      {formatPrice(product.displayPrice)}
                    </span>
                  )}
                  {' '} × {quantity}
                </p>
              </div>
            </div>

            {/* Badges Row */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {getStockBadge()}

              {isBelowMOQ && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Below MOQ ({product.minOrderQuantity})
                </span>
              )}

              {product.minOrderQuantity > 1 && !isBelowMOQ && (
                <span className="shop-chip">
                  MOQ {product.minOrderQuantity}
                </span>
              )}
            </div>

            {/* Stock Issue Message */}
            {hasStockIssue && (
              <div className="mb-3 rounded-xl border border-red-200 bg-white/70 px-3 py-2">
                <p className="text-xs text-red-700 font-medium">
                  Stock issue detected
                </p>
              </div>
            )}

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
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {/* Quantity Controls */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-[0.14em] text-stone-500 font-semibold">Qty</span>
                <div className="flex items-center h-9 rounded-full border border-ivory-300 bg-white overflow-hidden">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleDecrement}
                    disabled={quantity <= 1 || anyActionPending}
                    className="h-full px-3 text-ink-500 hover:bg-ivory-100 hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Decrease quantity"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </motion.button>

                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={handleQuantityInput}
                    disabled={anyActionPending}
                    aria-label={`Quantity for ${product.name}`}
                    className="w-12 h-full bg-transparent text-center text-sm font-semibold text-ink tabular-nums focus:outline-none focus:bg-ivory-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  />

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleIncrement}
                    disabled={isOutOfStock || anyActionPending}
                    className="h-full px-3 text-ink-500 hover:bg-ivory-100 hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Increase quantity"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              </div>

              {/* Divider - Desktop */}
              <div className="hidden sm:block w-px h-5 bg-ivory-300" />

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-1 -ml-2.5 sm:ml-0">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSaveForLater}
                  disabled={anyActionPending}
                  className="shop-btn-ghost h-8 px-2.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Save for later"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save'}</span>
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleMoveToWishlist}
                  disabled={anyActionPending}
                  className="shop-btn-ghost h-8 px-2.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Move to wishlist"
                >
                  <Heart className="w-3.5 h-3.5" />
                  <span>{isMovingToWishlist ? 'Moving...' : 'Wishlist'}</span>
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleRemove}
                  disabled={anyActionPending}
                  className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Remove from cart"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isRemoving ? 'Removing...' : 'Remove'}</span>
                </motion.button>
              </div>
            </div>

            {/* Item Total - Mobile */}
            <div className="sm:hidden mt-3 pt-3 border-t border-ivory-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-[0.14em] text-stone-500 font-semibold">Item total</span>
                <div className="text-right">
                  <p className="shop-price text-base">
                    {formatPrice(itemTotal)}
                  </p>
                  <p className="text-xs text-stone-500 tabular-nums">
                    {formatPrice(unitPrice)}
                    {product.displayPrice && product.displayPrice > unitPrice && (
                      <span className="ml-1 line-through text-stone-400">
                        {formatPrice(product.displayPrice)}
                      </span>
                    )}
                    {' '} × {quantity}
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
