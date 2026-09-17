/**
 * ProductCard Component
 * Product card for buyer catalog with wishlist and cart actions
 */

import { useState } from 'react';
import { Heart, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Product } from '../../types';
import { formatPrice, getPrimaryImageUrl } from '../../utils/productUtils';
import { ActionButton, StatusBadge } from '../ui';

interface ProductCardProps {
  product: Product;
  isInWishlist?: boolean;
  onWishlistToggle?: (productId: string, isInWishlist: boolean) => void;
  onAddToCart?: (productId: string) => void;
  showRemoveButton?: boolean;
}

export function ProductCard({
  product,
  isInWishlist = false,
  onWishlistToggle,
  onAddToCart,
  showRemoveButton = false,
}: ProductCardProps) {
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);
  const [isCartLoading, setIsCartLoading] = useState(false);

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
      await onAddToCart(product.id);
    } finally {
      setIsCartLoading(false);
    }
  };

  const isOutOfStock = product.quantity === 0;
  const isLowStock = product.stockStatus === 'low';

  return (
    <Link
      to={`/buyer/products/${product.id}`}
      className="group block bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-200"
    >
      {/* Image Container */}
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        <img
          src={getPrimaryImageUrl(product, '/placeholder-product.png')}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
        />

        {/* Wishlist Button */}
        {!showRemoveButton && onWishlistToggle && (
          <button
            onClick={handleWishlistClick}
            disabled={isWishlistLoading}
            className="absolute top-2 right-2 p-2 bg-white/90 rounded-full shadow-md hover:bg-white transition-colors z-10"
            title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart
              className={`w-5 h-5 transition-colors ${
                isInWishlist
                  ? 'fill-red-500 text-red-500'
                  : 'text-gray-600 hover:text-red-500'
              }`}
            />
          </button>
        )}

        {/* Stock Status Badge */}
        {(isOutOfStock || isLowStock) && (
          <div className="absolute top-2 left-2">
            <StatusBadge
              status={isOutOfStock ? 'Out of Stock' : 'Low Stock'}
              variant={isOutOfStock ? 'danger' : 'warning'}
            />
          </div>
        )}

        {/* Min Order Quantity Badge */}
        {product.minOrderQuantity > 1 && (
          <div className="absolute bottom-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
            Min Order: {product.minOrderQuantity}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Category Tags */}
        {product.categoryTags && product.categoryTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {product.categoryTags.slice(0, 2).map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600"
              >
                {tag}
              </span>
            ))}
            {product.categoryTags.length > 2 && (
              <span className="text-xs text-gray-400">
                +{product.categoryTags.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Product Name */}
        <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {product.name}
        </h3>

        {/* SKU */}
        <p className="text-xs text-gray-500 mb-2">{product.sku}</p>

        {/* Price & Unit */}
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-2xl font-bold text-gray-900">
            {formatPrice(product.price)}
          </span>
          <span className="text-sm text-gray-500">/ {product.unit}</span>
        </div>

        {/* Stock Info */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-600">
            Stock: <span className="font-medium">{product.quantity}</span>{' '}
            {product.unit}
          </span>
          {product.lowStockPercentage !== null &&
            product.lowStockPercentage !== undefined && (
              <span className="text-xs text-gray-500">
                {product.lowStockPercentage.toFixed(0)}% remaining
              </span>
            )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {showRemoveButton && onWishlistToggle ? (
            <button
              onClick={handleWishlistClick}
              disabled={isWishlistLoading}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isWishlistLoading
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-red-500 text-white hover:bg-red-600'
              }`}
            >
              {isWishlistLoading ? 'Removing...' : 'Remove'}
            </button>
          ) : null}

          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock || isCartLoading || !onAddToCart}
            className={`${showRemoveButton ? 'flex-1' : 'w-full'} px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              isOutOfStock || isCartLoading || !onAddToCart
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isCartLoading ? (
              'Adding...'
            ) : (
              <>
                <ShoppingCart className="w-4 h-4" />
                {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
              </>
            )}
          </button>
        </div>
      </div>
    </Link>
  );
}
