/**
 * Products Catalog Page (Buyer)
 * Browse and search products with category filtering
 */

import { useState, useEffect } from 'react';
import { Grid, List, Search } from 'lucide-react';
import { DashboardLayout } from '../../components/layout';
import { ProductCard } from '../../components/products';
import {
  SearchBar,
  ActionButton,
  LoadingSpinner,
  EmptyState,
} from '../../components/ui';
import { useProducts } from '../../hooks/useProducts';
import { useWishlist } from '../../hooks/useWishlist';
import type { ProductFilters } from '../../types';

export function Products() {
  const [filters, setFilters] = useState<ProductFilters>({
    page: 1,
    limit: 12,
    sortBy: 'created_at',
    sortOrder: 'DESC',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  // Hooks
  const { products, loading, error, pagination, fetchProducts } = useProducts(
    filters,
    false // Buyer view - active products only
  );
  const { isInWishlist, toggleWishlist } = useWishlist();

  // Fetch available categories from products
  useEffect(() => {
    if (products.length > 0) {
      const categories = new Set<string>();
      products.forEach((product) => {
        product.categoryTags?.forEach((tag) => categories.add(tag));
      });
      setAvailableCategories(Array.from(categories).sort());
    }
  }, [products]);

  // Apply search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({
        ...prev,
        search: searchQuery || undefined,
        page: 1,
      }));
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Apply category filter
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      categoryTags: selectedCategory ? [selectedCategory] : undefined,
      page: 1,
    }));
  }, [selectedCategory]);

  // Fetch products when filters change
  useEffect(() => {
    fetchProducts(filters);
  }, [filters, fetchProducts]);

  // Handle wishlist toggle
  const handleWishlistToggle = async (productId: string, currentlyInWishlist: boolean) => {
    await toggleWishlist(productId, currentlyInWishlist);
  };

  // Handle add to cart (placeholder)
  const handleAddToCart = async (productId: string) => {
    // TODO: Implement cart functionality
    console.log('Add to cart:', productId);
    alert('Cart functionality will be implemented soon!');
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading && products.length === 0) {
    return (
      <DashboardLayout>
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Products</h1>
            <p className="text-gray-600 mt-1">
              Browse our catalog of {pagination?.total || 0} products
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Grid view"
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="List view"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl">
          <SearchBar
            placeholder="Search products by name or SKU..."
            value={searchQuery}
            onChange={setSearchQuery}
            icon={<Search className="w-5 h-5" />}
          />
        </div>

        {/* Category Filter */}
        {availableCategories.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Categories</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === null
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Products
              </button>
              {availableCategories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">Error: {error}</p>
          </div>
        )}

        {/* Products Grid/List */}
        {products.length === 0 && !loading ? (
          <EmptyState
            title="No products found"
            description={
              searchQuery || selectedCategory
                ? 'Try adjusting your search or category filter'
                : 'No products available at the moment'
            }
          />
        ) : (
          <>
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                  : 'flex flex-col gap-4'
              }
            >
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isInWishlist={isInWishlist(product.id)}
                  onWishlistToggle={handleWishlistToggle}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-8">
                <ActionButton
                  variant="secondary"
                  disabled={filters.page === 1}
                  onClick={() => handlePageChange(filters.page! - 1)}
                >
                  Previous
                </ActionButton>
                
                <div className="flex items-center gap-2">
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                    .filter((page) => {
                      // Show first, last, current, and adjacent pages
                      return (
                        page === 1 ||
                        page === pagination.pages ||
                        Math.abs(page - filters.page!) <= 1
                      );
                    })
                    .map((page, idx, arr) => (
                      <div key={page} className="flex items-center gap-2">
                        {/* Add ellipsis */}
                        {idx > 0 && arr[idx - 1] !== page - 1 && (
                          <span className="text-gray-400">...</span>
                        )}
                        <button
                          onClick={() => handlePageChange(page)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            filters.page === page
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {page}
                        </button>
                      </div>
                    ))}
                </div>

                <ActionButton
                  variant="secondary"
                  disabled={filters.page === pagination.pages}
                  onClick={() => handlePageChange(filters.page! + 1)}
                >
                  Next
                </ActionButton>
              </div>
            )}
          </>
        )}

        {/* Results Info */}
        {pagination && products.length > 0 && (
          <div className="text-center text-sm text-gray-600">
            Showing {(filters.page! - 1) * filters.limit! + 1} to{' '}
            {Math.min(filters.page! * filters.limit!, pagination.total)} of{' '}
            {pagination.total} products
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
