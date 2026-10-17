/**
 * ProductCard Component
 * Compact, responsive product card for buyer catalog with cart integration
 */

import { useState } from 'react';
import { Heart, ShoppingCart, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Product } from '../../types';
import { formatPrice, getPrimaryImageUrl } from '../../utils/productUtils';

interface ProductCardProps {
  product: Product;
  isInWishlist?: boolean;
  isInCart?: boolean;
  cartQuantity?: number;
  onWishlistToggle?: (productId: string, isInWishlist: boolean) => void;
  onAddToCart?: (productId: string, quantity?: number) => void;
  onViewCart?: () => void;
  showRemoveButton?: boolean;
}

export function ProductCard({
  product,
  isInWishlist = false,
  isInCart = false,
  cartQuantity = 0,
  onWishlistToggle,
  onAddToCart,
  onViewCart,
  showRemoveButton = false,
}: ProductCardProps) {
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);
  const [isCartLoading, setIsCartLoading] = useState(false);
  const [showAddedFeedback, setShowAddedFeedback] = useState(false);

  const handleWishlistClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onWishlistToggle || isWishlistLoading) return;
    setIsWishlistLoading(true);
    try {
      await onWishlistToggle(product.id, isInWishlist);
    } finally {
      setIsWishlistLoading(false);
    }
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onAddToCart || isCartLoading) return;

    setIsCartLoading(true);
    try {
      // Add with MOQ as default quantity
      const quantityToAdd = product.minOrderQuantity || 1;
      await onAddToCart(product.id, quantityToAdd);

      // Show feedback animation
      setShowAddedFeedback(true);
      setTimeout(() => setShowAddedFeedback(false), 2000);
    } finally {
      setIsCartLoading(false);
    }
  };

  const handleViewCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onViewCart) {
      onViewCart();
    }
  };

  const isOutOfStock = product.quantity === 0;
  const isLowStock = product.stockStatus === 'low';

  return (
    <Link
      to={`/buyer/products/${product.id}`}
      className="group flex flex-col h-full bg-white rounded-2xl border border-ivory-200 overflow-hidden transition-[border-color,box-shadow] duration-300 hover:border-ink-300/60 hover:shadow-[0_12px_32px_-20px_rgba(20,33,61,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brass-300"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-ivory-100 overflow-hidden">
        <img
          src={getPrimaryImageUrl(product, '/placeholder-product.png')}
          alt={product.name}
          width="480"
          height="360"
          loading="lazy"
          className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04] ${isOutOfStock ? 'opacity-60' : ''}`}
        />

        {/* Wishlist */}
        {!showRemoveButton && onWishlistToggle && (
          <button
            type="button"
            onClick={handleWishlistClick}
            disabled={isWishlistLoading}
            className="absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white/95 border border-ivory-200 hover:border-ink-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brass-300 disabled:opacity-60"
            title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            aria-pressed={isInWishlist}
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                isInWishlist
                  ? 'fill-brass text-brass'
                  : 'text-ink-500 group-hover:text-ink'
              }`}
            />
          </button>
        )}

        {/* Status badges */}
        <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5 z-10">
          {product.discountPercent && product.discountPercent > 0 && (
            <span className="px-2.5 py-0.5 rounded-full bg-ink text-ivory-50 text-[10px] font-semibold tracking-[0.12em] uppercase">
              {Math.round(product.discountPercent)}% off
            </span>
          )}
          {isOutOfStock && (
            <span className="px-2.5 py-0.5 rounded-full bg-white border border-red-200 text-red-700 text-[10px] font-semibold uppercase tracking-[0.12em]">
              Sold out
            </span>
          )}
          {isLowStock && !isOutOfStock && (
            <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-semibold uppercase tracking-[0.12em]">
              Low stock
            </span>
          )}
          {isInCart && cartQuantity > 0 && (
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold flex items-center gap-1">
              <Check className="w-3 h-3" />
              In cart: {cartQuantity}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 mb-1.5 min-h-4">
          {product.categoryTags?.length > 0 && (
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brass-600 truncate">
              {product.categoryTags[0]}
            </span>
          )}
          {product.minOrderQuantity > 1 && (
            <span className="ml-auto shrink-0 text-[10px] font-medium text-stone-500">
              MOQ {product.minOrderQuantity}
            </span>
          )}
        </div>

        {/* Name */}
        <h3 className="font-display text-[17px] font-medium text-ink leading-snug line-clamp-2">
          {product.name}
        </h3>

        {/* SKU */}
        <p className="text-[11px] text-stone-400 mt-1 tracking-wide">SKU {product.sku}</p>

        {/* Price row */}
        <div className="mt-auto pt-4">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="shop-price text-lg">
              {formatPrice(product.sellingPrice ?? product.price)}
            </span>
            <span className="text-[11px] text-stone-500">/ {product.unit}</span>
            {product.displayPrice && product.displayPrice > (product.sellingPrice ?? product.price) && (
              <span className="text-xs text-stone-400 line-through tabular-nums">
                {formatPrice(product.displayPrice)}
              </span>
            )}
          </div>
          {product.discountAmount && product.discountAmount > 0 && (
            <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
              You save {formatPrice(product.discountAmount)}
            </p>
          )}
        </div>

        <div className="h-px w-full bg-ivory-200 my-4" />

        {/* Actions */}
        <div className="flex gap-2">
          {showRemoveButton && onWishlistToggle && (
            <button
              type="button"
              onClick={handleWishlistClick}
              disabled={isWishlistLoading}
              className="flex-1 h-10 px-3 rounded-full border border-ivory-300 bg-white text-xs font-semibold text-ink-700 transition-colors hover:border-red-300 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-brass-300"
            >
              {isWishlistLoading ? '…' : 'Remove'}
            </button>
          )}

          {/* Add to Cart / View Cart Button */}
          {isInCart && !showRemoveButton ? (
            <button
              type="button"
              onClick={handleViewCart}
              className="w-full h-10 flex items-center justify-center gap-1.5 px-4 rounded-full text-xs font-semibold border border-ink/20 bg-white text-ink transition-colors hover:border-ink hover:bg-ivory-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brass-300"
            >
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              View cart ({cartQuantity})
            </button>
          ) : (
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isOutOfStock || isCartLoading || !onAddToCart}
              className={`${showRemoveButton ? 'flex-1' : 'w-full'} h-10 flex items-center justify-center gap-1.5 px-4 rounded-full text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brass-300 ${
                showAddedFeedback
                  ? 'bg-emerald-700 text-white'
                  : isOutOfStock || isCartLoading || !onAddToCart
                  ? 'bg-ivory-100 text-stone-400 cursor-not-allowed'
                  : 'bg-ink text-white hover:bg-ink-700'
              }`}
            >
              {isCartLoading ? (
                '…'
              ) : showAddedFeedback ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Added
                </>
              ) : (
                <>
                  <ShoppingCart className="w-3.5 h-3.5" />
                  {isOutOfStock ? 'Sold out' : 'Add to cart'}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
