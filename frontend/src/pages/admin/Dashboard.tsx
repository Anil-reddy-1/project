import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout';
import { LoadingSpinner, StatusBadge } from '../../components/ui';
import {
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  ShoppingCart,
  Boxes,
  ArrowRight,
  X,
  Zap,
} from 'lucide-react';
import { dashboardService } from '../../services';
import type { DashboardStats } from '../../services';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

export function Dashboard() {
  const [_stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [alertVisible, setAlertVisible] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await dashboardService.getStats();
      setStats(response.data);
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      toast.error(error.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <DashboardLayout title="OPS HUB" subtitle="Dashboard">
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" text="Loading dashboard…" />
        </div>
      </DashboardLayout>
    );
  }

  const topMetrics = [
    {
      label: 'Floor Actions',
      value: '840',
      trend: '+12.4%',
      trendUp: true,
      sub: 'completed this week',
      icon: Zap,
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
    {
      label: 'Sales Floor',
      value: '6/8',
      sub: 'occupied terminals',
      icon: ShoppingCart,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Retail Units',
      value: '3,850',
      trend: '-8%',
      trendUp: false,
      sub: 'processed today',
      icon: Boxes,
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
    },
    {
      label: 'Low Stock Alert',
      value: '14',
      sub: 'near out-of-stock',
      icon: AlertTriangle,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      highlight: true,
    },
    {
      label: 'Recovery Queue',
      value: '5',
      sub: 'returned (Est. 8.5d)',
      badge: '-1 Overdue',
      badgeColor: 'text-red-600 bg-red-50 border-red-100',
      icon: CheckCircle,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Wholesale Desk',
      value: '₹38,450',
      trend: '-3.8%',
      trendUp: false,
      sub: 'sales volume',
      icon: DollarSign,
      iconBg: 'bg-cyan-50',
      iconColor: 'text-cyan-600',
    },
  ];

  const products = [
    {
      name: 'Firm Fruits (Nature Mix 1Gal)',
      sku: 'FMCG-0012-0031',
      category: 'Snacks & Pantry',
      qty: 6,
      trigger: 25,
      location: 'D-23 Local Ambient',
      status: 'Critical',
      statusVariant: 'danger' as const,
    },
    {
      name: 'Sago Gems (Large Sr)',
      sku: 'GMOC-2022-HI',
      category: 'Snacks & Pantry',
      qty: 0,
      trigger: 20,
      location: 'Keep 4C Bakery',
      status: 'Out Of Stock',
      statusVariant: 'danger' as const,
    },
    {
      name: 'Refined Sunflower Oil 5L',
      sku: 'COOKING-L',
      category: 'Cooking & Oils',
      qty: 4,
      trigger: 25,
      location: 'Row 8c (General)',
      status: 'Low Stock',
      statusVariant: 'warning' as const,
    },
    {
      name: 'Basmati Rice Premium 5kg',
      sku: '1H-RICE-2001',
      category: 'Grain & Variety',
      qty: 191,
      trigger: 200,
      location: 'Area C2 (Central)',
      status: 'In Stock',
      statusVariant: 'success' as const,
    },
  ];

  return (
    <DashboardLayout title="OPS HUB" subtitle="Dashboard">
      <div className="flex flex-col gap-6">
        {/* Alert Banner */}
        {alertVisible && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3.5">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-800">Store Critical Restock Alert</p>
              <p className="text-sm text-red-700 mt-0.5">
                3 products are critically low — Fmcg Usd, Green Sago, Semi Dead Dash.{' '}
                <Link to="/admin/stock" className="font-semibold underline underline-offset-2">
                  Prioritize Action →
                </Link>
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                to="/admin/stock"
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Review Now
              </Link>
              <button
                onClick={() => setAlertVisible(false)}
                className="p-1 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Page Header */}
        <section className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-slate-800">Store Operations & Floor Execution</h1>
            <p className="text-sm text-slate-400 mt-0.5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
              FLOOR_ACTION: Active
              <span className="text-slate-300">·</span>
              <span>Last sync: 12:43 PM</span>
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button className="h-9 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg flex items-center gap-2 transition-all shadow-sm">
              <Package className="w-4 h-4 text-slate-500" />
              Add Product
            </button>
            <button className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg flex items-center gap-2 transition-all shadow-sm shadow-blue-200">
              <CheckCircle className="w-4 h-4" />
              Mark Payment
            </button>
          </div>
        </section>

        {/* Top Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {topMetrics.map((metric, i) => {
            const Icon = metric.icon;
            return (
              <div
                key={i}
                className={`bg-white rounded-xl border p-3.5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${
                  metric.highlight
                    ? 'border-amber-200 shadow-amber-50/80 shadow-sm'
                    : 'border-slate-100 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 line-clamp-1">
                    {metric.label}
                  </span>
                  <div className={`w-6 h-6 rounded-lg ${metric.iconBg} flex items-center justify-center`}>
                    <Icon className={`w-3 h-3 ${metric.iconColor}`} />
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5 mb-0.5">
                  <span className={`text-[22px] font-bold tabular-nums ${metric.highlight ? 'text-amber-600' : 'text-slate-800'}`}>
                    {metric.value}
                  </span>
                  {metric.trend && (
                    <span className={`text-[11px] font-semibold flex items-center gap-0.5 ${metric.trendUp ? 'text-emerald-600' : 'text-red-500'}`}>
                      {metric.trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {metric.trend}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">{metric.sub}</p>
                {metric.badge && (
                  <span className={`mt-2 inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded-full border ${metric.badgeColor}`}>
                    {metric.badge}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left — Product Inventory Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Card Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-[15px] font-semibold text-slate-800">
                  Critical Retail Status / Inventory
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Live floor stock levels</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 hover:bg-blue-50 rounded-lg transition-colors">
                  Export
                </button>
                <button className="text-xs text-slate-500 hover:text-slate-700 font-medium px-2 py-1 hover:bg-slate-50 rounded-lg transition-colors">
                  Configure Alerts
                </button>
              </div>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-[2fr_1fr_1.2fr_1fr_auto_auto] gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100">
              {['Product & SKU', 'Category', 'Qty / Trigger', 'Location', 'Status', ''].map((h, i) => (
                <div key={i} className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider">
                  {h}
                </div>
              ))}
            </div>

            {/* Product Rows */}
            <div className="divide-y divide-slate-50">
              {products.map((product, i) => {
                const pct = Math.round((product.qty / product.trigger) * 100);
                return (
                  <div
                    key={i}
                    className="grid grid-cols-[2fr_1fr_1.2fr_1fr_auto_auto] gap-3 px-5 py-3.5 items-center hover:bg-slate-50/70 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-700 truncate">{product.name}</p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{product.sku}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                        {product.category}
                      </span>
                    </div>
                    <div>
                      <p className={`text-sm font-mono font-bold tabular-nums ${
                        product.qty === 0 ? 'text-red-600' : product.qty < 10 ? 'text-amber-600' : 'text-slate-700'
                      }`}>
                        {product.qty} / {product.trigger}
                      </p>
                      {/* Mini stock bar */}
                      <div className="w-full h-1 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            pct === 0 ? 'bg-red-500' : pct < 25 ? 'bg-amber-400' : 'bg-emerald-400'
                          }`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 leading-tight">{product.location}</p>
                    </div>
                    <StatusBadge status={product.status} variant={product.statusVariant} dot size="sm" />
                    <button className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shrink-0 shadow-sm shadow-blue-200">
                      Restock
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end">
              <Link to="/admin/stock" className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 transition-colors">
                View all inventory <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-4">
            {/* Accountability Requirements */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-purple-600" />
                </div>
                <h3 className="text-[14px] font-semibold text-slate-800">Accountability Queue</h3>
              </div>
              <div className="space-y-3.5">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Dispatch Received</p>
                    <p className="text-xs text-emerald-600 mt-0.5">Tony Martin · 10:34am · 04:27 Sec</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">On-site Payment Pending</p>
                    <p className="text-xs text-amber-600 mt-0.5">Client Pay: ₹12,843 · Accept or Reject</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 border border-red-100">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-800">Open Register Shift</p>
                    <p className="text-xs text-red-600 mt-0.5">Manager action needed. Confirm ending time.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Register & Cashier Audit */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[14px] font-semibold text-slate-800">Register Audit</h3>
                <StatusBadge status="Active" variant="success" dot size="sm" />
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-sm text-slate-600">
                  #4
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Station ID #4</p>
                  <p className="text-xs text-slate-400">Cashier: Maria Gonzalez</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-1">Float In</p>
                  <p className="font-mono font-bold text-slate-700 text-sm">₹5,000</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wide mb-1">Current Total</p>
                  <p className="font-mono font-bold text-blue-700 text-sm">₹42,650</p>
                </div>
              </div>
            </div>

            {/* Wholesale Desk Discounts */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-[14px] font-semibold text-slate-800">Wholesale Discounts</h3>
                <span className="text-[11px] text-slate-400 font-medium">Desk #6</span>
              </div>
              <p className="text-xs text-slate-400 mb-4">8.6 avg discount applied today</p>
              <div className="space-y-2.5">
                {[
                  { name: 'Valley Dairy Co.', discount: 15, amount: 18240 },
                  { name: 'Apex PantFood', discount: 12, amount: 24000 },
                  { name: 'Harland Beverage', discount: 10, amount: 19000 },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{item.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        <span className="text-emerald-600 font-semibold">{item.discount}%</span> tier discount
                      </p>
                    </div>
                    <p className="text-sm font-mono font-bold text-slate-700">
                      {formatCurrency(item.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
