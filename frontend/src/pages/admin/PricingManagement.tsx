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
  Modal,
  LoadingSpinner,
  EmptyState,
} from '../../components/ui';
import { pricingService } from '../../services';
import type { PriceData, UpdatePricePayload } from '../../services/pricing.service';

export function PricingManagement() {
  const [prices, setPrices] = useState<PriceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [changeFilter, setChangeFilter] = useState<string>('all');
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [_isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PriceData | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [priceData, setPriceData] = useState<{
    retailPrice: string;
    wholesalePrice: string;
    costPrice: string;
    margin: string;
  }>({
    retailPrice: '',
    wholesalePrice: '',
    costPrice: '',
    margin: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPrices();
  }, []);

  const loadPrices = async () => {
    try {
      setLoading(true);
      const data = await pricingService.getAllPrices();
      setPrices(data);
    } catch (error) {
      console.error('Failed to load prices:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPrices = prices.filter((item) => {
    const matchesSearch =
      item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesChange =
      changeFilter === 'all' ||
      (changeFilter === 'increased' && item.retailPrice > (item.previousRetailPrice || 0)) ||
      (changeFilter === 'decreased' && item.retailPrice < (item.previousRetailPrice || 0)) ||
      (changeFilter === 'unchanged' && item.retailPrice === (item.previousRetailPrice || 0));
    return matchesSearch && matchesCategory && matchesChange;
  });

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!priceData.retailPrice || Number(priceData.retailPrice) <= 0) {
      errors.retailPrice = 'Retail price must be greater than 0';
    }
    if (!priceData.wholesalePrice || Number(priceData.wholesalePrice) <= 0) {
      errors.wholesalePrice = 'Wholesale price must be greater than 0';
    }
    if (priceData.costPrice && Number(priceData.costPrice) < 0) {
      errors.costPrice = 'Cost price cannot be negative';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdatePrice = async () => {
    if (!selectedItem || !validateForm()) return;

    try {
      setSubmitting(true);
      const payload: UpdatePricePayload = {
        retailPrice: Number(priceData.retailPrice),
        wholesalePrice: Number(priceData.wholesalePrice),
        costPrice: priceData.costPrice ? Number(priceData.costPrice) : undefined,
      };
      const updated = await pricingService.updatePrice(selectedItem.productId, payload);
      setPrices(prices.map((item) => (item.id === updated.id ? updated : item)));
      setIsUpdateModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to update price:', error);
      setFormErrors({ submit: 'Failed to update price. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const openUpdateModal = (item: PriceData) => {
    setSelectedItem(item);
    setPriceData({
      retailPrice: item.retailPrice.toString(),
      wholesalePrice: (item.wholesalePrice ?? 0).toString(),
      costPrice: item.costPrice?.toString() || '',
      margin: item.margin?.toString() || '',
    });
    setFormErrors({});
    setIsUpdateModalOpen(true);
  };

  const resetForm = () => {
    setPriceData({
      retailPrice: '',
      wholesalePrice: '',
      costPrice: '',
      margin: '',
    });
    setFormErrors({});
    setSelectedItem(null);
  };

  const toggleItemSelection = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const toggleAllItems = () => {
    if (selectedItems.length === filteredPrices.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredPrices.map((item) => item.id));
    }
  };

  const calculateMargin = () => {
    const retail = Number(priceData.retailPrice) || 0;
    const cost = Number(priceData.costPrice) || 0;
    if (retail > 0 && cost > 0) {
      const margin = ((retail - cost) / retail) * 100;
      setPriceData({ ...priceData, margin: margin.toFixed(2) });
    }
  };

  useEffect(() => {
    if (priceData.retailPrice && priceData.costPrice) {
      calculateMargin();
    }
  }, [priceData.retailPrice, priceData.costPrice]);

  const columns = [
    {
      key: 'select',
      label: (
        <input
          type="checkbox"
          checked={selectedItems.length === filteredPrices.length && filteredPrices.length > 0}
          onChange={toggleAllItems}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      ),
      render: (item: PriceData) => (
        <input
          type="checkbox"
          checked={selectedItems.includes(item.id)}
          onChange={() => toggleItemSelection(item.id)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      ),
    },
    {
      key: 'product',
      label: 'PRODUCT NAME & CATEGORY',
      render: (item: PriceData) => (
        <div>
          <div className="font-medium text-gray-900">{item.productName}</div>
          <div className="text-sm text-gray-500">{item.category || 'Uncategorized'}</div>
        </div>
      ),
    },
    {
      key: 'sku',
      label: 'SKU',
      render: (item: PriceData) => (
        <div className="font-mono text-sm text-gray-700">{item.sku}</div>
      ),
    },
    {
      key: 'retail',
      label: 'RETAIL',
      render: (item: PriceData) => (
        <div>
          <div className="font-semibold text-gray-900">₹{item.retailPrice.toFixed(2)}</div>
          {item.previousRetailPrice && item.previousRetailPrice !== item.retailPrice && (
            <div className="text-xs text-gray-500">was ₹{item.previousRetailPrice.toFixed(2)}</div>
          )}
        </div>
      ),
    },
    {
      key: 'wholesale',
      label: 'WHOLESALE',
      render: (item: PriceData) => (
        <div className="font-semibold text-gray-900">₹{(item.wholesalePrice ?? 0).toFixed(2)}</div>
      ),
    },
    {
      key: 'cost',
      label: 'COST (BASE)',
      render: (item: PriceData) => (
        <div className="text-sm text-gray-700">
          {item.costPrice ? `₹${item.costPrice.toFixed(2)}` : 'N/A'}
        </div>
      ),
    },
    {
      key: 'margin',
      label: 'PROFIT %',
      render: (item: PriceData) => (
        <div>
          {item.margin ? (
            <StatusBadge
              status={item.margin >= 20 ? 'success' : item.margin >= 10 ? 'warning' : 'danger'}
              label={`${item.margin.toFixed(1)}%`}
            />
          ) : (
            <span className="text-sm text-gray-500">N/A</span>
          )}
        </div>
      ),
    },
    {
      key: 'lastUpdated',
      label: 'LAST EDIT',
      render: (item: PriceData) => (
        <div>
          <div className="text-sm text-gray-700">
            {item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString() : 'Never'}
          </div>
          {item.updatedBy && <div className="text-xs text-gray-500">{item.updatedBy}</div>}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'ACTIONS',
      render: (item: PriceData) => (
        <ActionButton variant="primary" size="sm" onClick={() => openUpdateModal(item)}>
          Edit Price
        </ActionButton>
      ),
    },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  const totalProducts = prices.length;
  const avgRetailPrice =
    prices.length > 0 ? prices.reduce((sum, p) => sum + p.retailPrice, 0) / prices.length : 0;
  const priceIncreases = prices.filter(
    (p) => p.previousRetailPrice && p.retailPrice > p.previousRetailPrice
  ).length;

  const categories = Array.from(new Set(prices.map((item) => item.category))).filter(Boolean);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Pricing & Margin Management"
          description="Set retail and wholesale pricing, track cost margins, and view price change history"
        >
          <ActionButton variant="primary">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Export Pricing List
          </ActionButton>
        </PageHeader>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-4">
          <StatsCard
            title="ACTIVE CATALOG"
            value={totalProducts.toString()}
            subtitle="Active • with pricing"
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
          <StatsCard
            title="ACTIVE RETAIL PRICE"
            value={`₹${avgRetailPrice.toFixed(2)}`}
            subtitle="AVG"
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
            trend="up"
            trendValue="+5.2% avg from last"
          />
          <StatsCard
            title="AVG MARGIN SPREAD"
            value="28.4%"
            subtitle="Margin"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            }
            trend="up"
            trendValue="+2.1%"
          />
          <StatsCard
            title="TOP SKUs"
            value={priceIncreases.toString()}
            subtitle="Optimized • sorted margin"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            }
            trend="neutral"
          />
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center flex-1">
            <div className="flex-1 max-w-md">
              <SearchBar
                placeholder="Search by product name or SKU..."
                value={searchQuery}
                onChange={setSearchQuery}
              />
            </div>
            <FilterSelect
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                { value: 'all', label: 'All Categories' },
                ...categories.filter(Boolean).map((cat) => ({ value: cat as string, label: cat as string })),
              ]}
            />
            <FilterSelect
              value={changeFilter}
              onChange={setChangeFilter}
              options={[
                { value: 'all', label: 'All Changes' },
                { value: 'increased', label: 'Price Increased' },
                { value: 'decreased', label: 'Price Decreased' },
                { value: 'unchanged', label: 'Unchanged' },
              ]}
            />
          </div>
          {selectedItems.length > 0 && (
            <ActionButton variant="secondary" onClick={() => setIsBulkUpdateModalOpen(true)}>
              Bulk Update ({selectedItems.length})
            </ActionButton>
          )}
        </div>

        {/* Pricing Table */}
        {filteredPrices.length === 0 ? (
          <EmptyState
            title="No pricing data found"
            description={
              searchQuery || categoryFilter !== 'all' || changeFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by adding products with pricing'
            }
          />
        ) : (
          <DataTable columns={columns} data={filteredPrices} />
        )}

        {/* Update Price Modal */}
        <Modal
          isOpen={isUpdateModalOpen}
          onClose={() => setIsUpdateModalOpen(false)}
          title="Update Pricing"
          size="md"
        >
          <div className="space-y-4">
            {selectedItem && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">Updating prices for</div>
                <div className="font-semibold text-gray-900">{selectedItem.productName}</div>
                <div className="text-sm text-gray-600 mt-1">SKU: {selectedItem.sku}</div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Retail Price <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={priceData.retailPrice}
                    onChange={(e) => {
                      setPriceData({ ...priceData, retailPrice: e.target.value });
                      if (formErrors.retailPrice) setFormErrors({ ...formErrors, retailPrice: '' });
                    }}
                    className={`w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      formErrors.retailPrice ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                </div>
                {formErrors.retailPrice && (
                  <p className="mt-1 text-sm text-red-500">{formErrors.retailPrice}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Wholesale Price <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={priceData.wholesalePrice}
                    onChange={(e) => {
                      setPriceData({ ...priceData, wholesalePrice: e.target.value });
                      if (formErrors.wholesalePrice)
                        setFormErrors({ ...formErrors, wholesalePrice: '' });
                    }}
                    className={`w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      formErrors.wholesalePrice ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                </div>
                {formErrors.wholesalePrice && (
                  <p className="mt-1 text-sm text-red-500">{formErrors.wholesalePrice}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cost Price (Base)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={priceData.costPrice}
                    onChange={(e) => {
                      setPriceData({ ...priceData, costPrice: e.target.value });
                      if (formErrors.costPrice) setFormErrors({ ...formErrors, costPrice: '' });
                    }}
                    className={`w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      formErrors.costPrice ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                </div>
                {formErrors.costPrice && (
                  <p className="mt-1 text-sm text-red-500">{formErrors.costPrice}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profit Margin %
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={priceData.margin}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                </div>
              </div>
            </div>

            {formErrors.submit && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{formErrors.submit}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <ActionButton
                variant="secondary"
                onClick={() => setIsUpdateModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </ActionButton>
              <ActionButton variant="primary" onClick={handleUpdatePrice} disabled={submitting}>
                {submitting ? 'Updating...' : 'Update Pricing'}
              </ActionButton>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
