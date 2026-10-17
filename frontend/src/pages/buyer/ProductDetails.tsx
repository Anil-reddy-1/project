/**
 * ProductDetails Page (Buyer)
 * Detailed product view with image gallery and cart integration
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, ShoppingCart, ArrowLeft, AlertCircle, Package, Check, Minus, Plus } from 'lucide-react';
import { DashboardLayout } from '../../components/layout';
import { ImageGallery } from '../../components/products';
import { LoadingSpinner } from '../../components/ui';
import { productService } from '../../services';
import { useWishlistStatus } from '../../hooks/useWishlist';
import { useCart } from '../../hooks/useCart';
import type { Product } from '../../types';
import {
  formatPrice,
  formatNumber,
  getStockStatusLabel,
} from '../../utils/productUtils';

const STOCK_CHIP_STYLES: Record<string, string> = {
  healthy: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  low: 'bg-amber-50 text-amber-800 border-amber-200',
  out: 'bg-red-50 text-red-700 border-red-200',
};

const STOCK_DOT_STYLES: Record<string, string> = {
  healthy: 'bg-emerald-500',
  low: 'bg-amber-500',
  out: 'bg-red-500',
};

export function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [showAddedFeedback, setShowAddedFeedback] = useState(false);

  const { isInWishlist, loading: wishlistLoading, toggle: toggleWishlist } =
    useWishlistStatus(id || '');
  
  const { addToCart, isInCart, cartItems } = useCart();

  // Get current cart quantity for this product
  const cartQuantity = cartItems.find(item => item.product.id === id)?.quantity || 0;
  const productIsInCart = isInCart(id || '');

  // Fetch product details
  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;

      setLoading(true);
      setError(null);

      try {
        const response = await productService.getProductById(id);
        setProduct(response.data);
        
        // Set initial quantity to MOQ
        if (response.data.minOrderQuantity) {
          setQuantity(response.data.minOrderQuantity);
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const handleQuantityChange = (value: number) => {
    if (!product) return;
    
    const newQuantity = Math.max(1, Math.min(value, product.quantity));
    setQuantity(newQuantity);
  };

  const handleAddToCart = async () => {
    if (!product || !id) return;
    
    setAddingToCart(true);
    
    try {
      // Show MOQ warning if quantity is less than minimum
      if (quantity < product.minOrderQuantity) {
        const proceed = window.confirm(
          `Minimum order quantity is ${product.minOrderQuantity}. You selected ${quantity}. Do you want to proceed anyway?`
        );
        if (!proceed) {
          setAddingToCart(false);
          return;
        }
      }
      
      await addToCart(id, quantity);
      
      // Show success feedback
      setShowAddedFeedback(true);
      setTimeout(() => setShowAddedFeedback(false), 3000);
    } finally {
      setAddingToCart(false);
    }
  };

  const handleViewCart = () => {
    navigate('/buyer/cart');
  };

  const handleWishlistToggle = async () => {
    await toggleWishlist();
  };


  if (loading) {
    return (
      <DashboardLayout>
        <div className="py-24 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !product) {
    return (
      <DashboardLayout>
        <div className="max-w-xl mx-auto py-12 sm:py-20">
          <div className="shop-card px-6 py-12 sm:px-10 text-center">
            <p className="shop-eyebrow">Not available</p>
            <h2 className="shop-title mt-2">
              Product not found
            </h2>
            <p className="shop-subtitle mt-3 mb-8">{error || 'The product you are looking for does not exist.'}</p>
            <button type="button" className="shop-btn-primary" onClick={() => navigate('/buyer/products')}>
              <ArrowLeft className="w-4 h-4" />
              Back to products
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const isOutOfStock = product.quantity === 0;
  const isBelowMOQ = quantity < product.minOrderQuantity;
  const stockKey = product.stockStatus || 'healthy';

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Back Button */}
        <button
          type="button"
          onClick={() => navigate('/buyer/products')}
          className="shop-btn-ghost -ml-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to products
        </button>

        {/* Product Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14">
          {/* Left Column - Image Gallery */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <ImageGallery images={product.images} productName={product.name} />
          </div>

          {/* Right Column - Product Info */}
          <div className="space-y-8 min-w-0">
            <div className="space-y-4">
              {/* Category Tags */}
              {product.categoryTags && product.categoryTags.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {product.categoryTags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="shop-eyebrow"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Product Name */}
              <div>
                <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-medium tracking-tight text-ink leading-[1.1] break-words">
                  {product.name}
                </h1>
                <p className="text-xs text-stone-500 mt-3 tracking-wide">SKU {product.sku}</p>
              </div>
            </div>

            {/* Price */}
            <div className="space-y-2">
              <div className="flex items-baseline gap-x-3 gap-y-1 flex-wrap">
                <span className="shop-price text-4xl sm:text-[2.75rem] leading-none">
                  {formatPrice(product.sellingPrice ?? product.price)}
                </span>
                <span className="text-base text-stone-500">/ {product.unit}</span>
                {product.displayPrice && product.displayPrice > (product.sellingPrice ?? product.price) && (
                  <span className="text-lg text-stone-400 line-through tabular-nums">
                    {formatPrice(product.displayPrice)}
                  </span>
                )}
                {product.discountPercent && product.discountPercent > 0 && (
                  <span className="self-center px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ivory-50 bg-ink rounded-full">
                    {Math.round(product.discountPercent)}% off
                  </span>
                )}
              </div>
              {product.discountAmount && product.discountAmount > 0 && (
                <p className="text-sm text-emerald-700 font-medium">
                  You save {formatPrice(product.discountAmount)}
                </p>
              )}
            </div>

            {/* Stock Status */}
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${
                  STOCK_CHIP_STYLES[stockKey] ?? 'bg-ivory-50 text-ink-700 border-ivory-300'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${STOCK_DOT_STYLES[stockKey] ?? 'bg-stone-400'}`} />
                {getStockStatusLabel(stockKey)}
              </span>
              <span className="text-sm text-stone-500">
                <span className="font-semibold text-ink tabular-nums">{formatNumber(product.quantity)}</span>{' '}
                {product.unit} available
              </span>
            </div>

            <div className="shop-rule" />

            {/* Description */}
            {product.description && (
              <div>
                <h3 className="shop-heading mb-3">
                  Description
                </h3>
                <p className="text-[15px] text-ink-700 leading-relaxed whitespace-pre-wrap">
                  {product.description}
                </p>
              </div>
            )}

            {/* Product Details */}
            <div>
              <h3 className="shop-heading mb-4">
                Product details
              </h3>
              <dl className="grid grid-cols-1 min-[420px]:grid-cols-2 border-t border-ivory-200 text-sm">
                <div className="flex items-baseline justify-between gap-3 py-3 border-b border-ivory-200 min-[420px]:pr-6">
                  <dt className="text-stone-500">Min stock</dt>
                  <dd className="font-medium text-ink tabular-nums text-right">
                    {formatNumber(product.minStock)} {product.unit}
                  </dd>
                </div>
                {product.maxStock && (
                  <div className="flex items-baseline justify-between gap-3 py-3 border-b border-ivory-200 min-[420px]:pl-6 min-[420px]:border-l">
                    <dt className="text-stone-500">Max stock</dt>
                    <dd className="font-medium text-ink tabular-nums text-right">
                      {formatNumber(product.maxStock)} {product.unit}
                    </dd>
                  </div>
                )}
                <div className={`flex items-baseline justify-between gap-3 py-3 border-b border-ivory-200 ${product.maxStock ? 'min-[420px]:pr-6' : 'min-[420px]:pl-6 min-[420px]:border-l'}`}>
                  <dt className="text-stone-500">Min order</dt>
                  <dd className="font-medium text-ink tabular-nums text-right">
                    {product.minOrderQuantity} {product.unit}
                  </dd>
                </div>
                <div className={`flex items-baseline justify-between gap-3 py-3 border-b border-ivory-200 ${product.maxStock ? 'min-[420px]:pl-6 min-[420px]:border-l' : 'min-[420px]:pr-6'}`}>
                  <dt className="text-stone-500">Unit</dt>
                  <dd className="font-medium text-ink text-right">
                    {product.unit}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Minimum Order Quantity Warning */}
            {product.minOrderQuantity > 1 && (
              <div className="bg-ivory-100 border border-ivory-300 rounded-2xl p-4 sm:p-5 flex gap-3.5">
                <div className="w-9 h-9 rounded-full bg-white border border-ivory-300 flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4 text-brass-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">
                    Minimum order quantity
                  </p>
                  <p className="text-sm text-stone-500 mt-0.5">
                    This product requires a minimum order of {product.minOrderQuantity}{' '}
                    {product.unit}.
                  </p>
                </div>
              </div>
            )}

            {/* Purchase panel */}
            <div className="shop-card p-5 sm:p-6 space-y-5">
              {/* Quantity Selector */}
              {!isOutOfStock && (
                <div>
                  <label htmlFor="product-quantity" className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500 mb-3">
                    Quantity
                  </label>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <div className="inline-flex items-center h-11 rounded-full border border-ivory-300 bg-white overflow-hidden">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(quantity - 1)}
                        disabled={quantity <= 1}
                        aria-label="Decrease quantity"
                        className="w-11 h-full flex items-center justify-center text-ink-700 hover:bg-ivory-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        id="product-quantity"
                        type="number"
                        min="1"
                        max={product.quantity}
                        value={quantity}
                        onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                        className="w-16 h-full text-center bg-transparent text-ink font-semibold tabular-nums border-x border-ivory-200 focus:outline-none focus:bg-ivory-50"
                      />
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(quantity + 1)}
                        disabled={quantity >= product.quantity}
                        aria-label="Increase quantity"
                        className="w-11 h-full flex items-center justify-center text-ink-700 hover:bg-ivory-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="text-sm text-stone-500">
                      {product.unit} <span className="text-stone-400">(max {formatNumber(product.quantity)})</span>
                    </span>
                  </div>

                  {/* Below MOQ Warning */}
                  {isBelowMOQ && (
                    <div className="mt-3 flex items-start gap-2 text-sm text-amber-800">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <p>
                        You selected {quantity} {product.unit}, which is below the minimum
                        order quantity of {product.minOrderQuantity} {product.unit}.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Cart Status Info */}
              {productIsInCart && cartQuantity > 0 && (
                <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-emerald-200 shrink-0">
                    <Check className="w-4 h-4 text-emerald-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-emerald-800">
                      Already in your cart
                    </p>
                    <p className="text-sm text-emerald-700">
                      You have {cartQuantity} {product.unit} in your cart
                    </p>
                  </div>
                </div>
              )}

              {/* Success Feedback */}
              {showAddedFeedback && (
                <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl px-4 py-3 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300" role="status">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-emerald-200 shrink-0">
                    <Check className="w-4 h-4 text-emerald-700" />
                  </div>
                  <p className="text-sm font-semibold text-emerald-800">
                    Added {quantity} {product.unit} to cart
                  </p>
                </div>
              )}

              {/* Button Group */}
              <div className="flex flex-col min-[420px]:flex-row gap-3">
                {productIsInCart ? (
                  <>
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      disabled={isOutOfStock || addingToCart}
                      className="shop-btn-outline flex-1 h-12"
                    >
                      {addingToCart ? (
                        'Adding…'
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4" />
                          Add more
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleViewCart}
                      className="shop-btn-primary flex-1 h-12"
                    >
                      <Check className="w-4 h-4" />
                      View cart
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={isOutOfStock || addingToCart}
                    className="shop-btn-primary flex-1 h-12"
                  >
                    {addingToCart ? (
                      'Adding…'
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4" />
                        {isOutOfStock ? 'Out of stock' : 'Add to cart'}
                      </>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleWishlistToggle}
                  disabled={wishlistLoading}
                  className="shop-btn-outline h-12 px-5"
                  title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                  aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                  aria-pressed={isInWishlist}
                >
                  <Heart
                    className={`w-5 h-5 ${
                      isInWishlist ? 'fill-brass text-brass' : ''
                    }`}
                  />
                  <span className="min-[420px]:hidden">{isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}</span>
                </button>
              </div>

              {/* Out of Stock Notice */}
              {isOutOfStock && (
                <div className="bg-red-50/70 border border-red-100 rounded-xl px-4 py-3">
                  <p className="text-sm font-semibold text-red-800">
                    This product is currently out of stock.
                  </p>
                  <p className="text-sm text-red-700 mt-0.5">
                    Please check back later or contact us for availability.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
