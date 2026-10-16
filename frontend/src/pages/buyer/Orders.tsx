/**
 * Orders Page (Buyer)
 * View order history with filters and search
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Package, Search, Filter, ChevronRight, 
  Clock, CheckCircle, Truck, XCircle, AlertCircle 
} from 'lucide-react';
import { DashboardLayout } from '../../components/layout';
import { useOrders } from '../../hooks/useOrders';
import { 
  Button, EmptyState, Badge, 
  Skeleton, Card 
} from '../../components/ui';
import { fadeVariants, listContainerVariants, listItemVariants } from '../../utils/animations';
import { formatDate } from '../../utils/date';

const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pending', color: 'yellow', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'blue', icon: CheckCircle },
  preparing: { label: 'Preparing', color: 'orange', icon: Package },
  packed: { label: 'Packed', color: 'indigo', icon: Package },
  assigned: { label: 'Assigned', color: 'purple', icon: Truck },
  in_transit: { label: 'In Transit', color: 'blue', icon: Truck },
  out_for_delivery: { label: 'Out for Delivery', color: 'blue', icon: Truck },
  delivered: { label: 'Delivered', color: 'green', icon: CheckCircle },
  completed: { label: 'Completed', color: 'green', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'red', icon: XCircle },
};

const PAYMENT_STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'yellow' },
  paid: { label: 'Paid', color: 'green' },
  failed: { label: 'Failed', color: 'red' },
  refunded: { label: 'Refunded', color: 'gray' },
};

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
        order.orderNumber.toLowerCase().includes(query) ||
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
        <div className="py-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
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
          className="py-8"
          variants={fadeVariants}
          initial="hidden"
          animate="visible"
        >
          <EmptyState
            icon={Package}
            title="No orders yet"
            description="You haven't placed any orders. Start shopping to see your orders here."
            action={
              <Button onClick={() => navigate('/buyer/products')}>
                Browse Products
              </Button>
            }
          />
        </motion.div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Orders" subtitle="Your order history">
      <motion.div 
        className="py-2 space-y-6"
        variants={fadeVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 rounded-2xl border border-indigo-100/80 bg-gradient-to-br from-indigo-50/50 via-white to-white shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">Total Orders</p>
                <p className="text-3xl font-black text-slate-900 mt-1 tracking-tight">{stats.totalOrders}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                <Package className="w-6 h-6" />
              </div>
            </div>
          </Card>
          
          <Card className="p-5 rounded-2xl border border-amber-100/80 bg-gradient-to-br from-amber-50/50 via-white to-white shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Pending</p>
                <p className="text-3xl font-black text-amber-600 mt-1 tracking-tight">{stats.pendingOrders}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </Card>
          
          <Card className="p-5 rounded-2xl border border-blue-100/80 bg-gradient-to-br from-blue-50/50 via-white to-white shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Confirmed</p>
                <p className="text-3xl font-black text-blue-600 mt-1 tracking-tight">{stats.confirmedOrders}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>
          </Card>
          
          <Card className="p-5 rounded-2xl border border-emerald-100/80 bg-gradient-to-br from-emerald-50/50 via-white to-white shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Delivered</p>
                <p className="text-3xl font-black text-emerald-600 mt-1 tracking-tight">{stats.deliveredOrders}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by order number, name, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-semibold text-slate-700 bg-white"
              >
                <option value="all">All Orders</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="assigned">Assigned</option>
                <option value="delivered">Delivered</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <Card className="p-8 rounded-2xl border border-slate-200/80 text-center">
            <EmptyState
              icon={AlertCircle}
              title="No orders found"
              description="Try adjusting your filters or search query."
            />
          </Card>
        ) : (
          <motion.div 
            className="space-y-4"
            variants={listContainerVariants}
            initial="hidden"
            animate="visible"
          >
            {filteredOrders.map((order) => {
              const statusConfig = ORDER_STATUS_CONFIG[order.orderStatus] || { label: order.orderStatus, color: 'gray', icon: Package };
              const paymentConfig = PAYMENT_STATUS_CONFIG[order.paymentStatus as keyof typeof PAYMENT_STATUS_CONFIG] || { label: order.paymentStatus, color: 'gray' };
              const StatusIcon = statusConfig.icon;
              
              return (
                <motion.div
                  key={order.id}
                  variants={listItemVariants}
                >
                  <Card 
                    className="p-6 rounded-2xl border border-slate-200/80 hover:border-indigo-300 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group bg-white"
                    onClick={() => handleOrderClick(order.id)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Order Icon */}
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-50 to-slate-100 border border-indigo-100 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <StatusIcon className="w-6 h-6 text-indigo-600" />
                      </div>

                      {/* Order Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              Order #{order.orderNumber}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5 font-medium">
                              Placed on {formatDate(order.createdAt)}
                            </p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                        </div>

                        {/* Order Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                          <div>
                            <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Items</p>
                            <p className="text-sm font-bold text-slate-800 mt-0.5">{order.items.length} items</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Total Amount</p>
                            <p className="text-base font-extrabold text-indigo-600 mt-0.5">₹{order.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Delivery To</p>
                            <p className="text-sm font-bold text-slate-800 truncate mt-0.5">
                              {order.deliveryAddress.name}
                            </p>
                          </div>
                        </div>

                        {/* Status Badges */}
                        <div className="flex flex-wrap items-center gap-2 mt-4">
                          <Badge variant={statusConfig.color as any} className="font-semibold text-xs">
                            {statusConfig.label}
                          </Badge>
                          <Badge variant={paymentConfig.color as any} className="font-semibold text-xs">
                            Payment: {paymentConfig.label}
                          </Badge>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                            {order.paymentMethod}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Results Count */}
        {filteredOrders.length > 0 && (
          <p className="text-sm text-slate-500 text-center">
            Showing {filteredOrders.length} of {orders.length} orders
          </p>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
