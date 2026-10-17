/**
 * Orders Page (Buyer)
 * View order history with filters and search
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Package, Search, Filter, ChevronRight,
  Clock, CheckCircle, Truck, XCircle, AlertCircle,
  type LucideIcon,
} from 'lucide-react';
import { DashboardLayout } from '../../components/layout';
import { useOrders } from '../../hooks/useOrders';
import { Skeleton } from '../../components/ui';
import { fadeVariants, listContainerVariants, listItemVariants } from '../../utils/animations';
import { formatDate } from '../../utils/date';

// Soft semantic pills for the storefront ("classic & modern")
const TONE = {
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  ink: 'bg-ink-50 text-ink-700 border-ink-100',
  brass: 'bg-brass-50 text-brass-700 border-brass-100',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  stone: 'bg-stone-50 text-stone-600 border-stone-200',
} as const;

const ORDER_STATUS_CONFIG: Record<string, { label: string; tone: string; icon: LucideIcon }> = {
  pending: { label: 'Pending', tone: TONE.amber, icon: Clock },
  confirmed: { label: 'Confirmed', tone: TONE.ink, icon: CheckCircle },
  preparing: { label: 'Preparing', tone: TONE.ink, icon: Package },
  packed: { label: 'Packed', tone: TONE.ink, icon: Package },
  assigned: { label: 'Partner assigned', tone: TONE.brass, icon: Truck },
  in_transit: { label: 'Out for delivery', tone: TONE.brass, icon: Truck },
  out_for_delivery: { label: 'Out for delivery', tone: TONE.brass, icon: Truck },
  delivered: { label: 'Delivered', tone: TONE.emerald, icon: CheckCircle },
  completed: { label: 'Completed', tone: TONE.emerald, icon: CheckCircle },
  cancelled: { label: 'Cancelled', tone: TONE.red, icon: XCircle },
};

const PAYMENT_STATUS_CONFIG = {
  pending: { label: 'Pending', tone: TONE.amber },
  paid: { label: 'Paid', tone: TONE.emerald },
  failed: { label: 'Failed', tone: TONE.red },
  refunded: { label: 'Refunded', tone: TONE.stone },
};

const PILL = 'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap';
const META_LABEL = 'text-[11px] uppercase font-semibold tracking-[0.16em] text-stone-400';

function OrdersHeader() {
  return (
    <div>
      <p className="shop-eyebrow">Your account</p>
      <h1 className="shop-title mt-2">My orders</h1>
      <p className="shop-subtitle mt-2 max-w-xl">
        Track current deliveries and look back over everything you have ordered.
      </p>
    </div>
  );
}

export function Orders() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { orders, loading } = useOrders({
    autoLoad: true,
    limit: 20,
  });

  // Filter orders based on status and search
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.orderStatus === statusFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order =>
        (order.orderNumber || '').toLowerCase().includes(query) ||
        order.id.toLowerCase().includes(query) ||
        order.deliveryAddress.name.toLowerCase().includes(query) ||
        order.deliveryAddress.phone.includes(query)
      );
    }

    return filtered;
  }, [orders, statusFilter, searchQuery]);

  // Calculate order statistics
  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.orderStatus === 'pending').length;
    const confirmedOrders = orders.filter(o => o.orderStatus === 'confirmed').length;
    const deliveredOrders = orders.filter(o => o.orderStatus === 'delivered' || o.orderStatus === 'completed').length;

    return { totalOrders, pendingOrders, confirmedOrders, deliveredOrders };
  }, [orders]);

  const handleOrderClick = (orderId: string) => {
    navigate(`/buyer/orders/${orderId}`);
  };

  // Loading state
  if (loading && orders.length === 0) {
    return (
      <DashboardLayout title="Orders" subtitle="Your order history">
        <div className="py-2 space-y-8">
          <OrdersHeader />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl bg-ivory-100" />
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-2xl bg-ivory-100" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Empty state
  if (!loading && orders.length === 0) {
    return (
      <DashboardLayout title="Orders" subtitle="Your order history">
        <motion.div
          className="py-2 space-y-8"
          variants={fadeVariants}
          initial="hidden"
          animate="visible"
        >
          <OrdersHeader />
          <div className="shop-card px-6 py-16 sm:py-20 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-ivory-100 border border-ivory-200 flex items-center justify-center">
              <Package className="w-7 h-7 text-brass-600" strokeWidth={1.5} aria-hidden="true" />
            </div>
            <h2 className="shop-heading text-2xl mt-6">No orders yet</h2>
            <p className="shop-subtitle mt-2 max-w-sm">
              You haven't placed any orders. Start shopping to see your orders here.
            </p>
            <button
              type="button"
              className="shop-btn-primary mt-8"
              onClick={() => navigate('/buyer/products')}
            >
              Browse products
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </motion.div>
      </DashboardLayout>
    );
  }

  const statTiles = [
    { label: 'Total orders', value: stats.totalOrders, icon: Package, accent: 'text-ink' },
    { label: 'Pending', value: stats.pendingOrders, icon: Clock, accent: 'text-amber-700' },
    { label: 'Confirmed', value: stats.confirmedOrders, icon: CheckCircle, accent: 'text-ink-700' },
    { label: 'Delivered', value: stats.deliveredOrders, icon: CheckCircle, accent: 'text-emerald-700' },
  ];

  return (
    <DashboardLayout title="Orders" subtitle="Your order history">
      <motion.div
        className="py-2 space-y-8"
        variants={fadeVariants}
        initial="hidden"
        animate="visible"
      >
        <OrdersHeader />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-2xl border border-ivory-200 bg-ivory-200">
          {statTiles.map(({ label, value, icon: Icon, accent }) => (
            <div key={label} className="bg-white p-5 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">{label}</p>
                <Icon className="w-4 h-4 text-brass-500 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              </div>
              <p className={`font-display text-3xl sm:text-4xl font-medium tracking-tight tabular-nums mt-3 ${accent}`}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" aria-hidden="true" />
            <input
              type="text"
              aria-label="Search orders"
              placeholder="Search by order number, name, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="shop-input rounded-full pl-10"
            />
          </div>

          {/* Status Filter */}
          <div className="relative sm:w-56">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" aria-hidden="true" />
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="shop-input rounded-full pl-10 pr-8 font-medium cursor-pointer"
            >
              <option value="all">All orders</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="assigned">Partner assigned</option>
              <option value="delivered">Delivered</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="shop-card px-6 py-14 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-ivory-100 border border-ivory-200 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-brass-600" strokeWidth={1.5} aria-hidden="true" />
            </div>
            <h2 className="shop-heading mt-5">No orders found</h2>
            <p className="shop-subtitle mt-1.5 max-w-sm">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <motion.div
            className="space-y-4"
            variants={listContainerVariants}
            initial="hidden"
            animate="visible"
          >
            {filteredOrders.map((order) => {
              const statusConfig = ORDER_STATUS_CONFIG[order.orderStatus] || { label: order.orderStatus, tone: TONE.stone, icon: Package };
              const paymentConfig = PAYMENT_STATUS_CONFIG[order.paymentStatus as keyof typeof PAYMENT_STATUS_CONFIG] || { label: order.paymentStatus, tone: TONE.stone };
              const StatusIcon = statusConfig.icon;

              return (
                <motion.div
                  key={order.id}
                  variants={listItemVariants}
                >
                  <div
                    className="shop-card group cursor-pointer transition-[border-color,box-shadow] duration-300 hover:border-ivory-300 hover:shadow-[0_6px_20px_rgba(20,33,61,0.06)]"
                    onClick={() => handleOrderClick(order.id)}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 sm:pt-6">
                      <div className="flex items-start gap-4 min-w-0">
                        <div className="hidden sm:flex w-11 h-11 rounded-full bg-ivory-100 border border-ivory-200 items-center justify-center shrink-0">
                          <StatusIcon className="w-5 h-5 text-ink-500" strokeWidth={1.75} aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-display text-lg sm:text-xl font-medium tracking-tight text-ink truncate">
                            Order #{order.orderNumber || order.id.slice(0, 8).toUpperCase()}
                          </h3>
                          <p className="text-xs text-stone-500 mt-1">
                            Placed on {formatDate(order.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`${PILL} ${statusConfig.tone}`}>
                          {statusConfig.label}
                        </span>
                        <ChevronRight className="hidden sm:block w-5 h-5 text-stone-400 group-hover:text-ink group-hover:translate-x-0.5 transition-all" aria-hidden="true" />
                      </div>
                    </div>

                    {/* Order Info */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 px-5 sm:px-6 py-5 mt-5 border-t border-ivory-200">
                      <div>
                        <p className={META_LABEL}>Items</p>
                        <p className="text-sm font-medium text-ink mt-1">{order.items.length} items</p>
                      </div>
                      <div className="min-w-0">
                        <p className={META_LABEL}>Deliver to</p>
                        <p className="text-sm font-medium text-ink truncate mt-1">
                          {order.deliveryAddress.name}
                        </p>
                      </div>
                      <div className="col-span-2 sm:col-span-1 sm:text-right">
                        <p className={META_LABEL}>Total</p>
                        <p className="shop-price text-xl mt-0.5">₹{order.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                    </div>

                    {/* Payment */}
                    <div className="flex flex-wrap items-center gap-2 px-5 sm:px-6 py-3.5 bg-ivory-50 border-t border-ivory-200 rounded-b-2xl">
                      <span className={`${PILL} ${paymentConfig.tone}`}>
                        Payment: {paymentConfig.label}
                      </span>
                      <span className="shop-chip uppercase tracking-wider">
                        {order.paymentMethod}
                      </span>
                      <span className="ml-auto inline-flex items-center gap-0.5 text-xs font-semibold text-ink-500 group-hover:text-ink transition-colors">
                        View details
                        <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Results Count */}
        {filteredOrders.length > 0 && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400 text-center">
            Showing {filteredOrders.length} of {orders.length} orders
          </p>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
