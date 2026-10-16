/**
 * Products Catalog Page (Buyer)
 * Browse and search products with category filtering and cart integration
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useCart } from '../../hooks/useCart';
import type { ProductFilters } from '../../types';

export function Products() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ProductFilters>({
    page: 1,
    limit: 12,
    sortBy: 'created_at',
    sortOrder: 'DESC',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const selectedCategory = filters.categoryTags?.[0] || null;

  const handleCategorySelect = (category: string | null) => {
    setFilters((prev) => ({
      ...prev,
      categoryTags: category ? [category] : undefined,
      page: 1,
    }));
  };

  // Hooks
  const { products, loading, error, pagination, fetchProducts } = useProducts(
    filters,
    false // Buyer view - active products only
  );
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { cartItems, addToCart, isInCart } = useCart();

  // Derive available categories from products
  const availableCategories = useMemo(() => {
    if (products.length === 0) return [];
    const categories = new Set<string>();
    products.forEach((product) => {
      product.categoryTags?.forEach((tag) => categories.add(tag));
    });
    return Array.from(categories).sort();
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



  // Fetch products when filters change
  useEffect(() => {
    fetchProducts(filters);
  }, [filters, fetchProducts]);

  // Handle wishlist toggle
  const handleWishlistToggle = async (productId: string, currentlyInWishlist: boolean) => {
    await toggleWishlist(productId, currentlyInWishlist);
  };

  // Handle add to cart
  const handleAddToCart = async (productId: string, quantity?: number) => {
    await addToCart(productId, quantity);
  };

  // Handle view cart
  const handleViewCart = () => {
    navigate('/buyer/cart');
  };

  // Get cart quantity for a product
  const getCartQuantity = (productId: string): number => {
    const cartItem = cartItems.find(item => item.product.id === productId);
    return cartItem?.quantity || 0;
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
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200/70 rounded-full text-indigo-700 font-bold text-xs uppercase tracking-wider mb-2.5">
              <span>✦</span> Verified Wholesale Inventory
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              Bulk Wholesale Catalog
            </h1>
            <p className="text-slate-500 mt-1.5 text-sm">
              Explore {pagination?.total || 0} direct factory & warehouse products ready for fast dispatch
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              className={`p-2.5 rounded-xl transition-all duration-200 ${
                viewMode === 'grid'
                  ? 'bg-white text-indigo-600 shadow-sm font-semibold'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              title="Grid view"
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              aria-label="List view"
              className={`p-2.5 rounded-xl transition-all duration-200 ${
                viewMode === 'list'
                  ? 'bg-white text-indigo-600 shadow-sm font-semibold'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
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
            placeholder="Search products by title, SKU, or category…"
            value={searchQuery}
            onChange={setSearchQuery}
            icon={<Search className="w-5 h-5" />}
          />
        </div>

        {/* Category Filter */}
        {availableCategories.length > 0 && (
          <div className="rounded-3xl bg-white border border-slate-200/80 p-5 sm:p-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400 mb-3.5">
              Filter By Department
            </h3>
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => handleCategorySelect(null)}
                className={`px-4.5 py-2 rounded-full text-xs font-bold transition-all duration-200 ${
                  selectedCategory === null
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20 scale-[1.02]'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                All Departments
              </button>
              {availableCategories.map((category) => (
                <button
                  key={category}
                  onClick={() => handleCategorySelect(category)}
                  className={`px-4.5 py-2 rounded-full text-xs font-bold transition-all duration-200 ${
                    selectedCategory === category
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20 scale-[1.02]'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
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
                  isInCart={isInCart(product.id)}
                  cartQuantity={getCartQuantity(product.id)}
                  onWishlistToggle={handleWishlistToggle}
                  onAddToCart={handleAddToCart}
                  onViewCart={handleViewCart}
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
                          <span className="text-gray-400">…</span>
                        )}
                        <button
                          onClick={() => handlePageChange(page)}
                          className={`w-10 h-10 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center ${
                            filters.page === page
                              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 scale-105'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
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
