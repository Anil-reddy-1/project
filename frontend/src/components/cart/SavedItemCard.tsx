/**
 * SavedItemCard Component
 * Display saved for later items with simpler controls than cart items
 */

import { useState } from 'react';
import { ShoppingCart, Trash2, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { SavedItem } from '../../types/cart.types';
import { formatPrice, getPrimaryImageUrl } from '../../utils/productUtils';

interface SavedItemCardProps {
  item: SavedItem;
  onMoveToCart: (productId: string) => Promise<void>;
  onRemove: (productId: string) => Promise<void>;
  onMoveToWishlist: (productId: string) => Promise<void>;
}

export function SavedItemCard({
  item,
  onMoveToCart,
  onRemove,
  onMoveToWishlist,
}: SavedItemCardProps) {
  const [isMovingToCart, setIsMovingToCart] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isMovingToWishlist, setIsMovingToWishlist] = useState(false);

  const { product, quantity } = item;
  const isOutOfStock = product.stockStatus === 'out';
  const isLowStock = product.stockStatus === 'low';

  /**
   * Handle move to cart
   */
  const handleMoveToCart = async () => {
    if (isMovingToCart) return;
    setIsMovingToCart(true);
    try {
      await onMoveToCart(product.id);
    } finally {
      setIsMovingToCart(false);
    }
  };

  /**
   * Handle remove
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
   * Get stock badge
   */
  const getStockBadge = () => {
    if (isOutOfStock) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-700">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          Out of stock
        </span>
      );
    }

    if (isLowStock) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Low stock
        </span>
      );
    }

    return null;
  };

  const anyActionPending = isMovingToCart || isRemoving || isMovingToWishlist;

  return (
    <div className="rounded-2xl border border-ivory-200 bg-white hover:border-ivory-300 transition-colors duration-200">
      <div className="p-4">
        <div className="flex gap-4">
          {/* Product Image */}
          <Link
            to={`/buyer/products/${product.id}`}
            className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-ivory-100 border border-ivory-200 hover:opacity-90 transition-opacity"
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
                  className="font-display text-[15px] font-medium leading-snug text-ink hover:text-brass-700 transition-colors line-clamp-2"
                >
                  {product.name}
                </Link>
                <p className="text-[11px] uppercase tracking-[0.14em] text-stone-400 mt-1">SKU {product.sku}</p>
              </div>

              {/* Price - Desktop */}
              <div className="hidden sm:block text-right flex-shrink-0">
                <p className="shop-price text-base">
                  {formatPrice(product.price)}
                </p>
                <p className="text-xs text-stone-500">per {product.unit}</p>
              </div>
            </div>

            {/* Badges and Info Row */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {getStockBadge()}

              {product.minOrderQuantity > 1 && (
                <span className="shop-chip">
                  MOQ {product.minOrderQuantity}
                </span>
              )}

              {quantity > 1 && (
                <span className="shop-chip">
                  Saved qty {quantity}
                </span>
              )}
            </div>

            {/* Out of Stock Message */}
            {isOutOfStock && (
              <div className="mb-3 rounded-xl border border-red-200 bg-red-50/60 px-3 py-2">
                <p className="text-xs text-red-700 font-medium">
                  This item is currently out of stock
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={handleMoveToCart}
                disabled={isOutOfStock || anyActionPending}
                className={`inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full text-xs font-semibold transition-colors ${
                  isOutOfStock || anyActionPending
                    ? 'bg-ivory-200 text-stone-400 cursor-not-allowed'
                    : 'bg-ink text-white hover:bg-ink-700'
                }`}
                title="Move to cart"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>{isMovingToCart ? 'Moving...' : isOutOfStock ? 'Out of stock' : 'Move to cart'}</span>
              </button>

              <button
                onClick={handleMoveToWishlist}
                disabled={anyActionPending}
                className="shop-btn-ghost h-8 px-2.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                title="Move to wishlist"
              >
                <Heart className="w-3.5 h-3.5" />
                <span>{isMovingToWishlist ? 'Moving...' : 'Wishlist'}</span>
              </button>

              <button
                onClick={handleRemove}
                disabled={anyActionPending}
                className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Remove from saved"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isRemoving ? 'Removing...' : 'Remove'}</span>
              </button>
            </div>

            {/* Price - Mobile */}
            <div className="sm:hidden mt-3 pt-3 border-t border-ivory-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-[0.14em] text-stone-500 font-semibold">Price</span>
                <div className="text-right">
                  <p className="shop-price text-sm">
                    {formatPrice(product.price)}
                  </p>
                  <p className="text-xs text-stone-500">per {product.unit}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
