/**
 * Orders Management Page (Admin)
 * View and manage all orders in the system
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Package, Search, Filter, Calendar, ChevronRight, 
  Clock, CheckCircle, Truck, XCircle, AlertCircle, Download 
} from 'lucide-react';
import { DashboardLayout } from '../../components/layout';
import { orderService, type Order } from '../../services/order.service';
import { 
  Button, EmptyState, LoadingSpinner, Badge, 
  Skeleton, Card 
} from '../../components/ui';
import { fadeVariants, listContainerVariants, listItemVariants } from '../../utils/animations';
import { formatDate } from '../../utils/date';
import { showErrorToast } from '../../utils/toast';

const ORDER_STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'yellow', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'blue', icon: CheckCircle },
  assigned: { label: 'Assigned', color: 'purple', icon: Truck },
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
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Load orders
  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await orderService.getAllOrders({
        page,
        limit: 20,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        paymentStatus: paymentStatusFilter !== 'all' ? paymentStatusFilter : undefined,
        search: searchQuery || undefined,
      });
      setOrders(response.data.orders);
      setTotal(response.data.total);
    } catch (error) {
      showErrorToast('Failed to load orders');
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load orders on mount and filter changes
  useEffect(() => {
    loadOrders();
  }, [page, statusFilter, paymentStatusFilter]);

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) {
        loadOrders();
      } else {
        setPage(1);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Calculate order statistics
  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.orderStatus === 'pending').length;
    const confirmedOrders = orders.filter(o => o.orderStatus === 'confirmed').length;
    const deliveredOrders = orders.filter(o => o.orderStatus === 'delivered' || o.orderStatus === 'completed').length;
    const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    
    return { totalOrders, pendingOrders, confirmedOrders, deliveredOrders, totalRevenue };
  }, [orders]);

  const handleOrderClick = (orderId: string) => {
    navigate(`/admin/orders/${orderId}`);
  };

  // Loading state
  if (loading && orders.length === 0) {
    return (
      <DashboardLayout title="Orders" subtitle="Manage all orders">
        <div className="py-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
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
  if (!loading && orders.length === 0 && statusFilter === 'all' && !searchQuery) {
    return (
      <DashboardLayout title="Orders" subtitle="Manage all orders">
        <motion.div 
          className="py-8"
          variants={fadeVariants}
          initial="hidden"
          animate="visible"
        >
          <EmptyState
            icon={Package}
            title="No orders yet"
            description="Orders placed by buyers will appear here."
          />
        </motion.div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Orders" subtitle="Manage all orders">
      <motion.div 
        className="py-2 space-y-6"
        variants={fadeVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Orders</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{total}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Pending</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pendingOrders}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Confirmed</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{stats.confirmedOrders}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Delivered</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.deliveredOrders}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Revenue</p>
                <p className="text-2xl font-bold text-green-600 mt-1">₹{stats.totalRevenue.toFixed(0)}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <Download className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by order number, customer name, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="assigned">Assigned</option>
                <option value="delivered">Delivered</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Payment Status Filter */}
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Payment</option>
              <option value="pending">Payment Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Payment Failed</option>
            </select>
          </div>
        </Card>

        {/* Orders List */}
        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : orders.length === 0 ? (
          <Card className="p-8">
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
            {orders.map((order) => {
              const statusConfig = ORDER_STATUS_CONFIG[order.orderStatus];
              const paymentConfig = PAYMENT_STATUS_CONFIG[order.paymentStatus];
              const StatusIcon = statusConfig.icon;
              
              return (
                <motion.div
                  key={order.id}
                  variants={listItemVariants}
                >
                  <Card 
                    className="p-6 hover:shadow-lg transition-all cursor-pointer group"
                    onClick={() => handleOrderClick(order.id)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Order Icon */}
                      <div className={`w-12 h-12 rounded-xl bg-${statusConfig.color}-100 flex items-center justify-center flex-shrink-0`}>
                        <StatusIcon className={`w-6 h-6 text-${statusConfig.color}-600`} />
                      </div>

                      {/* Order Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <h3 className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                              Order #{order.orderNumber}
                            </h3>
                            <p className="text-sm text-slate-500 mt-0.5">
                              {order.customerName || 'Customer'} • Placed on {formatDate(order.createdAt)}
                            </p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                        </div>

                        {/* Order Info */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Items</p>
                            <p className="text-sm font-semibold text-slate-800">{order.items.length} items</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Total Amount</p>
                            <p className="text-sm font-semibold text-slate-800">₹{order.totalAmount.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Delivery To</p>
                            <p className="text-sm font-semibold text-slate-800 truncate">
                              {order.deliveryAddress.city}, {order.deliveryAddress.state}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Payment</p>
                            <p className="text-sm font-semibold text-slate-800">{order.paymentMethod}</p>
                          </div>
                        </div>

                        {/* Status Badges */}
                        <div className="flex flex-wrap gap-2 mt-4">
                          <Badge variant={statusConfig.color as any}>
                            {statusConfig.label}
                          </Badge>
                          <Badge variant={paymentConfig.color as any}>
                            {paymentConfig.label}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Results Count & Pagination */}
        {orders.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing {orders.length} of {total} orders
            </p>
            {total > 20 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * 20 >= total}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
