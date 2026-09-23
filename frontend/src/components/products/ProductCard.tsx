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
      className="group block bg-white rounded-xl border border-slate-100 overflow-hidden hover:shadow-md hover:border-slate-200 transition-all duration-200"
    >
      {/* Image — short, 3:2 ratio */}
      <div className="relative aspect-[3/2] bg-slate-50 overflow-hidden">
        <img
          src={getPrimaryImageUrl(product, '/placeholder-product.png')}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Wishlist pill */}
        {!showRemoveButton && onWishlistToggle && (
          <button
            onClick={handleWishlistClick}
            disabled={isWishlistLoading}
            className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur rounded-lg shadow-sm hover:bg-white transition-colors z-10"
            title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                isInWishlist
                  ? 'fill-red-500 text-red-500'
                  : 'text-slate-400 group-hover:text-red-400'
              }`}
            />
          </button>
        )}

        {/* Status badges — top-left stack */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {isOutOfStock && (
            <span className="px-2 py-0.5 rounded-md bg-red-500 text-white text-[10px] font-bold uppercase tracking-wide">
              Sold Out
            </span>
          )}
          {isLowStock && !isOutOfStock && (
            <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wide">
              Low Stock
            </span>
          )}
          {product.minOrderQuantity > 1 && (
            <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-semibold">
              MOQ: {product.minOrderQuantity}
            </span>
          )}
          {isInCart && cartQuantity > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-green-600 text-white text-[10px] font-semibold flex items-center gap-0.5">
              <Check className="w-2.5 h-2.5" />
              In Cart: {cartQuantity}
            </span>
          )}
        </div>
      </div>

      {/* Content — compact */}
      <div className="p-3">
        {/* Category chip */}
        {product.categoryTags?.length > 0 && (
          <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            {product.categoryTags[0]}
          </span>
        )}

        {/* Name */}
        <h3 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-1 group-hover:text-blue-600 transition-colors">
          {product.name}
        </h3>

        {/* SKU */}
        <p className="text-[10px] text-slate-400 mt-0.5 mb-2">{product.sku}</p>

        {/* Price row */}
        <div className="flex items-baseline justify-between mb-2">
          <div className="flex items-baseline gap-1">
            <span className="text-base font-bold text-slate-900">
              {formatPrice(product.price)}
            </span>
            <span className="text-[10px] text-slate-400">/{product.unit}</span>
          </div>
          <span className="text-[10px] text-slate-400">
            {product.quantity} {product.unit}
            {product.lowStockPercentage !== null &&
              product.lowStockPercentage !== undefined &&
              ` · ${Number(product.lowStockPercentage).toFixed(0)}%`}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-1.5">
          {showRemoveButton && onWishlistToggle && (
            <button
              onClick={handleWishlistClick}
              disabled={isWishlistLoading}
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                isWishlistLoading
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-red-50 text-red-600 hover:bg-red-100'
              }`}
            >
              {isWishlistLoading ? '...' : 'Remove'}
            </button>
          )}

          {/* Add to Cart / View Cart Button */}
          {isInCart && !showRemoveButton ? (
            <button
              onClick={handleViewCart}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              View Cart ({cartQuantity})
            </button>
          ) : (
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock || isCartLoading || !onAddToCart}
              className={`${showRemoveButton ? 'flex-1' : 'w-full'} flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                showAddedFeedback
                  ? 'bg-green-600 text-white'
                  : isOutOfStock || isCartLoading || !onAddToCart
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isCartLoading ? (
                '...'
              ) : showAddedFeedback ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Added!
                </>
              ) : (
                <>
                  <ShoppingCart className="w-3.5 h-3.5" />
                  {isOutOfStock ? 'Sold Out' : 'Add to Cart'}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
