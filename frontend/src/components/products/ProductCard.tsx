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
      className="group block bg-white rounded-2xl border border-slate-200/80 overflow-hidden hover:shadow-xl hover:border-indigo-300/80 transition-all duration-300 hover:-translate-y-1"
    >
      {/* Image — short, 3:2 ratio */}
      <div className="relative aspect-[3/2] bg-gradient-to-b from-slate-50 to-slate-100 overflow-hidden">
        <img
          src={getPrimaryImageUrl(product, '/placeholder-product.png')}
          alt={product.name}
          width="480"
          height="320"
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
        />

        {/* Wishlist pill */}
        {!showRemoveButton && onWishlistToggle && (
          <button
            onClick={handleWishlistClick}
            disabled={isWishlistLoading}
            className="absolute top-2.5 right-2.5 p-2 bg-white/85 backdrop-blur-md rounded-xl shadow-sm hover:bg-white hover:scale-110 transition-all duration-200 z-10"
            title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                isInWishlist
                  ? 'fill-rose-500 text-rose-500'
                  : 'text-slate-400 group-hover:text-rose-500'
              }`}
            />
          </button>
        )}

        {/* Status badges — top-left stack */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
          {product.discountPercent && product.discountPercent > 0 && (
            <span className="px-2 py-0.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[10px] font-bold shadow-sm">
              {Math.round(product.discountPercent)}% OFF
            </span>
          )}
          {isOutOfStock && (
            <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/90 text-white text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm shadow-sm">
              Sold Out
            </span>
          )}
          {isLowStock && !isOutOfStock && (
            <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/90 text-white text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm shadow-sm">
              Low Stock
            </span>
          )}
          {product.minOrderQuantity > 1 && (
            <span className="px-2 py-0.5 rounded-lg bg-slate-900/80 text-white text-[10px] font-bold backdrop-blur-sm shadow-sm">
              MOQ: {product.minOrderQuantity}
            </span>
          )}
          {isInCart && cartQuantity > 0 && (
            <span className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm">
              <Check className="w-2.5 h-2.5" />
              In Cart: {cartQuantity}
            </span>
          )}
        </div>
      </div>

      {/* Content — compact */}
      <div className="p-3.5">
        {/* Category chip */}
        {product.categoryTags?.length > 0 && (
          <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100/70 text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1.5">
            {product.categoryTags[0]}
          </span>
        )}

        {/* Name */}
        <h3 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-1 group-hover:text-indigo-600 transition-colors">
          {product.name}
        </h3>

        {/* SKU */}
        <p className="text-[10px] text-slate-400 mt-0.5 mb-2 font-mono">{product.sku}</p>

        {/* Price row */}
        <div className="mb-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-extrabold text-slate-900 tracking-tight">
              {formatPrice(product.sellingPrice ?? product.price)}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">/{product.unit}</span>
            {product.displayPrice && product.displayPrice > (product.sellingPrice ?? product.price) && (
              <span className="text-[11px] text-slate-400 line-through">
                {formatPrice(product.displayPrice)}
              </span>
            )}
          </div>
          {product.discountAmount && product.discountAmount > 0 && (
            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
              Save {formatPrice(product.discountAmount)}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1.5">
          {showRemoveButton && onWishlistToggle && (
            <button
              onClick={handleWishlistClick}
              disabled={isWishlistLoading}
              className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                isWishlistLoading
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
              }`}
            >
              {isWishlistLoading ? '…' : 'Remove'}
            </button>
          )}

          {/* Add to Cart / View Cart Button */}
          {isInCart && !showRemoveButton ? (
            <button
              onClick={handleViewCart}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              View Cart ({cartQuantity})
            </button>
          ) : (
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock || isCartLoading || !onAddToCart}
              className={`${showRemoveButton ? 'flex-1' : 'w-full'} flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                showAddedFeedback
                  ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                  : isOutOfStock || isCartLoading || !onAddToCart
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-indigo-600/25 hover:shadow-indigo-600/40 hover:scale-[1.02]'
              }`}
            >
              {isCartLoading ? (
                '…'
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
