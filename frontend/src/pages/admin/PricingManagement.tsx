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
import type { PriceData, UpdatePricePayload, BulkUpdatePayload, PricingStats, PriceHistory } from '../../services/pricing.service';
// import { api } from '../../services/api.service';

export function PricingManagement() {
  const [prices, setPrices] = useState<PriceData[]>([]);
  const [stats, setStats] = useState<PricingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [changeFilter, setChangeFilter] = useState<string>('all');
  
  // Modals state
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Selection
  const [selectedItem, setSelectedItem] = useState<PriceData | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  // Update Price Form
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

  // Bulk Update Form
  const [bulkData, setBulkData] = useState<{
    adjustmentType: 'percentage' | 'flat';
    adjustmentValue: string;
    applyTo: 'retail' | 'wholesale' | 'both';
  }>({
    adjustmentType: 'percentage',
    adjustmentValue: '',
    applyTo: 'both',
  });

  // History Data
  const [historyData, setHistoryData] = useState<PriceHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [pageMessage, setPageMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pricesData, statsData] = await Promise.all([
        pricingService.getAllPrices(),
        pricingService.getStats()
      ]);
      setPrices(pricesData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      showPageMessage('error', 'Failed to load pricing data');
    } finally {
      setLoading(false);
    }
  };

  const showPageMessage = (type: 'success' | 'error', text: string) => {
    setPageMessage({ type, text });
    setTimeout(() => setPageMessage(null), 3000);
  };

  const filteredPrices = prices.filter((item) => {
    const matchesSearch =
      item.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesChange =
      changeFilter === 'all' ||
      (changeFilter === 'increased' && item.retailPrice > (item.previousRetailPrice || 0)) ||
      (changeFilter === 'decreased' && item.retailPrice < (item.previousRetailPrice || 0)) ||
      (changeFilter === 'unchanged' && item.retailPrice === (item.previousRetailPrice || 0));
    return matchesSearch && matchesCategory && matchesChange;
  });

  const validateUpdateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!priceData.retailPrice || Number(priceData.retailPrice) <= 0) {
      errors.retailPrice = 'Retail price must be greater than 0';
    }
    if (priceData.wholesalePrice && Number(priceData.wholesalePrice) < 0) {
      errors.wholesalePrice = 'Wholesale price cannot be negative';
    }
    if (priceData.costPrice && Number(priceData.costPrice) < 0) {
      errors.costPrice = 'Cost price cannot be negative';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdatePrice = async () => {
    if (!selectedItem || !validateUpdateForm()) return;

    try {
      setSubmitting(true);
      const payload: UpdatePricePayload = {
        retailPrice: Number(priceData.retailPrice),
        wholesalePrice: priceData.wholesalePrice ? Number(priceData.wholesalePrice) : undefined,
        costPrice: priceData.costPrice ? Number(priceData.costPrice) : undefined,
      };
      
      await pricingService.updatePrice(selectedItem.productId, payload);
      
      // Reload everything to get updated stats and margin calculations from backend
      await loadData();
      
      setIsUpdateModalOpen(false);
      showPageMessage('success', 'Price updated successfully');
      resetUpdateForm();
    } catch (error) {
      console.error('Failed to update price:', error);
      setFormErrors({ submit: 'Failed to update price. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedItems.length === 0) return;
    
    if (!bulkData.adjustmentValue || Number(bulkData.adjustmentValue) === 0) {
      setFormErrors({ adjustmentValue: 'Please enter a valid adjustment value' });
      return;
    }

    try {
      setSubmitting(true);
      const payload: BulkUpdatePayload = {
        productIds: selectedItems,
        adjustmentType: bulkData.adjustmentType,
        adjustmentValue: Number(bulkData.adjustmentValue),
        applyTo: bulkData.applyTo
      };

      const result = await pricingService.bulkUpdate(payload);
      await loadData();
      setIsBulkUpdateModalOpen(false);
      setSelectedItems([]);
      showPageMessage('success', `Bulk update applied to ${result.updated} products`);
    } catch (error) {
      console.error('Failed to apply bulk update:', error);
      setFormErrors({ submit: 'Failed to apply bulk update. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async () => {
    try {
      // Create a direct fetch to bypass JSON parsing for Blob
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/pricing/export', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pricing-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      showPageMessage('success', 'Export started successfully');
    } catch (error) {
      console.error('Export failed:', error);
      showPageMessage('error', 'Failed to export pricing data');
    }
  };

  const openUpdateModal = (item: PriceData) => {
    setSelectedItem(item);
    setPriceData({
      retailPrice: item.retailPrice?.toString() || '',
      wholesalePrice: item.wholesalePrice?.toString() || '',
      costPrice: item.costPrice?.toString() || '',
      margin: item.margin?.toString() || '',
    });
    setFormErrors({});
    setIsUpdateModalOpen(true);
  };

  const openHistoryModal = async (item: PriceData) => {
    setSelectedItem(item);
    setIsHistoryModalOpen(true);
    setHistoryLoading(true);
    setHistoryData([]);
    try {
      const data = await pricingService.getPriceHistory(item.productId);
      setHistoryData(data);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const resetUpdateForm = () => {
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
    if (selectedItems.length === filteredPrices.length && filteredPrices.length > 0) {
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
      setPriceData((prev) => ({ ...prev, margin: margin.toFixed(2) }));
    } else {
      setPriceData((prev) => ({ ...prev, margin: '' }));
    }
  };

  useEffect(() => {
    calculateMargin();
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
          <div className="font-semibold text-gray-900">₹{(item.retailPrice || 0).toFixed(2)}</div>
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
        <div className="font-semibold text-gray-900">
          {item.wholesalePrice ? `₹${item.wholesalePrice.toFixed(2)}` : 'N/A'}
        </div>
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
      render: (item: PriceData) => {
        const margin = item.margin || 0;
        return (
          <div>
            {item.margin !== null && item.margin !== undefined ? (
              <StatusBadge
                status={margin >= 20 ? 'success' : margin >= 10 ? 'warning' : 'danger'}
                label={`${margin.toFixed(1)}%`}
              />
            ) : (
              <span className="text-sm text-gray-500">N/A</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'lastUpdated',
      label: 'LAST EDIT',
      render: (item: PriceData) => (
        <div>
          <div className="text-sm text-gray-700">
            {item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString() : 'Never'}
          </div>
          {item.changedBy && <div className="text-xs text-gray-500">by user</div>}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'ACTIONS',
      render: (item: PriceData) => (
        <div className="flex gap-2">
          <ActionButton variant="primary" size="sm" onClick={() => openUpdateModal(item)}>
            Edit Price
          </ActionButton>
          <ActionButton variant="secondary" size="sm" onClick={() => openHistoryModal(item)}>
            History
          </ActionButton>
        </div>
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

  const categories = Array.from(new Set(prices.map((item) => item.category))).filter(Boolean);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {pageMessage && (
          <div className={`p-4 rounded-lg ${pageMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {pageMessage.text}
          </div>
        )}

        {/* Page Header */}
        <PageHeader
          title="Pricing & Margin Management"
          description="Set retail and wholesale pricing, track cost margins, and view price change history"
        >
          <ActionButton variant="primary" onClick={handleExport}>
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
            value={stats?.totalProducts?.toString() || '0'}
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
            value={`₹${(stats?.avgRetailPrice || 0).toFixed(2)}`}
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
            trend="neutral"
          />
          <StatsCard
            title="AVG MARGIN SPREAD"
            value={`${(stats?.avgMargin || 0).toFixed(1)}%`}
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
            trend="neutral"
          />
          <StatsCard
            title="PRICE INCREASES"
            value={stats?.priceIncreases?.toString() || '0'}
            subtitle="Recent changes"
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
            <ActionButton variant="primary" onClick={() => setIsBulkUpdateModalOpen(true)}>
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
                  Wholesale Price
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
        
        {/* Bulk Update Modal */}
        <Modal
          isOpen={isBulkUpdateModalOpen}
          onClose={() => setIsBulkUpdateModalOpen(false)}
          title="Bulk Update Prices"
          size="md"
        >
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 text-blue-800 rounded-lg border border-blue-200">
              You are about to update prices for <strong>{selectedItems.length}</strong> selected products.
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Apply Update To
              </label>
              <select
                value={bulkData.applyTo}
                onChange={(e) => setBulkData({...bulkData, applyTo: e.target.value as any})}
                className="w-full px-4 py-2 border rounded-lg border-gray-300"
              >
                <option value="both">Both Retail & Wholesale</option>
                <option value="retail">Retail Price Only</option>
                <option value="wholesale">Wholesale Price Only</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adjustment Type
                </label>
                <select
                  value={bulkData.adjustmentType}
                  onChange={(e) => setBulkData({...bulkData, adjustmentType: e.target.value as any})}
                  className="w-full px-4 py-2 border rounded-lg border-gray-300"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="flat">Flat Amount (₹)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Value <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={bulkData.adjustmentValue}
                    placeholder="e.g. 10 or -5"
                    onChange={(e) => {
                      setBulkData({...bulkData, adjustmentValue: e.target.value});
                      if(formErrors.adjustmentValue) setFormErrors({...formErrors, adjustmentValue: ''});
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${formErrors.adjustmentValue ? 'border-red-500' : 'border-gray-300'}`}
                  />
                </div>
                {formErrors.adjustmentValue && (
                  <p className="mt-1 text-sm text-red-500">{formErrors.adjustmentValue}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">Use negative values to decrease price.</p>
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
                onClick={() => setIsBulkUpdateModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </ActionButton>
              <ActionButton variant="primary" onClick={handleBulkUpdate} disabled={submitting}>
                {submitting ? 'Applying...' : 'Apply Bulk Update'}
              </ActionButton>
            </div>
          </div>
        </Modal>

        {/* History Modal */}
        <Modal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          title="Price Change History"
          size="lg"
        >
          <div className="space-y-4">
            {selectedItem && (
              <div className="p-4 bg-gray-50 rounded-lg flex justify-between items-center">
                <div>
                  <div className="font-semibold text-gray-900">{selectedItem.productName}</div>
                  <div className="text-sm text-gray-600">SKU: {selectedItem.sku}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Current Retail</div>
                  <div className="font-semibold text-gray-900">₹{(selectedItem.retailPrice || 0).toFixed(2)}</div>
                </div>
              </div>
            )}

            {historyLoading ? (
              <div className="py-8 flex justify-center"><LoadingSpinner /></div>
            ) : historyData.length === 0 ? (
              <EmptyState title="No history found" description="There are no recorded price changes for this product yet." />
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Change Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Retail Price</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wholesale Price</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {historyData.map((record, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {new Date(record.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 capitalize">
                          {record.changeType}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-500 line-through">₹{Number(record.previousPrice || 0).toFixed(2)}</span>
                            <span>→</span>
                            <span className="font-medium text-gray-900">₹{Number(record.newPrice || 0).toFixed(2)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-500 line-through">₹{Number(record.previousWholesale || 0).toFixed(2)}</span>
                            <span>→</span>
                            <span className="font-medium text-gray-900">₹{Number(record.newWholesale || 0).toFixed(2)}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-end pt-4 border-t">
              <ActionButton variant="secondary" onClick={() => setIsHistoryModalOpen(false)}>Close</ActionButton>
            </div>
          </div>
        </Modal>

      </div>
    </DashboardLayout>
  );
}
