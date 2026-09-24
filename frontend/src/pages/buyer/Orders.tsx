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
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Orders</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{stats.totalOrders}</p>
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
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by order number, name, or phone..."
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
            {filteredOrders.map((order) => {
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
                              Placed on {formatDate(order.createdAt)}
                            </p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                        </div>

                        {/* Order Info */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
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
                              {order.deliveryAddress.name}
                            </p>
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
                          <Badge variant="outline">
                            {order.paymentMethod}
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
