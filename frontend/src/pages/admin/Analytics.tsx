import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout';
import { LoadingSpinner } from '../../components/ui';
import {
  TrendingUp,
  TrendingDown,
  Package,
  Truck,
  DollarSign,
  ShoppingCart,
  Users,
  AlertTriangle,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  Activity,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  analyticsService, 
  dashboardService,
  type SalesAnalytics, 
  type StockAnalytics,
  type DeliveryAnalytics 
} from '../../services';

interface AnalyticsMetric {
  label: string;
  value: string | number;
  change: string;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: typeof TrendingUp;
  iconBg: string;
  iconColor: string;
}

interface TopProduct {
  name: string;
  sales: number;
  revenue: number;
  trend: number;
}

interface DeliveryMetric {
  partner: string;
  completed: number;
  pending: number;
  avgTime: string;
  rating: number;
}

interface AnalyticsData {
  sales: SalesAnalytics | null;
  stock: StockAnalytics | null;
  delivery: DeliveryAnalytics | null;
  dashboardStats: {
    revenue: { total: number; change: number; period: string };
    orders: { total: number; change: number; pending: number };
    lowStockItems: number;
    activeDeliveries: number;
    pendingDebts: number;
  } | null;
}

export function Analytics() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    sales: null,
    stock: null,
    delivery: null,
    dashboardStats: null,
  });

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const getDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (dateRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
    }
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange();

      // Fetch all analytics in parallel
      const [salesData, stockData, deliveryData, dashStats] = await Promise.all([
        analyticsService.getSalesAnalytics(startDate, endDate).catch(err => {
          console.error('Sales analytics error:', err);
          return null;
        }),
        analyticsService.getStockAnalytics(startDate, endDate).catch(err => {
          console.error('Stock analytics error:', err);
          return null;
        }),
        analyticsService.getDeliveryAnalytics(startDate, endDate).catch(err => {
          console.error('Delivery analytics error:', err);
          return null;
        }),
        dashboardService.getStats().catch(err => {
          console.error('Dashboard stats error:', err);
          return null;
        }),
      ]);

      setAnalyticsData({
        sales: salesData,
        stock: stockData,
        delivery: deliveryData,
        dashboardStats: dashStats,
      });
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      toast.error(error?.message || 'Failed to load analytics data');
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

  // Compute metrics from real data
  const overviewMetrics: AnalyticsMetric[] = [
    {
      label: 'Total Revenue',
      value: formatCurrency(analyticsData.dashboardStats?.revenue.total || 0),
      change: `${analyticsData.dashboardStats?.revenue.change >= 0 ? '+' : ''}${analyticsData.dashboardStats?.revenue.change || 0}%`,
      changeType: (analyticsData.dashboardStats?.revenue.change || 0) >= 0 ? 'increase' : 'decrease',
      icon: DollarSign,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Total Orders',
      value: analyticsData.dashboardStats?.orders.total.toLocaleString() || '0',
      change: `${analyticsData.dashboardStats?.orders.change >= 0 ? '+' : ''}${analyticsData.dashboardStats?.orders.change || 0}%`,
      changeType: (analyticsData.dashboardStats?.orders.change || 0) >= 0 ? 'increase' : 'decrease',
      icon: ShoppingCart,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Active Deliveries',
      value: analyticsData.dashboardStats?.activeDeliveries || 0,
      change: '0%',
      changeType: 'neutral',
      icon: Truck,
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
    {
      label: 'Stock Value',
      value: formatCurrency(analyticsData.stock?.summary?.inventory_value || 0),
      change: '0%',
      changeType: 'neutral',
      icon: Package,
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
    },
  ];

  const topProducts: TopProduct[] = (analyticsData.sales?.topProducts || []).slice(0, 5).map(p => ({
    name: p.name,
    sales: parseInt(p.units_sold?.toString() || '0'),
    revenue: parseFloat(p.revenue?.toString() || '0'),
    trend: 0, // Can be calculated with previous period data
  }));

  const deliveryMetrics: DeliveryMetric[] = (analyticsData.delivery?.partnerPerformance || []).slice(0, 4).map(p => ({
    partner: p.partner_name,
    completed: p.successful_deliveries,
    pending: p.total_deliveries - p.successful_deliveries,
    avgTime: `${parseFloat(p.avg_delivery_hours?.toString() || '0').toFixed(1)} hrs`,
    rating: parseFloat(p.success_rate?.toString() || '0') / 20, // Convert percentage to 5-star rating
  }));

  const stockAlerts = (analyticsData.stock?.lowStockItems || []).slice(0, 4).map(item => ({
    product: item.name,
    category: 'General',
    stock: item.quantity,
    status: item.quantity === 0 ? 'out' : item.quantity <= (item.min_stock * 0.3) ? 'critical' : 'low',
  }));

  // Calculate sales by category
  const topCategories = analyticsData.sales?.topCategories || [];
  const totalCategoryRevenue = topCategories.reduce((sum, cat) => sum + parseFloat(cat.revenue?.toString() || '0'), 0);
  const salesByCategory = topCategories.slice(0, 6).map(cat => {
    const revenue = parseFloat(cat.revenue?.toString() || '0');
    return {
      category: cat.category,
      percentage: totalCategoryRevenue > 0 ? Math.round((revenue / totalCategoryRevenue) * 100) : 0,
      amount: revenue,
    };
  });

  if (loading) {
    return (
      <DashboardLayout title="Analytics" subtitle="Business insights and performance metrics">
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" text="Loading analytics…" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Analytics" subtitle="Business insights and performance metrics">
      <div className="flex flex-col gap-6">
        {/* Header with Date Range Selector */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-slate-800">Business Analytics</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Comprehensive overview of sales, deliveries, and stock performance
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
              {(['7d', '30d', '90d'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                    dateRange === range
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {range === '7d' && 'Last 7 Days'}
                  {range === '30d' && 'Last 30 Days'}
                  {range === '90d' && 'Last 90 Days'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Overview Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {overviewMetrics.map((metric, i) => {
            const Icon = metric.icon;
            const ChangeIcon = metric.changeType === 'increase' ? ArrowUpRight : ArrowDownRight;
            return (
              <div
                key={i}
                className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-12 h-12 rounded-xl ${metric.iconBg} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${metric.iconColor}`} />
                  </div>
                  <div
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                      metric.changeType === 'increase'
                        ? 'bg-emerald-50 text-emerald-600'
                        : metric.changeType === 'decrease'
                        ? 'bg-red-50 text-red-600'
                        : 'bg-slate-50 text-slate-600'
                    }`}
                  >
                    <ChangeIcon className="w-3 h-3" />
                    {metric.change}
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-1">{metric.label}</p>
                <p className="text-2xl font-bold text-slate-900">{metric.value}</p>
              </div>
            );
          })}
        </div>

        {/* Main Analytics Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales Analytics */}
          <div className="lg:col-span-2 space-y-6">
            {/* Top Products */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50/50 to-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-800">Sales Performance</h3>
                    <p className="text-xs text-slate-500">Top selling products</p>
                  </div>
                </div>
                <Link
                  to="/admin/sales"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  View All
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  {topProducts.map((product, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center font-bold text-slate-600 text-sm">
                          #{i + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800 text-sm">{product.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{product.sales} units sold</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900">{formatCurrency(product.revenue)}</p>
                        <p
                          className={`text-xs font-semibold flex items-center gap-1 justify-end ${
                            product.trend >= 0 ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {product.trend >= 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {Math.abs(product.trend)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sales by Category */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50/50 to-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <PieChart className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-800">Sales by Category</h3>
                    <p className="text-xs text-slate-500">Revenue distribution</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-3">
                  {salesByCategory.map((item, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">{item.category}</span>
                        <div className="text-right">
                          <span className="text-sm font-bold text-slate-900">{formatCurrency(item.amount)}</span>
                          <span className="text-xs text-slate-500 ml-2">({item.percentage}%)</span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Deliveries & Stock */}
          <div className="space-y-6">
            {/* Delivery Performance */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-purple-50/50 to-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-800">Deliveries</h3>
                    <p className="text-xs text-slate-500">Partner performance</p>
                  </div>
                </div>
                <Link
                  to="/admin/deliveries"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  Details
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  {deliveryMetrics.map((partner, i) => (
                    <div key={i} className="p-4 bg-slate-50 rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-semibold text-slate-800 text-sm">{partner.partner}</p>
                        <div className="flex items-center gap-1">
                          <Activity className="w-4 h-4 text-amber-500" />
                          <span className="text-sm font-bold text-slate-700">{partner.rating}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-slate-500">Completed</p>
                          <p className="font-bold text-emerald-600">{partner.completed}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Pending</p>
                          <p className="font-bold text-amber-600">{partner.pending}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Avg Time</p>
                          <p className="font-bold text-slate-700">{partner.avgTime}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Stock Alerts */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-50/50 to-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-800">Stock Alerts</h3>
                    <p className="text-xs text-slate-500">Low inventory items</p>
                  </div>
                </div>
                <Link
                  to="/admin/stock"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  Manage
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="p-6">
                <div className="space-y-3">
                  {stockAlerts.map((alert, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-xl border-2 ${
                        alert.status === 'critical'
                          ? 'bg-red-50 border-red-200'
                          : alert.status === 'out'
                          ? 'bg-red-50 border-red-300'
                          : 'bg-amber-50 border-amber-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 text-sm truncate">{alert.product}</p>
                          <p className="text-xs text-slate-600 mt-0.5">{alert.category}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p
                            className={`text-sm font-bold ${
                              alert.status === 'out' ? 'text-red-600' : 'text-amber-600'
                            }`}
                          >
                            {alert.stock} units
                          </p>
                          <p className="text-[10px] font-semibold text-slate-500 uppercase">
                            {alert.status === 'out' ? 'Out of Stock' : alert.status}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/admin/orders"
            className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border-2 border-blue-200 hover:shadow-lg transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-blue-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Manage Orders</h3>
            <p className="text-sm text-slate-600">View and process customer orders</p>
          </Link>

          <Link
            to="/admin/deliveries"
            className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border-2 border-purple-200 hover:shadow-lg transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-purple-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Track Deliveries</h3>
            <p className="text-sm text-slate-600">Monitor delivery status and partners</p>
          </Link>

          <Link
            to="/admin/stock"
            className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-6 border-2 border-indigo-200 hover:shadow-lg transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-indigo-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Update Stock</h3>
            <p className="text-sm text-slate-600">Manage inventory and restocking</p>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
