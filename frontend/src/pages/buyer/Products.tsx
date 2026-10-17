/**
 * Products Catalog Page (Buyer)
 * Browse and search products with category filtering and cart integration
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid, List, Search, X, ChevronLeft, ChevronRight, PackageSearch } from 'lucide-react';
import { DashboardLayout } from '../../components/layout';
import { ProductCard } from '../../components/products';
import { LoadingSpinner } from '../../components/ui';
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
        <div className="py-24 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  const pageButtonBase =
    'h-10 min-w-10 px-3 rounded-full text-sm font-semibold tabular-nums transition-colors flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-brass-300';

  return (
    <DashboardLayout>
      <div className="space-y-8 sm:space-y-10">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div className="max-w-2xl">
            <p className="shop-eyebrow">The catalogue</p>
            <h1 className="shop-title mt-2">Wholesale catalogue</h1>
            <p className="shop-subtitle mt-2">
              {pagination?.total || 0} verified products from our warehouse, ready for dispatch.
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="inline-flex self-start sm:self-auto items-center gap-1 p-1 bg-white rounded-full border border-ivory-300" role="group" aria-label="Layout">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                viewMode === 'grid'
                  ? 'bg-ink text-white'
                  : 'text-ink-500 hover:text-ink hover:bg-ivory-100'
              }`}
              title="Grid view"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                viewMode === 'list'
                  ? 'bg-ink text-white'
                  : 'text-ink-500 hover:text-ink hover:bg-ivory-100'
              }`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="shop-rule" />

        {/* Search + Category Filter */}
        <div className="space-y-5">
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, SKU or category…"
              aria-label="Search products"
              className="shop-input pl-11 pr-11 rounded-full"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-ink hover:bg-ivory-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {availableCategories.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500 mb-3">
                Shop by department
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleCategorySelect(null)}
                  aria-pressed={selectedCategory === null}
                  className={`h-9 px-4 rounded-full text-[13px] font-medium border transition-colors ${
                    selectedCategory === null
                      ? 'bg-ink text-white border-ink'
                      : 'bg-white text-ink-700 border-ivory-300 hover:border-ink-300 hover:text-ink'
                  }`}
                >
                  All departments
                </button>
                {availableCategories.map((category) => (
                  <button
                    type="button"
                    key={category}
                    onClick={() => handleCategorySelect(category)}
                    aria-pressed={selectedCategory === category}
                    className={`h-9 px-4 rounded-full text-[13px] font-medium border transition-colors ${
                      selectedCategory === category
                        ? 'bg-ink text-white border-ink'
                        : 'bg-white text-ink-700 border-ivory-300 hover:border-ink-300 hover:text-ink'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="px-5 py-4 bg-red-50 border border-red-100 rounded-2xl" role="alert">
            <p className="text-sm text-red-700">Error: {error}</p>
          </div>
        )}

        {/* Products Grid/List */}
        {products.length === 0 && !loading ? (
          <div className="shop-card px-6 py-16 sm:py-20 text-center">
            <div className="w-14 h-14 mx-auto rounded-full border border-ivory-300 bg-ivory-50 flex items-center justify-center mb-5">
              <PackageSearch className="w-6 h-6 text-ink-300" />
            </div>
            <h3 className="shop-heading">No products found</h3>
            <p className="shop-subtitle mt-2 max-w-sm mx-auto">
              {searchQuery || selectedCategory
                ? 'Try adjusting your search or category filter'
                : 'No products available at the moment'}
            </p>
          </div>
        ) : (
          <>
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6'
                  : 'grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6'
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
              <nav className="flex flex-wrap items-center justify-center gap-2 pt-6" aria-label="Pagination">
                <button
                  type="button"
                  disabled={filters.page === 1}
                  onClick={() => handlePageChange(filters.page! - 1)}
                  aria-label="Previous page"
                  className="shop-btn-outline h-10 px-4"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden min-[400px]:inline">Previous</span>
                </button>

                <div className="flex items-center gap-1.5">
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
                      <div key={page} className="flex items-center gap-1.5">
                        {/* Add ellipsis */}
                        {idx > 0 && arr[idx - 1] !== page - 1 && (
                          <span className="px-1 text-stone-400">…</span>
                        )}
                        <button
                          type="button"
                          onClick={() => handlePageChange(page)}
                          aria-current={filters.page === page ? 'page' : undefined}
                          aria-label={`Page ${page}`}
                          className={`${pageButtonBase} ${
                            filters.page === page
                              ? 'bg-ink text-white'
                              : 'bg-white border border-ivory-300 text-ink-700 hover:border-ink-300 hover:text-ink'
                          }`}
                        >
                          {page}
                        </button>
                      </div>
                    ))}
                </div>

                <button
                  type="button"
                  disabled={filters.page === pagination.pages}
                  onClick={() => handlePageChange(filters.page! + 1)}
                  aria-label="Next page"
                  className="shop-btn-outline h-10 px-4"
                >
                  <span className="hidden min-[400px]:inline">Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </nav>
            )}
          </>
        )}

        {/* Results Info */}
        {pagination && products.length > 0 && (
          <p className="text-center text-xs tracking-wide text-stone-500 tabular-nums">
            Showing {(filters.page! - 1) * filters.limit! + 1} to{' '}
            {Math.min(filters.page! * filters.limit!, pagination.total)} of{' '}
            {pagination.total} products
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
