import { useState, useEffect, useCallback } from 'react';
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
import type {
  PriceData,
  UpdatePricePayload,
  BulkUpdatePayload,
  PricingStats,
  PriceHistory,
} from '../../services/pricing.service';

/* ─── helpers ─────────────────────────────────────────────────────────────── */

const fmt = (n: number | null | undefined): string =>
  n != null ? `₹${Number(n).toFixed(2)}` : '—';

const pct = (n: number | null | undefined): string =>
  n != null ? `${Number(n).toFixed(1)}%` : '—';

function MarginBadge({ value }: { value: number | null | undefined }) {
  if (value == null) return <span className="text-sm text-gray-400">—</span>;
  const v = Number(value);
  const status = v >= 25 ? 'success' : v >= 10 ? 'warning' : 'danger';
  return <StatusBadge status={status} label={`${v.toFixed(1)}%`} />;
}

/* ─── Main Component ───────────────────────────────────────────────────────── */

export function PricingManagement() {
  const [prices, setPrices] = useState<PriceData[]>([]);
  const [stats, setStats] = useState<PricingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [marginFilter, setMarginFilter] = useState<string>('all');
  const [discountFilter, setDiscountFilter] = useState<string>('all');

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Selection
  const [selectedItem, setSelectedItem] = useState<PriceData | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Edit Price Form
  const [form, setForm] = useState({
    costPrice: '',
    displayPrice: '',
    sellingPrice: '',
    minimumMarginPercent: '',
    reason: '',
  });

  // Computed from form
  const [computed, setComputed] = useState({
    discountPct: null as number | null,
    discountAmt: null as number | null,
    grossProfit: null as number | null,
    grossMargin: null as number | null,
    markup: null as number | null,
    isValid: true,
    error: '',
  });

  // Suggest selling price
  const [targetMargin, setTargetMargin] = useState('');
  const [suggestedPrice, setSuggestedPrice] = useState<number | null>(null);

  // Bulk update
  const [bulk, setBulk] = useState({
    adjustmentType: 'percentage' as 'percentage' | 'flat',
    adjustmentValue: '',
    applyTo: 'selling' as 'selling' | 'display' | 'both',
  });

  // History
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [pageMsg, setPageMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  /* ── Load data ── */
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [pricesData, statsData] = await Promise.all([
        pricingService.getAllPrices(),
        pricingService.getStats(),
      ]);
      setPrices(pricesData);
      setStats(statsData);
    } catch {
      showMsg('error', 'Failed to load pricing data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setPageMsg({ type, text });
    setTimeout(() => setPageMsg(null), 3500);
  };

  /* ── Recompute metrics whenever form changes ── */
  useEffect(() => {
    const cost = parseFloat(form.costPrice) || 0;
    const display = parseFloat(form.displayPrice) || 0;
    const selling = parseFloat(form.sellingPrice) || 0;

    let discountPct: number | null = null;
    let discountAmt: number | null = null;
    let grossProfit: number | null = null;
    let grossMargin: number | null = null;
    let markup: number | null = null;

    if (display > 0 && selling > 0) {
      discountAmt = parseFloat((display - selling).toFixed(2));
      discountPct = parseFloat(((display - selling) / display * 100).toFixed(2));
    }
    if (selling > 0 && cost > 0) {
      grossProfit = parseFloat((selling - cost).toFixed(2));
      grossMargin = parseFloat(((selling - cost) / selling * 100).toFixed(2));
      markup = parseFloat(((selling - cost) / cost * 100).toFixed(2));
    }

    const error =
      display > 0 && selling > 0 && selling > display
        ? 'Selling price cannot exceed display price (MRP)'
        : '';

    setComputed({
      discountPct,
      discountAmt,
      grossProfit,
      grossMargin,
      markup,
      isValid: !error,
      error,
    });
  }, [form.costPrice, form.displayPrice, form.sellingPrice]);

  /* ── Suggest selling price from target margin ── */
  const handleSuggest = async () => {
    const cost = parseFloat(form.costPrice);
    const margin = parseFloat(targetMargin);
    if (!cost || !margin) return;
    try {
      const result = await pricingService.suggestSellingPrice(cost, margin);
      setSuggestedPrice(result.suggestedSellingPrice);
      setForm(prev => ({ ...prev, sellingPrice: result.suggestedSellingPrice.toFixed(2) }));
    } catch {
      showMsg('error', 'Failed to calculate suggested price');
    }
  };

  /* ── Filters ── */
  const filtered = prices.filter(item => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      item.productName?.toLowerCase().includes(q) ||
      item.sku?.toLowerCase().includes(q) ||
      item.category?.toLowerCase().includes(q);
    const m = item.grossMarginPercent ?? null;
    const matchMargin =
      marginFilter === 'all' ||
      (marginFilter === 'low' && m !== null && m < 10) ||
      (marginFilter === 'medium' && m !== null && m >= 10 && m < 25) ||
      (marginFilter === 'high' && m !== null && m >= 25) ||
      (marginFilter === 'alert' && item.isBelowMinMargin);
    const matchDiscount =
      discountFilter === 'all' ||
      (discountFilter === 'has' && item.discountPercent && item.discountPercent > 0) ||
      (discountFilter === 'none' && (!item.discountPercent || item.discountPercent === 0));
    return matchSearch && matchMargin && matchDiscount;
  });

  /* ── Selection ── */
  const toggleId = (id: string) =>
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  const toggleAll = () =>
    setSelectedIds(selectedIds.length === filtered.length && filtered.length > 0 ? [] : filtered.map(p => p.id));

  /* ── Open edit modal ── */
  const openEdit = (item: PriceData) => {
    setSelectedItem(item);
    setForm({
      costPrice: item.costPrice != null ? String(item.costPrice) : '',
      displayPrice: item.displayPrice != null ? String(item.displayPrice) : '',
      sellingPrice: item.sellingPrice != null ? String(item.sellingPrice) : '',
      minimumMarginPercent: item.minimumMarginPercent != null ? String(item.minimumMarginPercent) : '',
      reason: '',
    });
    setSuggestedPrice(null);
    setTargetMargin('');
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  /* ── Submit price update ── */
  const handleUpdate = async () => {
    if (!selectedItem || !computed.isValid) return;

    const payload: UpdatePricePayload = {};
    if (form.costPrice) payload.costPrice = parseFloat(form.costPrice);
    if (form.displayPrice) payload.displayPrice = parseFloat(form.displayPrice);
    if (form.sellingPrice) payload.sellingPrice = parseFloat(form.sellingPrice);
    if (form.minimumMarginPercent) payload.minimumMarginPercent = parseFloat(form.minimumMarginPercent);
    if (form.reason) payload.reason = form.reason;

    if (!payload.sellingPrice && !payload.displayPrice && !payload.costPrice) {
      setFormErrors({ submit: 'Please enter at least one price to update.' });
      return;
    }

    try {
      setSubmitting(true);
      await pricingService.updatePrice(selectedItem.productId, payload);
      await loadData();
      setIsEditModalOpen(false);
      showMsg('success', `${selectedItem.productName} pricing updated`);
    } catch (e: any) {
      setFormErrors({ submit: e?.response?.data?.message || 'Failed to update pricing' });
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Bulk update ── */
  const handleBulk = async () => {
    if (!selectedIds.length || !bulk.adjustmentValue) return;
    const payload: BulkUpdatePayload = {
      productIds: selectedIds,
      adjustmentType: bulk.adjustmentType,
      adjustmentValue: parseFloat(bulk.adjustmentValue),
      applyTo: bulk.applyTo,
    };
    try {
      setSubmitting(true);
      const result = await pricingService.bulkUpdate(payload);
      await loadData();
      setIsBulkModalOpen(false);
      setSelectedIds([]);
      showMsg('success', `Bulk update applied to ${result.updated} products`);
    } catch {
      showMsg('error', 'Bulk update failed');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Price history ── */
  const openHistory = async (item: PriceData) => {
    setSelectedItem(item);
    setIsHistoryModalOpen(true);
    setHistoryLoading(true);
    setHistory([]);
    try {
      const data = await pricingService.getPriceHistory(item.productId);
      setHistory(data);
    } catch {
      // silently fail
    } finally {
      setHistoryLoading(false);
    }
  };

  /* ── Export ── */
  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/v1/pricing/export', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pricing-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showMsg('success', 'Export downloaded');
    } catch {
      showMsg('error', 'Export failed');
    }
  };

  /* ─── Table columns ─── */
  const columns = [
    {
      key: 'select',
      label: (
        <input
          type="checkbox"
          checked={selectedIds.length === filtered.length && filtered.length > 0}
          onChange={toggleAll}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      ),
      render: (item: PriceData) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(item.id)}
          onChange={() => toggleId(item.id)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      ),
    },
    {
      key: 'product',
      label: 'PRODUCT',
      render: (item: PriceData) => (
        <div>
          <div className="font-medium text-gray-900">{item.productName}</div>
          <div className="text-xs text-gray-400 font-mono">{item.sku}</div>
          <div className="text-xs text-gray-400">{item.category || 'Uncategorized'}</div>
        </div>
      ),
    },
    {
      key: 'cost',
      label: 'COST (PRIVATE)',
      render: (item: PriceData) => (
        <div className="text-sm">
          {item.costPrice != null ? (
            <span className="font-mono text-gray-600 bg-gray-50 px-1.5 py-0.5 rounded">
              {fmt(item.costPrice)}
            </span>
          ) : (
            <span className="text-gray-400 text-xs">Not set</span>
          )}
        </div>
      ),
    },
    {
      key: 'display',
      label: 'DISPLAY / MRP',
      render: (item: PriceData) => (
        <div className="text-sm text-gray-500">
          {item.displayPrice != null ? (
            <span className="line-through">{fmt(item.displayPrice)}</span>
          ) : (
            <span className="text-gray-300 text-xs">None</span>
          )}
        </div>
      ),
    },
    {
      key: 'selling',
      label: 'SELLING PRICE',
      render: (item: PriceData) => (
        <div>
          <div className="font-semibold text-gray-900">{fmt(item.sellingPrice)}</div>
          {item.discountPercent && item.discountPercent > 0 ? (
            <div className="text-xs text-green-600 font-medium">
              {item.discountPercent.toFixed(0)}% OFF · saves {fmt(item.discountAmount)}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      key: 'margin',
      label: 'MARGIN / PROFIT',
      render: (item: PriceData) => (
        <div>
          <MarginBadge value={item.grossMarginPercent} />
          {item.grossProfit != null && (
            <div className="text-xs text-gray-500 mt-0.5">{fmt(item.grossProfit)} profit</div>
          )}
          {item.isBelowMinMargin && (
            <div className="text-xs text-red-500 font-medium mt-0.5">⚠ Below min margin</div>
          )}
        </div>
      ),
    },
    {
      key: 'audit',
      label: 'LAST EDIT',
      render: (item: PriceData) => (
        <div className="text-xs">
          <div className="text-gray-600">
            {item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString('en-IN') : '—'}
          </div>
          {item.changedByName && (
            <div className="text-gray-400">by {item.changedByName}</div>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (item: PriceData) => (
        <div className="flex gap-1.5">
          <ActionButton variant="primary" size="sm" onClick={() => openEdit(item)}>
            Edit
          </ActionButton>
          <ActionButton variant="secondary" size="sm" onClick={() => openHistory(item)}>
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

  /* ─── Buyer preview ─── */
  const PreviewPanel = () => {
    if (!selectedItem) return null;
    const sp = parseFloat(form.sellingPrice) || selectedItem.sellingPrice || 0;
    const dp = parseFloat(form.displayPrice) || selectedItem.displayPrice || null;
    const disc = dp && dp > sp ? ((dp - sp) / dp * 100).toFixed(0) : null;
    const save = dp && dp > sp ? (dp - sp).toFixed(2) : null;

    return (
      <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Buyer Preview</p>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-gray-900">{selectedItem.productName}</p>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-gray-900">₹{sp.toFixed(2)}</span>
            {dp && (
              <span className="text-sm text-gray-400 line-through">₹{dp.toFixed(2)}</span>
            )}
            {disc && (
              <span className="px-1.5 py-0.5 text-xs font-bold text-white bg-green-600 rounded">
                {disc}% OFF
              </span>
            )}
          </div>
          {save && (
            <p className="text-xs text-green-600 font-medium">You save ₹{save}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">Cost price (₹{form.costPrice || selectedItem.costPrice || '—'}) is never shown to the buyer.</p>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Page message */}
        {pageMsg && (
          <div className={`p-4 rounded-lg ${pageMsg.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {pageMsg.text}
          </div>
        )}

        {/* Header */}
        <PageHeader
          title="Pricing & Margins"
          description="Manage selling prices, discounts and profitability"
        >
          <ActionButton variant="secondary" onClick={handleExport}>
            Export CSV
          </ActionButton>
        </PageHeader>

        {/* Stats */}
        <div className="grid gap-6 md:grid-cols-4">
          <StatsCard
            title="PRODUCTS MANAGED"
            value={stats?.totalProducts?.toString() || '0'}
            subtitle="Active products"
            icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>}
            trend="neutral"
          />
          <StatsCard
            title="AVERAGE MARGIN"
            value={`${(stats?.avgMargin || 0).toFixed(1)}%`}
            subtitle="Gross margin"
            icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
            trend="neutral"
          />
          <StatsCard
            title="PRODUCTS ON OFFER"
            value={stats?.productsOnOffer?.toString() || '0'}
            subtitle="With active discount"
            icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>}
            trend="neutral"
          />
          <StatsCard
            title="LOW MARGIN ALERTS"
            value={stats?.lowMarginProducts?.toString() || '0'}
            subtitle="Below minimum threshold"
            icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
            trend="neutral"
          />
        </div>

        {/* Pricing model info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
          <strong>4-field pricing model:</strong> &nbsp;
          <span className="text-blue-700">Cost Price</span> (private, never shown to buyers) →&nbsp;
          <span className="text-blue-700">Display Price / MRP</span> (strikethrough reference) →&nbsp;
          <span className="text-blue-700">Selling Price</span> (buyer pays) →&nbsp;
          <span className="text-blue-700">Gross Margin</span> (auto-calculated).
          Discount is always computed from Display vs Selling price, never from cost.
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center flex-1">
            <div className="flex-1 max-w-md">
              <SearchBar
                placeholder="Search by product, SKU, or category…"
                value={searchQuery}
                onChange={setSearchQuery}
              />
            </div>
            <FilterSelect
              value={marginFilter}
              onChange={setMarginFilter}
              options={[
                { value: 'all', label: 'All Margins' },
                { value: 'high', label: 'High (≥25%)' },
                { value: 'medium', label: 'Medium (10–25%)' },
                { value: 'low', label: 'Low (<10%)' },
                { value: 'alert', label: '⚠ Below Min Margin' },
              ]}
            />
            <FilterSelect
              value={discountFilter}
              onChange={setDiscountFilter}
              options={[
                { value: 'all', label: 'All Products' },
                { value: 'has', label: 'On Discount' },
                { value: 'none', label: 'No Discount' },
              ]}
            />
          </div>
          {selectedIds.length > 0 && (
            <ActionButton variant="primary" onClick={() => setIsBulkModalOpen(true)}>
              Bulk Update ({selectedIds.length})
            </ActionButton>
          )}
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <EmptyState
            title="No products found"
            description={searchQuery || marginFilter !== 'all' || discountFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Add products and configure their prices in the pricing editor'}
          />
        ) : (
          <DataTable columns={columns} data={filtered} />
        )}

        {/* ── Edit Price Modal ── */}
        <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Product Pricing" size="lg">
          <div className="space-y-5">
            {selectedItem && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-xs text-gray-500 mb-0.5">Editing prices for</p>
                <p className="font-semibold text-gray-900">{selectedItem.productName}</p>
                <p className="text-xs text-gray-500 font-mono">{selectedItem.sku}</p>
              </div>
            )}

            {/* Pricing fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Cost Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cost Price <span className="text-gray-400 text-xs">(private)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                  <input
                    type="number" step="0.01" min="0"
                    value={form.costPrice}
                    onChange={e => setForm(prev => ({ ...prev, costPrice: e.target.value }))}
                    placeholder="e.g. 600"
                    className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Never visible to buyers</p>
              </div>

              {/* Display Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Price <span className="text-gray-400 text-xs">(MRP / strikethrough)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                  <input
                    type="number" step="0.01" min="0"
                    value={form.displayPrice}
                    onChange={e => setForm(prev => ({ ...prev, displayPrice: e.target.value }))}
                    placeholder="e.g. 1000"
                    className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Leave blank for no reference price</p>
              </div>

              {/* Selling Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Selling Price <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                  <input
                    type="number" step="0.01" min="0"
                    value={form.sellingPrice}
                    onChange={e => setForm(prev => ({ ...prev, sellingPrice: e.target.value }))}
                    placeholder="e.g. 800"
                    className={`w-full pl-7 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${computed.error ? 'border-red-400' : 'border-gray-200'}`}
                  />
                </div>
                {computed.error && (
                  <p className="text-xs text-red-500 mt-1">{computed.error}</p>
                )}
              </div>
            </div>

            {/* Minimum margin */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Margin % <span className="text-gray-400 text-xs">(alert threshold)</span>
                </label>
                <div className="relative">
                  <input
                    type="number" step="0.1" min="0" max="100"
                    value={form.minimumMarginPercent}
                    onChange={e => setForm(prev => ({ ...prev, minimumMarginPercent: e.target.value }))}
                    placeholder="e.g. 15"
                    className="w-full px-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Flags products whose margin falls below this</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for change</label>
                <input
                  type="text"
                  value={form.reason}
                  onChange={e => setForm(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="e.g. Seasonal pricing"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Suggest selling price from target margin */}
            <div className="p-4 bg-violet-50 border border-violet-100 rounded-lg">
              <p className="text-xs font-semibold text-violet-700 mb-2 uppercase tracking-wide">
                Suggest Selling Price from Target Margin
              </p>
              <p className="text-xs text-violet-500 mb-3">
                Formula: Selling Price = Cost Price ÷ (1 − Target Margin)
              </p>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-600 mb-1 block">Target Margin %</label>
                  <div className="relative">
                    <input
                      type="number" step="0.1" min="0" max="99"
                      value={targetMargin}
                      onChange={e => { setTargetMargin(e.target.value); setSuggestedPrice(null); }}
                      placeholder="e.g. 25"
                      className="w-full px-3 pr-7 py-2 border border-violet-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-400"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                  </div>
                </div>
                <ActionButton
                  variant="secondary"
                  onClick={handleSuggest}
                  disabled={!form.costPrice || !targetMargin}
                >
                  Calculate
                </ActionButton>
                {suggestedPrice != null && (
                  <div className="text-sm font-semibold text-violet-700">
                    → ₹{suggestedPrice.toFixed(2)} applied
                  </div>
                )}
              </div>
            </div>

            {/* Computed metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: 'Discount Amount', value: computed.discountAmt != null ? fmt(computed.discountAmt) : '—' },
                { label: 'Discount %', value: pct(computed.discountPct) },
                { label: 'Gross Profit', value: fmt(computed.grossProfit) },
                { label: 'Gross Margin', value: pct(computed.grossMargin) },
                { label: 'Markup', value: pct(computed.markup) },
              ].map(m => (
                <div key={m.label} className="bg-gray-50 border border-gray-100 rounded-lg p-2.5 text-center">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">{m.label}</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">{m.value}</p>
                </div>
              ))}
            </div>

            {/* Buyer preview toggle */}
            <button
              type="button"
              onClick={() => setIsPreviewOpen(p => !p)}
              className="text-sm text-blue-600 hover:text-blue-700 underline"
            >
              {isPreviewOpen ? 'Hide' : 'Show'} buyer-facing price preview
            </button>
            {isPreviewOpen && <PreviewPanel />}

            {formErrors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {formErrors.submit}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <ActionButton variant="secondary" onClick={() => setIsEditModalOpen(false)} disabled={submitting}>
                Cancel
              </ActionButton>
              <ActionButton variant="primary" onClick={handleUpdate} disabled={submitting || !computed.isValid}>
                {submitting ? 'Saving…' : 'Save Pricing'}
              </ActionButton>
            </div>
          </div>
        </Modal>

        {/* ── Bulk Update Modal ── */}
        <Modal isOpen={isBulkModalOpen} onClose={() => setIsBulkModalOpen(false)} title="Bulk Price Update" size="md">
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              Updating <strong>{selectedIds.length}</strong> selected products.
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apply To</label>
              <select
                value={bulk.applyTo}
                onChange={e => setBulk(prev => ({ ...prev, applyTo: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="selling">Selling Price only</option>
                <option value="display">Display Price (MRP) only</option>
                <option value="both">Both Selling & Display</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adjustment Type</label>
                <select
                  value={bulk.adjustmentType}
                  onChange={e => setBulk(prev => ({ ...prev, adjustmentType: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="flat">Flat Amount (₹)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                <input
                  type="number" step="0.01"
                  value={bulk.adjustmentValue}
                  onChange={e => setBulk(prev => ({ ...prev, adjustmentValue: e.target.value }))}
                  placeholder="e.g. 10 or -5"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">Use negative values to decrease</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <ActionButton variant="secondary" onClick={() => setIsBulkModalOpen(false)} disabled={submitting}>Cancel</ActionButton>
              <ActionButton variant="primary" onClick={handleBulk} disabled={submitting || !bulk.adjustmentValue}>
                {submitting ? 'Applying…' : 'Apply Bulk Update'}
              </ActionButton>
            </div>
          </div>
        </Modal>

        {/* ── Price History Modal ── */}
        <Modal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} title="Price Change History" size="lg">
          <div className="space-y-4">
            {selectedItem && (
              <div className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-semibold text-gray-900">{selectedItem.productName}</p>
                  <p className="text-xs text-gray-400 font-mono">{selectedItem.sku}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="text-gray-500">Current selling price</p>
                  <p className="font-bold">{fmt(selectedItem.sellingPrice)}</p>
                </div>
              </div>
            )}

            {historyLoading ? (
              <div className="py-8 flex justify-center"><LoadingSpinner /></div>
            ) : history.length === 0 ? (
              <EmptyState title="No history" description="No price changes have been recorded yet." />
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      {['Date', 'Type', 'Cost', 'Display Price', 'Selling Price', 'Changed By'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {history.map((r, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-xs text-gray-600">{new Date(r.createdAt).toLocaleString('en-IN')}</td>
                        <td className="px-3 py-2 text-xs text-gray-500 capitalize">{r.changeType}</td>
                        <td className="px-3 py-2 text-xs">
                          {r.previousCost != null || r.newCost != null ? (
                            <span className="text-gray-500">{fmt(r.previousCost)} → {fmt(r.newCost)}</span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {r.previousDisplayPrice != null || r.newDisplayPrice != null ? (
                            <><span className="text-gray-400 line-through">{fmt(r.previousDisplayPrice)}</span> → <span>{fmt(r.newDisplayPrice)}</span></>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <span className="text-gray-400 line-through">{fmt(r.previousSellingPrice)}</span>
                          {' → '}
                          <span className="font-medium text-gray-900">{fmt(r.newSellingPrice)}</span>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">{r.changedByName || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t">
              <ActionButton variant="secondary" onClick={() => setIsHistoryModalOpen(false)}>Close</ActionButton>
            </div>
          </div>
        </Modal>

      </div>
    </DashboardLayout>
  );
}
