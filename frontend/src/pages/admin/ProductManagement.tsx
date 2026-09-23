/**
 * Product Management Page (Enhanced Stock Management)
 * Admin page for comprehensive product/stock management with image upload
 */

import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout';
import {
  StatsCard,
  DataTable,
  StatusBadge,
  SearchBar,
  FilterSelect,
  PageHeader,
  ActionButton,
  LoadingSpinner,
  EmptyState,
} from '../../components/ui';
import { useProducts, useProductStats } from '../../hooks';
import { productService } from '../../services';
import type { Product, ProductFilters, ProductStatus, StockStatus } from '../../types';
import { 
  formatPrice, 
  formatNumber, 
  getStockStatusColor, 
  getStockStatusLabel,
  getPrimaryImageUrl 
} from '../../utils/productUtils';
import { ProductFormModal } from '../../components/products/ProductFormModal';
import { ProductFilters as ProductFiltersComponent } from '../../components/products/ProductFilters';

export function ProductManagement() {
  // State
  const [filters, setFilters] = useState<ProductFilters>({
    page: 1,
    limit: 20,
    sortBy: 'created_at',
    sortOrder: 'DESC'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Hooks
  const { products, loading, error, pagination, fetchProducts, refetch } = useProducts(filters, true);
  const { stats, loading: statsLoading, refetch: refetchStats } = useProductStats();

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

  const handleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map(p => p.id)));
    }
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate') => {
    if (selectedProducts.size === 0) return;
    
    try {
      const status: ProductStatus = action === 'activate' ? 'active' : 'inactive';
      await productService.bulkUpdateStatus({
        productIds: Array.from(selectedProducts),
        status
      });
      
      setSelectedProducts(new Set());
      refetch();
      refetchStats();
    } catch (err) {
      console.error('Bulk action failed:', err);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await productService.exportProducts(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setIsProductModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsProductModalOpen(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    
    try {
      await productService.deleteProduct(productId);
      refetch();
      refetchStats();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleProductSaved = () => {
    setIsProductModalOpen(false);
    setEditingProduct(null);
    refetch();
    refetchStats();
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
      key: 'select',
      label: (
        <input
          type="checkbox"
          checked={selectedProducts.size === products.length && products.length > 0}
          onChange={handleSelectAll}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      ),
      render: (product: Product) => (
        <input
          type="checkbox"
          checked={selectedProducts.has(product.id)}
          onChange={() => handleSelectProduct(product.id)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      ),
    },
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
              {Number(product.lowStockPercentage).toFixed(1)}% of max
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
    {
      key: 'actions',
      label: '',
      render: (product: Product) => (
        <div className="flex items-center justify-end gap-2">
          <ActionButton variant="secondary" size="sm" onClick={() => handleEditProduct(product)}>
            Edit
          </ActionButton>
          <ActionButton variant="danger" size="sm" onClick={() => handleDeleteProduct(product.id)}>
            Delete
          </ActionButton>
        </div>
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
          title="Product & Stock Management"
          subtitle="Manage your product catalog with images, inventory, pricing, and categories"
          actions={
            <div className="flex gap-3">
              <ActionButton variant="secondary" onClick={handleExport}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Export CSV
              </ActionButton>
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
              <ActionButton variant="primary" onClick={handleAddProduct}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Product
              </ActionButton>
            </div>
          }
        />

        {/* Stats Cards */}
        {stats && !statsLoading && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatsCard
              title="TOTAL PRODUCTS"
              value={formatNumber(stats.totalProducts)}
              subtitle="Active SKUs"
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              }
              trend="neutral"
            />
            <StatsCard
              title="IN STOCK"
              value={formatNumber(stats.inStockCount)}
              subtitle="Available Products"
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
              trend="up"
            />
            <StatsCard
              title="LOW STOCK ALERT"
              value={formatNumber(stats.lowStockCount)}
              subtitle="Below 10%"
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              }
              trend="down"
            />
            <StatsCard
              title="OUT OF STOCK"
              value={formatNumber(stats.outOfStockCount)}
              subtitle="Critical"
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
              trend="up"
            />
            <StatsCard
              title="INVENTORY VALUE"
              value={formatPrice(stats.totalInventoryValue)}
              subtitle="Total Value"
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
              trend="neutral"
            />
            <StatsCard
              title="CATEGORIES"
              value={formatNumber(stats.categoriesCount)}
              subtitle="Total Categories"
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
              }
              trend="neutral"
            />
          </div>
        )}

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

          {/* Bulk Actions */}
          {selectedProducts.size > 0 && (
            <div className="flex gap-3">
              <span className="text-sm text-gray-600 self-center">
                {selectedProducts.size} selected
              </span>
              <ActionButton size="sm" variant="primary" onClick={() => handleBulkAction('activate')}>
                Activate
              </ActionButton>
              <ActionButton size="sm" variant="danger" onClick={() => handleBulkAction('deactivate')}>
                Deactivate
              </ActionButton>
            </div>
          )}
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
                : 'Get started by adding your first product'
            }
            action={
              <ActionButton variant="primary" onClick={handleAddProduct}>
                Add First Product
              </ActionButton>
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

        {/* Product Form Modal */}
        <ProductFormModal
          isOpen={isProductModalOpen}
          onClose={() => {
            setIsProductModalOpen(false);
            setEditingProduct(null);
          }}
          product={editingProduct}
          onSaved={handleProductSaved}
        />
      </div>
    </DashboardLayout>
  );
}
