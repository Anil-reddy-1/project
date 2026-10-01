/**
 * Delivery Partner Dashboard
 * Modern overview with live stats, pending actions, and quick navigation
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Package, Truck, CheckCircle, Clock, ArrowRight,
  MapPin, Phone, User, AlertCircle, RefreshCw
} from 'lucide-react';
import { DashboardLayout } from '../../components/layout';
import { useDeliveries } from '../../hooks/useDeliveries';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, Badge, Skeleton } from '../../components/ui';
import { fadeVariants, listContainerVariants, listItemVariants } from '../../utils/animations';
import { formatDate } from '../../utils/date';

const STATUS_COLORS: Record<string, string> = {
  assigned: 'from-amber-500 to-orange-500',
  accepted: 'from-blue-500 to-indigo-500',
  in_transit: 'from-violet-500 to-purple-500',
  delivered: 'from-emerald-500 to-green-500',
};

export function DeliveryDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { deliveries, loading, loadDeliveries } = useDeliveries({ autoLoad: true });
  const [greeting, setGreeting] = useState('Good day');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const stats = useMemo(() => {
    const assigned = deliveries.filter(d => d.status === 'assigned').length;
    const accepted = deliveries.filter(d => d.status === 'accepted').length;
    const inTransit = deliveries.filter(d => d.status === 'in_transit').length;
    const delivered = deliveries.filter(d => d.status === 'delivered').length;
    return { assigned, accepted, inTransit, delivered, total: deliveries.length };
  }, [deliveries]);

  const pendingActions = useMemo(() => {
    return deliveries.filter(d => ['assigned', 'accepted', 'in_transit'].includes(d.status));
  }, [deliveries]);

  if (loading && deliveries.length === 0) {
    return (
      <DashboardLayout title="Dashboard" subtitle="Your delivery overview">
        <div className="py-2 space-y-6">
          <Skeleton className="h-32" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
          <Skeleton className="h-64" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard" subtitle="Your delivery overview">
      <motion.div
        className="py-2 space-y-8"
        variants={fadeVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-white">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative z-10">
            <p className="text-slate-400 text-sm font-medium">{greeting}</p>
            <h1 className="text-2xl md:text-3xl font-bold mt-1">
              {user?.name || user?.email?.split('@')[0] || 'Delivery Partner'}
            </h1>
            <p className="text-slate-300 mt-2 text-sm">
              You have <span className="text-white font-semibold">{stats.assigned + stats.accepted + stats.inTransit}</span> active deliveries today
            </p>
          </div>
          <div className="relative z-10 mt-4 flex gap-3">
            <Button
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              variant="outline"
              onClick={() => navigate('/delivery/deliveries')}
            >
              <Package className="w-4 h-4 mr-2" />
              View All Deliveries
            </Button>
            <Button
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              variant="outline"
              onClick={() => loadDeliveries()}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Awaiting Accept', value: stats.assigned, icon: Clock, gradient: STATUS_COLORS.assigned },
            { label: 'Accepted', value: stats.accepted, icon: CheckCircle, gradient: STATUS_COLORS.accepted },
            { label: 'In Transit', value: stats.inTransit, icon: Truck, gradient: STATUS_COLORS.in_transit },
            { label: 'Delivered', value: stats.delivered, icon: CheckCircle, gradient: STATUS_COLORS.delivered },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <motion.div key={stat.label} whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
                <Card className="relative overflow-hidden p-5 border-0 shadow-lg">
                  <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-5`} />
                  <div className="relative z-10">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center mb-3`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">{stat.label}</p>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Pending Actions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">Pending Actions</h2>
            {pendingActions.length > 0 && (
              <Badge variant="yellow">{pendingActions.length} pending</Badge>
            )}
          </div>

          {pendingActions.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-slate-800 text-lg">All caught up!</h3>
              <p className="text-sm text-slate-500 mt-1">No pending deliveries right now.</p>
            </Card>
          ) : (
            <motion.div
              className="space-y-3"
              variants={listContainerVariants}
              initial="hidden"
              animate="visible"
            >
              {pendingActions.slice(0, 5).map((delivery) => (
                <motion.div key={delivery.id} variants={listItemVariants}>
                  <Card
                    className="p-4 hover:shadow-md transition-all cursor-pointer group border-l-4"
                    style={{
                      borderLeftColor: delivery.status === 'assigned' ? '#f59e0b'
                        : delivery.status === 'accepted' ? '#3b82f6'
                        : '#8b5cf6'
                    }}
                    onClick={() => navigate(`/delivery/deliveries/${delivery.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-slate-800 truncate">
                            {delivery.orderNumber ? `Order #${delivery.orderNumber}` : `#${delivery.id.slice(0, 8)}`}
                          </h3>
                          <Badge variant={
                            delivery.status === 'assigned' ? 'yellow' as any
                              : delivery.status === 'accepted' ? 'blue' as any
                              : 'purple' as any
                          }>
                            {delivery.status === 'in_transit' ? 'In Transit' : delivery.status.charAt(0).toUpperCase() + delivery.status.slice(1)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            {delivery.customerName}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {delivery.deliveryAddress.city}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
                    </div>
                  </Card>
                </motion.div>
              ))}

              {pendingActions.length > 5 && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/delivery/deliveries')}
                >
                  View all {pendingActions.length} pending deliveries
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </motion.div>
          )}
        </div>

        {/* Quick Stats Summary */}
        <Card className="p-6 bg-slate-50 border-slate-200">
          <div className="flex items-center gap-3 mb-1">
            <Package className="w-5 h-5 text-slate-600" />
            <h3 className="font-semibold text-slate-800">Total Deliveries</h3>
          </div>
          <p className="text-sm text-slate-500">
            You have completed <span className="font-semibold text-slate-800">{stats.delivered}</span> out of <span className="font-semibold text-slate-800">{stats.total}</span> total deliveries assigned to you.
          </p>
        </Card>
      </motion.div>
    </DashboardLayout>
  );
}
