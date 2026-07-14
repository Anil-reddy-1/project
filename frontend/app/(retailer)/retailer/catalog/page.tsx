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

interface Product {
  itemId: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  moq: number;
  unit: string;
  category: string;
  imageUrl?: string;
  available: boolean;
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
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<Record<string, number>>({});

  // Fetch shop and products
  useEffect(() => {
    fetchCatalog();
  }, []);

  async function fetchCatalog() {
    try {
      setLoading(true);
      setError(null);

      // Fetch shop info (there's only one)
      const shopRes = await fetch('/api/shops', {
        credentials: 'include',
      });

      if (!shopRes.ok) {
        throw new Error('Failed to fetch shop information');
      }

      const shopData = await shopRes.json();
      if (shopData.shops && shopData.shops.length > 0) {
        setShop(shopData.shops[0]);

        // Fetch products for the shop
        const productsRes = await fetch(`/api/shops/${shopData.shops[0].shopId}/items`, {
          credentials: 'include',
        });

        if (!productsRes.ok) {
          throw new Error('Failed to fetch products');
        }

        const productsData = await productsRes.json();
        setProducts(productsData.items || []);
      } else {
        setError('Shop not found. Please contact administrator.');
      }
    } catch (err: any) {
      console.error('Failed to fetch catalog:', err);
      setError(err.message || 'Failed to load catalog');
    } finally {
      setLoading(false);
    }
  }

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      searchQuery === '' ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' || product.category === selectedCategory;

    return matchesSearch && matchesCategory && product.available;
  });

  // Get unique categories
  const categories = ['all', ...new Set(products.map((p) => p.category))];

  // Add to cart
  function addToCart(productId: string, quantity: number) {
    setCart((prev) => ({
      ...prev,
      [productId]: (prev[productId] || 0) + quantity,
    }));
    // TODO: Sync with backend cart
  }

  // Loading state
  if (loading) {
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
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
            >
              View Cart
              {Object.keys(cart).length > 0 && (
                <span className="ml-2 bg-white text-blue-600 rounded-full px-2 py-0.5 text-sm font-bold">
                  {Object.keys(cart).length}
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
              {categories.map((category) => (
                <option key={category} value={category}>
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
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
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
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {product.description}
                  </p>

                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-2xl font-bold text-gray-900">
                      ₹{product.price}
                    </span>
                    <span className="text-sm text-gray-500">/ {product.unit}</span>
                  </div>

                  <div className="text-sm text-gray-600 mb-3">
                    <p>MOQ: {product.moq} {product.unit}</p>
                    <p>Stock: {product.stock} {product.unit}</p>
                  </div>

                  {/* Add to Cart */}
                  <button
                    onClick={() => addToCart(product.itemId, product.moq)}
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
