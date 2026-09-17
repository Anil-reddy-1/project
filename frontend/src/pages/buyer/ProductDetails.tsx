/**
 * ProductDetails Page (Buyer)
 * Detailed product view with image gallery and purchase actions
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, ShoppingCart, ArrowLeft, AlertCircle, Package } from 'lucide-react';
import { DashboardLayout } from '../../components/layout';
import { ImageGallery } from '../../components/products';
import {
  ActionButton,
  StatusBadge,
  LoadingSpinner,
} from '../../components/ui';
import { productService } from '../../services';
import { useWishlistStatus } from '../../hooks/useWishlist';
import type { Product } from '../../types';
import {
  formatPrice,
  formatNumber,
  getStockStatusColor,
  getStockStatusLabel,
} from '../../utils/productUtils';

export function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  const { isInWishlist, loading: wishlistLoading, toggle: toggleWishlist } =
    useWishlistStatus(id || '');

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
    if (!product) return;
    
    // TODO: Implement cart functionality
    setAddingToCart(true);
    
    try {
      console.log('Add to cart:', { productId: product.id, quantity });
      
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
      
      alert(`Added ${quantity} ${product.unit} of "${product.name}" to cart!`);
    } finally {
      setAddingToCart(false);
    }
  };

  const handleWishlistToggle = async () => {
    await toggleWishlist();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  if (error || !product) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto py-12 text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-red-900 mb-2">
              Product Not Found
            </h2>
            <p className="text-red-700 mb-6">{error || 'The product you are looking for does not exist.'}</p>
            <ActionButton variant="primary" onClick={() => navigate('/buyer/products')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Products
            </ActionButton>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const isOutOfStock = product.quantity === 0;
  const isBelowMOQ = quantity < product.minOrderQuantity;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Back Button */}
        <button
          onClick={() => navigate('/buyer/products')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Products
        </button>

        {/* Product Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Image Gallery */}
          <div>
            <ImageGallery images={product.images} productName={product.name} />
          </div>

          {/* Right Column - Product Info */}
          <div className="space-y-6">
            {/* Category Tags */}
            {product.categoryTags && product.categoryTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.categoryTags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Product Name */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {product.name}
              </h1>
              <p className="text-sm text-gray-500">SKU: {product.sku}</p>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900">
                {formatPrice(product.price)}
              </span>
              <span className="text-xl text-gray-500">/ {product.unit}</span>
            </div>

            {/* Stock Status */}
            <div className="flex items-center gap-4">
              <StatusBadge
                status={getStockStatusColor(product.stockStatus || 'healthy') as any}
                label={getStockStatusLabel(product.stockStatus || 'healthy')}
              />
              <span className="text-sm text-gray-600">
                <span className="font-medium">{formatNumber(product.quantity)}</span>{' '}
                {product.unit} available
              </span>
            </div>

            {/* Description */}
            {product.description && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Description
                </h3>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {product.description}
                </p>
              </div>
            )}

            {/* Product Details */}
            <div className="border-t border-gray-200 pt-6 space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Product Details
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Min Stock:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {formatNumber(product.minStock)} {product.unit}
                  </span>
                </div>
                {product.maxStock && (
                  <div>
                    <span className="text-gray-600">Max Stock:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {formatNumber(product.maxStock)} {product.unit}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-gray-600">Min Order:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {product.minOrderQuantity} {product.unit}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Unit:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {product.unit}
                  </span>
                </div>
              </div>
            </div>

            {/* Minimum Order Quantity Warning */}
            {product.minOrderQuantity > 1 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                <Package className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Minimum Order Quantity
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    This product requires a minimum order of {product.minOrderQuantity}{' '}
                    {product.unit}.
                  </p>
                </div>
              </div>
            )}

            {/* Quantity Selector */}
            {!isOutOfStock && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-gray-300 rounded-lg">
                    <button
                      onClick={() => handleQuantityChange(quantity - 1)}
                      disabled={quantity <= 1}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={product.quantity}
                      value={quantity}
                      onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                      className="w-20 text-center border-x border-gray-300 py-2 focus:outline-none"
                    />
                    <button
                      onClick={() => handleQuantityChange(quantity + 1)}
                      disabled={quantity >= product.quantity}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-sm text-gray-600">
                    {product.unit} (Max: {formatNumber(product.quantity)})
                  </span>
                </div>

                {/* Below MOQ Warning */}
                {isBelowMOQ && (
                  <div className="mt-3 flex items-start gap-2 text-sm text-amber-700">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p>
                      You selected {quantity} {product.unit}, which is below the minimum
                      order quantity of {product.minOrderQuantity} {product.unit}.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6">
              <ActionButton
                variant="primary"
                onClick={handleAddToCart}
                disabled={isOutOfStock || addingToCart}
                className="flex-1"
              >
                {addingToCart ? (
                  'Adding...'
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                  </>
                )}
              </ActionButton>

              <ActionButton
                variant="secondary"
                onClick={handleWishlistToggle}
                disabled={wishlistLoading}
                className="px-6"
                title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Heart
                  className={`w-5 h-5 ${
                    isInWishlist ? 'fill-red-500 text-red-500' : ''
                  }`}
                />
              </ActionButton>
            </div>

            {/* Out of Stock Notice */}
            {isOutOfStock && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-medium text-red-900">
                  This product is currently out of stock.
                </p>
                <p className="text-sm text-red-700 mt-1">
                  Please check back later or contact us for availability.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
