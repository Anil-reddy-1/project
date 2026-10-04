import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout';
import {
  DataTable,
  StatusBadge,
  SearchBar,
  PageHeader,
  ActionButton,
  LoadingSpinner,
  EmptyState,
} from '../../components/ui';
import { useProducts } from '../../hooks';
import type { Product, ProductFilters } from '../../types';
import { 
  formatPrice, 
  formatNumber, 
  getStockStatusColor, 
  getStockStatusLabel,
  getPrimaryImageUrl 
} from '../../utils/productUtils';
import { ProductFilters as ProductFiltersComponent } from '../../components/products/ProductFilters';

export function SupervisorProducts() {
  // State
  const [filters, setFilters] = useState<ProductFilters>({
    page: 1,
    limit: 20,
    sortBy: 'created_at',
    sortOrder: 'DESC'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Hooks
  const { products, loading, error, pagination, fetchProducts, refetch } = useProducts(filters, true);

  // Apply search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts({ ...filters, search: searchQuery, page: 1 });
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Refetch when filters change
  useEffect(() => {
    fetchProducts(filters);
  }, [filters]);

  // Handlers
  const handleFilterChange = (newFilters: Partial<ProductFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  // Preset view filters
  const handlePresetView = (view: 'all' | 'low' | 'out' | 'recent') => {
    switch (view) {
      case 'low':
        setFilters(prev => ({ ...prev, stockStatus: 'low', page: 1 }));
        break;
      case 'out':
        setFilters(prev => ({ ...prev, stockStatus: 'out', page: 1 }));
        break;
      case 'recent':
        setFilters(prev => ({ ...prev, sortBy: 'created_at', sortOrder: 'DESC', stockStatus: undefined, page: 1 }));
        break;
      default:
        setFilters(prev => ({ ...prev, stockStatus: undefined, page: 1 }));
    }
  };

  // Table columns
  const columns = [
    {
      key: 'product',
      label: 'PRODUCT',
      render: (product: Product) => (
        <div className="flex items-center gap-3">
          <img
            src={getPrimaryImageUrl(product, '/placeholder-product.png')}
            alt={product.name}
            className="h-12 w-12 rounded-lg object-cover"
          />
          <div>
            <div className="font-medium text-gray-900">{product.name}</div>
            <div className="text-sm text-gray-500">{product.sku}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'CATEGORIES',
      render: (product: Product) => (
        <div className="flex flex-wrap gap-1">
          {product.categoryTags.length > 0 ? (
            product.categoryTags.slice(0, 2).map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
              >
                {tag}
              </span>
            ))
          ) : (
            <span className="text-sm text-gray-400">No categories</span>
          )}
          {product.categoryTags.length > 2 && (
            <span className="text-xs text-gray-500">+{product.categoryTags.length - 2}</span>
          )}
        </div>
      ),
    },
    {
      key: 'stock',
      label: 'STOCK',
      render: (product: Product) => (
        <div>
          <div className="font-semibold text-gray-900">
            {formatNumber(product.quantity)}{' '}
            <span className="text-sm font-normal text-gray-500">{product.unit}</span>
          </div>
          {product.lowStockPercentage !== null && product.lowStockPercentage !== undefined && (
            <div className="text-xs text-gray-500">
              {Number(product.lowStockPercentage).toFixed(1)}% of threshold
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'price',
      label: 'PRICE',
      render: (product: Product) => (
        <div className="font-medium text-gray-900">{formatPrice(product.price)}</div>
      ),
    },
    {
      key: 'stockStatus',
      label: 'STOCK STATUS',
      render: (product: Product) => (
        <StatusBadge
          status={getStockStatusColor(product.stockStatus || 'healthy') as any}
          label={getStockStatusLabel(product.stockStatus || 'healthy')}
        />
      ),
    },
    {
      key: 'status',
      label: 'STATUS',
      render: (product: Product) => (
        <StatusBadge
          status={product.status === 'active' ? 'success' : 'danger'}
          label={product.status === 'active' ? 'Active' : 'Inactive'}
        />
      ),
    },
  ];

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
        {/* Page Header */}
        <PageHeader
          title="Products & Low Alerts"
          subtitle="View product catalog, stock status and low stock alerts"
          actions={
            <div className="flex gap-3">
              <ActionButton variant="secondary" onClick={refetch}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh
              </ActionButton>
            </div>
          }
        />

        {/* Preset Views */}
        <div className="flex gap-3">
          <ActionButton
            variant={filters.stockStatus === undefined ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => handlePresetView('all')}
          >
            All Products
          </ActionButton>
          <ActionButton
            variant={filters.stockStatus === 'low' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => handlePresetView('low')}
          >
            Low Stock Alert
          </ActionButton>
          <ActionButton
            variant={filters.stockStatus === 'out' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => handlePresetView('out')}
          >
            Out of Stock
          </ActionButton>
          <ActionButton variant="secondary" size="sm" onClick={() => handlePresetView('recent')}>
            Recently Added
          </ActionButton>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center flex-1">
            <div className="flex-1 max-w-md">
              <SearchBar
                placeholder="Search by name or SKU..."
                value={searchQuery}
                onChange={setSearchQuery}
              />
            </div>
            <ActionButton
              variant="secondary"
              onClick={() => setShowFilters(!showFilters)}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </ActionButton>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <ProductFiltersComponent filters={filters} onChange={handleFilterChange} />
        )}

        {/* Products Table */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">Error: {error}</p>
          </div>
        )}

        {products.length === 0 && !loading ? (
          <EmptyState
            title="No products found"
            description={
              searchQuery || showFilters
                ? 'Try adjusting your filters or search query'
                : 'No products available.'
            }
          />
        ) : (
          <>
            <DataTable 
              columns={columns} 
              data={products} 
              keyExtractor={(product) => product.id}
            />
            
            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
                <div className="flex justify-between flex-1 sm:hidden">
                  <ActionButton
                    variant="secondary"
                    disabled={filters.page === 1}
                    onClick={() => handlePageChange(filters.page! - 1)}
                  >
                    Previous
                  </ActionButton>
                  <ActionButton
                    variant="secondary"
                    disabled={filters.page === pagination.pages}
                    onClick={() => handlePageChange(filters.page! + 1)}
                  >
                    Next
                  </ActionButton>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{(filters.page! - 1) * filters.limit! + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(filters.page! * filters.limit!, pagination.total)}
                      </span>{' '}
                      of <span className="font-medium">{pagination.total}</span> results
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <ActionButton
                      variant="secondary"
                      disabled={filters.page === 1}
                      onClick={() => handlePageChange(filters.page! - 1)}
                    >
                      Previous
                    </ActionButton>
                    <ActionButton
                      variant="secondary"
                      disabled={filters.page === pagination.pages}
                      onClick={() => handlePageChange(filters.page! + 1)}
                    >
                      Next
                    </ActionButton>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
