/**
 * Retailer Catalog Page
 * Phase 2.5 Migration - Single Shop Architecture
 * 
 * Direct access to THE shop's product catalog.
 * Replaces shop discovery - no shop selection needed.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';
import { useCart } from '@/hooks';

interface Product {
  itemId: string;
  name: string;
  description?: string;
  price: number;
  stock?: number;
  stockQty?: number;
  moq?: number;
  unit: string;
  category?: string;
  imageUrl?: string;
  images?: Array<{ url: string; publicId: string }>;
  available?: boolean;
  isAvailable?: boolean;
}

interface Shop {
  shopId: string;
  name: string;
  address: string;
  phone: string;
  moqThreshold: number;
}

export default function CatalogPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { items: cartItems, addItem, itemCount } = useCart();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  // Fetch shop and products
  useEffect(() => {
    if (user) {
      fetchCatalog();
    }
  }, [user]);

  async function fetchCatalog() {
    try {
      setLoading(true);
      setError(null);

      // Fetch shop info using API client (there's only one shop)
      const shopData = await apiClient<{ shops: Shop[] }>('/shops', {
        method: 'GET',
      });

      if (shopData.shops && shopData.shops.length > 0) {
        const fetchedShop = shopData.shops[0];
        setShop(fetchedShop);

        // Fetch products for the shop using correct nested route
        const productsData = await apiClient<{ items: Product[] }>(
          `/shops/${fetchedShop.shopId}/items`,
          { method: 'GET' }
        );

        setProducts(productsData.items || []);
      } else {
        setError('Shop not found. Please contact administrator.');
      }
    } catch (err: any) {
      console.error('Failed to fetch catalog:', err);
      
      // Handle 401 - redirect to login
      if (err.status === 401) {
        router.push('/');
        return;
      }
      
      setError(err.message || 'Failed to load catalog');
    } finally {
      setLoading(false);
    }
  }

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      searchQuery === '' ||
      product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' || product.category === selectedCategory;

    // Check both available and isAvailable fields
    const isAvailable = product.available !== false && product.isAvailable !== false;

    return matchesSearch && matchesCategory && isAvailable;
  });

  // Get unique categories (filter out undefined/null)
  const categories = [
    'all',
    ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))
  ];

  // Handle add to cart
  function handleAddToCart(product: Product) {
    const quantity = product.moq || 1;
    addItem({
      itemId: product.itemId,
      name: product.name,
      price: product.price,
      unit: product.unit,
      moq: product.moq,
      imageUrl: product.imageUrl || product.images?.[0]?.url,
    }, quantity);
  }

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading catalog...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Failed to Load Catalog</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={fetchCatalog}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No shop state
  if (!shop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Shop not found. Please contact administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Shop Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{shop.name}</h1>
              <p className="text-gray-600 mt-1">{shop.address}</p>
              <p className="text-sm text-gray-500 mt-1">Phone: {shop.phone}</p>
              <p className="text-sm text-amber-600 mt-2">
                Minimum Order Value: ₹{shop.moqThreshold.toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => router.push('/retailer/cart')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <span>View Cart</span>
              {itemCount > 0 && (
                <span className="bg-white text-blue-600 rounded-full px-2.5 py-0.5 text-sm font-bold">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {categories.map((category, index) => (
                <option key={`${category}-${index}`} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Product Count */}
        <p className="text-gray-600 mt-4">
          Showing {filteredProducts.length} of {products.length} products
        </p>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No products found</p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 text-blue-600 hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.itemId}
                className="bg-white rounded-lg shadow-sm border hover:shadow-md transition"
              >
                {/* Product Image */}
                <div className="aspect-square bg-gray-100 rounded-t-lg overflow-hidden">
                  {(product.imageUrl || (product.images && product.images.length > 0)) ? (
                    <img
                      src={product.imageUrl || product.images?.[0]?.url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <span className="text-6xl">📦</span>
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
                  {product.description && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {product.description}
                    </p>
                  )}

                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-2xl font-bold text-gray-900">
                      ₹{product.price}
                    </span>
                    <span className="text-sm text-gray-500">/ {product.unit}</span>
                  </div>

                  <div className="text-sm text-gray-600 mb-3">
                    {product.moq && <p>MOQ: {product.moq} {product.unit}</p>}
                    <p>Stock: {product.stock || product.stockQty || 0} {product.unit}</p>
                  </div>

                  {/* Add to Cart */}
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
