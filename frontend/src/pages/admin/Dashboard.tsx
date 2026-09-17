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
} from 'lucide-react';
import { dashboardService } from '../../services';
import type { DashboardStats } from '../../services';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

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
          <LoadingSpinner size="lg" text="Loading dashboard..." />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="OPS HUB" subtitle="Dashboard">
      <div className="flex flex-col gap-6">
        {/* Alert Banner */}
        <div className="bg-danger-100 border-l-4 border-danger-600 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-danger-700 shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-sm text-danger-900">
                Store Critical Restock Alert
              </h3>
              <p className="text-sm text-danger-800 mt-0.5">
                3 products are critically low on inventory. Items from: Fmcg Usd, Green Sago, Semi Dead Dash. <Link to="/admin/stock" className="underline font-medium">Prioritize Action</Link>
              </p>
            </div>
            <button className="px-4 py-2 bg-danger-600 hover:bg-danger-700 text-white text-sm font-medium rounded-lg transition-colors">
              Review
            </button>
            <button className="text-danger-700 hover:text-danger-900 p-1">✕</button>
          </div>
        </div>

        {/* Header Section */}
        <section className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-on-surface">
              Store Operations & Floor Execution
            </h1>
            <p className="text-sm text-on-surface-variant mt-0.5">
              FLOOR_ACTION: Active | LAST SYNC: 12:43:04 PM
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-primary hover:bg-primary-600 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors">
              <Package className="w-4 h-4" />
              Add Product | Barcode Scan
            </button>
            <button className="px-4 py-2 bg-success hover:bg-success-600 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors">
              <CheckCircle className="w-4 h-4" />
              Mark On-Floor Payment
            </button>
          </div>
        </section>

        {/* Top Stats Grid - 6 columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Floor Actions */}
          <div className="bg-surface-container-lowest p-4 rounded-lg shadow-sm border border-outline-variant">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-on-surface-variant font-semibold">
                Floor Actions
              </span>
              <Clock className="w-4 h-4 text-on-surface-variant" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-on-surface">840</span>
              <span className="text-xs text-success-700 flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" />
                +12.4%
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-1">completed this week</p>
          </div>

          {/* Sales Floor */}
          <div className="bg-surface-container-lowest p-4 rounded-lg shadow-sm border border-outline-variant">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-on-surface-variant font-semibold">
                Sales Floor
              </span>
              <ShoppingCart className="w-4 h-4 text-on-surface-variant" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-on-surface">6/8</span>
            </div>
            <p className="text-xs text-on-surface-variant mt-1">occupied terminals</p>
          </div>

          {/* Retail Units */}
          <div className="bg-surface-container-lowest p-4 rounded-lg shadow-sm border border-outline-variant">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-on-surface-variant font-semibold">
                Retail Units
              </span>
              <Boxes className="w-4 h-4 text-on-surface-variant" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-on-surface">3,850</span>
              <span className="text-xs text-danger-700 flex items-center gap-0.5">
                <TrendingDown className="w-3 h-3" />
                -8% Del
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-1">processed today</p>
          </div>

          {/* Low Stock Alert */}
          <div className="bg-surface-container-lowest p-4 rounded-lg shadow-sm border border-outline-variant">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-on-surface-variant font-semibold">
                Low Stock Alert
              </span>
              <AlertTriangle className="w-4 h-4 text-warning" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-warning">14</span>
            </div>
            <p className="text-xs text-warning-700 mt-1">Behind out of stock</p>
          </div>

          {/* Recovery Queue */}
          <div className="bg-surface-container-lowest p-4 rounded-lg shadow-sm border border-outline-variant">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-on-surface-variant font-semibold">
                Recovery Queue
              </span>
              <CheckCircle className="w-4 h-4 text-on-surface-variant" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-on-surface">5</span>
              <span className="text-xs text-danger-700">-1 Overdue</span>
            </div>
            <p className="text-xs text-on-surface-variant mt-1">returned (Est. 8.5d)</p>
          </div>

          {/* Wholesale */}
          <div className="bg-surface-container-lowest p-4 rounded-lg shadow-sm border border-outline-variant">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-on-surface-variant font-semibold">
                Wholesale Desk
              </span>
              <DollarSign className="w-4 h-4 text-on-surface-variant" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-on-surface">38,450</span>
              <span className="text-xs text-danger-700 flex items-center gap-0.5">
                <TrendingDown className="w-3 h-3" />
                -3.8%
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-1">sales volume</p>
          </div>
        </div>

        {/* Main Content - 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Products List (2 columns wide) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Critical Retail Status */}
            <div className="bg-surface-container-lowest rounded-lg shadow-sm">
              <div className="p-4 border-b border-outline-variant">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-on-surface">
                    Critical Retail Status / Inventory
                  </h2>
                  <div className="flex items-center gap-2">
                    <button className="text-sm text-primary hover:underline">Export View</button>
                    <button className="text-sm text-primary hover:underline">Alert Config</button>
                  </div>
                </div>
              </div>
              
              {/* Table Header */}
              <div className="grid grid-cols-6 gap-4 px-4 py-3 bg-surface-container-low text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                <div>Product & SKU</div>
                <div>Category</div>
                <div>Store Qty / Trigger</div>
                <div>Floor Location</div>
                <div>Status</div>
                <div className="text-right">Fast Action</div>
              </div>

              {/* Product Rows */}
              <div className="divide-y divide-outline-variant">
                {[
                  {
                    name: 'Firm Fruits (Nature Mix 1Gal)',
                    sku: 'FMCG-0012-0031',
                    category: 'Snacks & Pantry',
                    qty: 6,
                    trigger: 25,
                    location: 'D-23 Local Ambient',
                    status: 'Critical Delivery',
                    statusColor: 'danger',
                  },
                  {
                    name: 'Sago Gems (Large Sr)',
                    sku: 'GMOC-2022-HI',
                    category: 'Snacks & Pantry',
                    qty: 0,
                    trigger: 20,
                    location: 'Keep 4C Bakery',
                    status: 'Out Of Stock',
                    statusColor: 'danger',
                  },
                  {
                    name: 'Refined (Sunflower Oil 5L)',
                    sku: 'COOKING-L',
                    category: 'Cooking &Oils',
                    qty: 4,
                    trigger: 25,
                    location: 'Row 8c (General Corner)',
                    status: 'Low Stock',
                    statusColor: 'warning',
                  },
                  {
                    name: 'Basmati Rice (Premium 5kg)',
                    sku: '1H-RICE-2001',
                    category: 'Grain & Verity',
                    qty: 191,
                    trigger: 200,
                    location: 'Area C2 (Central Shelves)',
                    status: 'In Stock',
                    statusColor: 'success',
                  },
                ].map((product, i) => (
                  <div key={i} className="grid grid-cols-6 gap-4 px-4 py-4 hover:bg-surface-container-low transition-colors">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-on-surface">{product.name}</span>
                      <span className="text-xs text-on-surface-variant font-mono">{product.sku}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm text-on-surface">{product.category}</span>
                    </div>
                    <div className="flex items-center">
                      <span className={`text-sm font-mono font-semibold ${
                        product.qty === 0 ? 'text-danger' : product.qty < 10 ? 'text-warning' : 'text-on-surface'
                      }`}>
                        {product.qty} / {product.trigger} units
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm text-on-surface-variant">{product.location}</span>
                    </div>
                    <div className="flex items-center">
                      <StatusBadge 
                        status={product.status} 
                        variant={product.statusColor as any}
                        dot
                      />
                    </div>
                    <div className="flex items-center justify-end">
                      <button className="px-3 py-1 bg-primary hover:bg-primary-600 text-white text-xs font-medium rounded transition-colors">
                        Restock
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Activity Feed */}
          <div className="space-y-6">
            {/* Accountability Requirements */}
            <div className="bg-surface-container-lowest p-4 rounded-lg shadow-sm">
              <h3 className="text-sm font-semibold text-on-surface mb-3">
                ⚡ Accountability Requirements
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-success shrink-0 mt-0.5" />
                  <div>
                    <p className="text-on-surface font-medium">Dispatch Recieved (Confirmed)</p>
                    <p className="text-xs text-on-surface-variant">Delivered by Tony Martin 10:34am (04:27 Sec)</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                  <div>
                    <p className="text-on-surface font-medium">Restant On-site Payment</p>
                    <p className="text-xs text-on-surface-variant">Client Pay: ₹12,843. Accept or Reject</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                  <div>
                    <p className="text-on-surface font-medium">Open Register Shift</p>
                    <p className="text-xs text-on-surface-variant">Manager action needed. Confirm ending time and total.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Register & Cashier Audit */}
            <div className="bg-surface-container-lowest p-4 rounded-lg shadow-sm">
              <h3 className="text-sm font-semibold text-on-surface mb-3">
                Register & Cashier Audit
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-on-surface">Station ID #4</p>
                    <p className="text-xs text-on-surface-variant">Cashier: Maria Gonzalez</p>
                  </div>
                  <StatusBadge status="Active" variant="success" />
                </div>
                <div className="pt-2 border-t border-outline-variant">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-on-surface-variant">Float In</p>
                      <p className="font-mono font-semibold text-on-surface">₹5,000</p>
                    </div>
                    <div>
                      <p className="text-on-surface-variant">Current Total</p>
                      <p className="font-mono font-semibold text-on-surface">₹42,650</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Wholesale Desk Discount */}
            <div className="bg-surface-container-lowest p-4 rounded-lg shadow-sm">
              <h3 className="text-sm font-semibold text-on-surface mb-3">
                Today's Wholesale Desk Discount
              </h3>
              <div className="text-xs text-on-surface-variant mb-2">Desk ID: 6 || 8.6 Average</div>
              <div className="space-y-2">
                {[
                  { name: 'Valley Dairy Co.', discount: 15, amount: 18240 },
                  { name: 'Apex PantFood', discount: 12, amount: 24000 },
                  { name: 'Harland Beverage Supplies', discount: 10, amount: 19000 },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-outline-variant last:border-0">
                    <div>
                      <p className="text-sm font-medium text-on-surface">{item.name}</p>
                      <p className="text-xs text-on-surface-variant">{item.discount}% Tier Discount Applied</p>
                    </div>
                    <p className="text-sm font-mono font-semibold text-on-surface">
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
