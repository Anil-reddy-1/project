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
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          Out of Stock
        </span>
      );
    }
    
    if (isLowStock) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Low Stock
        </span>
      );
    }
    
    return null;
  };

  const anyActionPending = isMovingToCart || isRemoving || isMovingToWishlist;

  return (
    <div className="bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-all duration-200">
      <div className="p-4">
        <div className="flex gap-4">
          {/* Product Image */}
          <Link
            to={`/buyer/products/${product.id}`}
            className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-slate-100 hover:opacity-90 transition-opacity"
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
                  className="text-sm font-semibold text-slate-900 hover:text-blue-600 transition-colors line-clamp-2"
                >
                  {product.name}
                </Link>
                <p className="text-xs text-slate-500 mt-0.5">SKU: {product.sku}</p>
              </div>

              {/* Price - Desktop */}
              <div className="hidden sm:block text-right flex-shrink-0">
                <p className="text-base font-bold text-slate-900">
                  {formatPrice(product.price)}
                </p>
                <p className="text-xs text-slate-500">per {product.unit}</p>
              </div>
            </div>

            {/* Badges and Info Row */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {getStockBadge()}
              
              {product.minOrderQuantity > 1 && (
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
                  MOQ: {product.minOrderQuantity}
                </span>
              )}

              {quantity > 1 && (
                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                  Saved qty: {quantity}
                </span>
              )}
            </div>

            {/* Out of Stock Message */}
            {isOutOfStock && (
              <div className="mb-3 p-2 rounded-md bg-red-50 border border-red-200">
                <p className="text-xs text-red-700 font-medium">
                  This item is currently out of stock
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleMoveToCart}
                disabled={isOutOfStock || anyActionPending}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  isOutOfStock || anyActionPending
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
                title="Move to cart"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>{isMovingToCart ? 'Moving...' : isOutOfStock ? 'Out of Stock' : 'Move to Cart'}</span>
              </button>

              <button
                onClick={handleMoveToWishlist}
                disabled={anyActionPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium"
                title="Move to wishlist"
              >
                <Heart className="w-3.5 h-3.5" />
                <span>{isMovingToWishlist ? 'Moving...' : 'Wishlist'}</span>
              </button>

              <button
                onClick={handleRemove}
                disabled={anyActionPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium"
                title="Remove from saved"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isRemoving ? 'Removing...' : 'Remove'}</span>
              </button>
            </div>

            {/* Price - Mobile */}
            <div className="sm:hidden mt-3 pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">Price:</span>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">
                    {formatPrice(product.price)}
                  </p>
                  <p className="text-xs text-slate-500">per {product.unit}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
