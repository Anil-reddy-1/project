/**
 * Deliveries Page (Delivery Partner)
 * View and manage assigned deliveries
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Package, Filter, MapPin, Phone, User, ChevronRight,
  Clock, CheckCircle, Truck, AlertCircle, Banknote
} from 'lucide-react';
import { DashboardLayout } from '../../components/layout';
import { useDeliveries } from '../../hooks/useDeliveries';
import { 
  Button, EmptyState, Badge, 
  Skeleton, Card 
} from '../../components/ui';
import { fadeVariants, listContainerVariants, listItemVariants } from '../../utils/animations';
import { formatDate } from '../../utils/date';
import { isCashPendingReturn, type Delivery } from '../../services/delivery.service';

// Delivered COD orders aren't successful until the supervisor confirms the cash handover
const CASH_PENDING_CONFIG = { label: 'Pending · Return Cash', color: 'yellow', icon: Banknote };

const amountOf = (d: Delivery) => d.totalAmount ?? d.orderAmount ?? 0;

const DELIVERY_STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'gray', icon: Clock },
  assigned: { label: 'Assigned', color: 'yellow', icon: AlertCircle },
  accepted: { label: 'Accepted', color: 'blue', icon: CheckCircle },
  in_transit: { label: 'In Transit', color: 'purple', icon: Truck },
  delivered: { label: 'Delivered', color: 'green', icon: CheckCircle },
  failed: { label: 'Failed', color: 'red', icon: AlertCircle },
};

export function Deliveries() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const { deliveries, loading, loadDeliveries } = useDeliveries({
    autoLoad: true,
  });

  // Filter deliveries based on status
  const filteredDeliveries = useMemo(() => {
    if (statusFilter === 'all') return deliveries;
    if (statusFilter === 'cash_pending') return deliveries.filter(isCashPendingReturn);
    if (statusFilter === 'delivered') {
      return deliveries.filter(d => d.status === 'delivered' && !isCashPendingReturn(d));
    }
    return deliveries.filter(delivery => delivery.status === statusFilter);
  }, [deliveries, statusFilter]);

  // Calculate delivery statistics
  const stats = useMemo(() => {
    const totalDeliveries = deliveries.length;
    const assignedCount = deliveries.filter(d => d.status === 'assigned').length;
    const acceptedCount = deliveries.filter(d => d.status === 'accepted').length;
    const inTransitCount = deliveries.filter(d => d.status === 'in_transit').length;
    const cashPending = deliveries.filter(isCashPendingReturn);
    const successfulCount = deliveries.filter(d => d.status === 'delivered').length - cashPending.length;
    const cashPendingAmount = cashPending.reduce((sum, d) => sum + amountOf(d), 0);

    return {
      totalDeliveries, assignedCount, acceptedCount, inTransitCount, successfulCount,
      cashPendingCount: cashPending.length, cashPendingAmount,
    };
  }, [deliveries]);

  const handleDeliveryClick = (deliveryId: string) => {
    navigate(`/delivery/deliveries/${deliveryId}`);
  };

  // Loading state
  if (loading && deliveries.length === 0) {
    return (
      <DashboardLayout title="My Deliveries" subtitle="Manage your delivery assignments">
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
  if (!loading && deliveries.length === 0) {
    return (
      <DashboardLayout title="My Deliveries" subtitle="Manage your delivery assignments">
        <motion.div 
          className="py-8"
          variants={fadeVariants}
          initial="hidden"
          animate="visible"
        >
          <EmptyState
            icon={Package}
            title="No deliveries assigned"
            description="You don't have any delivery assignments yet. Deliveries will appear here once assigned by admin."
          />
        </motion.div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Deliveries" subtitle="Manage your delivery assignments">
      <motion.div 
        className="py-2 space-y-6"
        variants={fadeVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Cash to return */}
        {stats.cashPendingCount > 0 && (
          <button
            type="button"
            onClick={() => setStatusFilter('cash_pending')}
            className="w-full text-left rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 sm:p-5 flex items-center gap-4 hover:bg-amber-100/70 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <Banknote className="w-6 h-6 text-amber-700" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-amber-900">
                Return ₹{stats.cashPendingAmount.toLocaleString('en-IN')} cash to your supervisor
              </p>
              <p className="text-sm text-amber-800/80">
                {stats.cashPendingCount} {stats.cashPendingCount === 1 ? 'delivery is' : 'deliveries are'} pending
                until the supervisor confirms receiving the cash.
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-amber-700 ml-auto shrink-0" />
          </button>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{stats.totalDeliveries}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Assigned</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.assignedCount}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Accepted</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{stats.acceptedCount}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">In Transit</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{stats.inTransitCount}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <Truck className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Successful</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.successfulCount}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Cash to Return</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{stats.cashPendingCount}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <Banknote className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filter */}
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Deliveries</option>
              <option value="assigned">Assigned</option>
              <option value="accepted">Accepted</option>
              <option value="in_transit">In Transit</option>
              <option value="cash_pending">Pending · Return Cash</option>
              <option value="delivered">Successful</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadDeliveries()}
            >
              Refresh
            </Button>
          </div>
        </Card>

        {/* Deliveries List */}
        {filteredDeliveries.length === 0 ? (
          <Card className="p-8">
            <EmptyState
              icon={AlertCircle}
              title="No deliveries found"
              description="Try adjusting your filter."
            />
          </Card>
        ) : (
          <motion.div 
            className="space-y-4"
            variants={listContainerVariants}
            initial="hidden"
            animate="visible"
          >
            {filteredDeliveries.map((delivery) => {
              const statusConfig = isCashPendingReturn(delivery)
                ? CASH_PENDING_CONFIG
                : DELIVERY_STATUS_CONFIG[delivery.status];
              const StatusIcon = statusConfig.icon;
              
              return (
                <motion.div
                  key={delivery.id}
                  variants={listItemVariants}
                >
                  <Card 
                    className="p-6 hover:shadow-lg transition-all cursor-pointer group"
                    onClick={() => handleDeliveryClick(delivery.id)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Delivery Icon */}
                      <div className={`w-12 h-12 rounded-xl bg-${statusConfig.color}-100 flex items-center justify-center flex-shrink-0`}>
                        <StatusIcon className={`w-6 h-6 text-${statusConfig.color}-600`} />
                      </div>

                      {/* Delivery Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <h3 className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                              {delivery.orderNumber ? `Order #${delivery.orderNumber}` : `Delivery #${delivery.id.slice(0, 8)}`}
                            </h3>
                            <p className="text-sm text-slate-500 mt-0.5">
                              {delivery.assignedAt ? `Assigned ${formatDate(delivery.assignedAt)}` : 'Recently assigned'}
                            </p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                        </div>

                        {/* Customer & Address Info */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400" />
                            <div>
                              <p className="text-xs text-slate-500">Customer</p>
                              <p className="text-sm font-semibold text-slate-800">{delivery.customerName}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-slate-400" />
                            <div>
                              <p className="text-xs text-slate-500">Phone</p>
                              <p className="text-sm font-semibold text-slate-800">{delivery.customerPhone}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            <div>
                              <p className="text-xs text-slate-500">Location</p>
                              <p className="text-sm font-semibold text-slate-800 truncate">
                                {delivery.deliveryAddress.city}, {delivery.deliveryAddress.state}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <Badge variant={statusConfig.color as any}>
                            {statusConfig.label}
                          </Badge>
                          {delivery.status === 'in_transit' && delivery.deliveryOtpVerifiedAt && (
                            <Badge variant="warning">
                              OTP Verified · Collect Cash
                            </Badge>
                          )}
                          {isCashPendingReturn(delivery) && (
                            <Badge variant="warning">
                              Return ₹{amountOf(delivery).toLocaleString('en-IN')} cash to supervisor
                            </Badge>
                          )}
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
        {filteredDeliveries.length > 0 && (
          <p className="text-sm text-slate-500 text-center">
            Showing {filteredDeliveries.length} of {deliveries.length} deliveries
          </p>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
