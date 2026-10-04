/**
 * Supervisor Dashboard
 * Overview with live stats, pending orders, and quick navigation
 */

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Package,
  ClipboardList,
  CheckCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  PackageCheck,
  Truck,
} from "lucide-react";
import { DashboardLayout } from "../../components/layout";
import { useAuth } from "../../context/AuthContext";
import { Button, Card, Badge, Skeleton } from "../../components/ui";
import {
  fadeVariants,
  listContainerVariants,
  listItemVariants,
} from "../../utils/animations";
import { supervisorService } from "../../services/supervisor.service";
import toast from "react-hot-toast";

const STATUS_COLORS: Record<string, string> = {
  confirmed: "from-blue-500 to-indigo-500",
  preparing: "from-amber-500 to-orange-500",
  packed: "from-emerald-500 to-green-500",
  assigned: "from-violet-500 to-purple-500",
};

const STATUS_LABELS: Record<string, string> = {
  confirmed: "New Orders",
  preparing: "Preparing",
  packed: "Packed",
  assigned: "Assigned",
};

export function SupervisorDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState("Good day");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await supervisorService.getAllOrders({ limit: 100 });
      const data = res?.data;
      const list = Array.isArray(data) ? data : data?.orders || [];
      setOrders(list);
    } catch (err) {
      console.error("Failed to load orders:", err);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const stats = useMemo(() => {
    const confirmed = orders.filter((o) => o.orderStatus === "confirmed").length;
    const preparing = orders.filter((o) => o.orderStatus === "preparing").length;
    const packed = orders.filter((o) => o.orderStatus === "packed").length;
    const assigned = orders.filter((o) => o.orderStatus === "assigned").length;
    return { confirmed, preparing, packed, assigned, total: orders.length };
  }, [orders]);

  const pendingOrders = useMemo(() => {
    return orders
      .filter((o) => ["confirmed", "preparing", "packed"].includes(o.orderStatus))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders]);

  if (loading && orders.length === 0) {
    return (
      <DashboardLayout title="Dashboard" subtitle="Supervisor overview">
        <div className="py-2 space-y-6">
          <Skeleton className="h-32" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard" subtitle="Supervisor overview">
      <motion.div
        className="py-2 space-y-8"
        variants={fadeVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-8 text-white">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative z-10">
            <p className="text-purple-300 text-sm font-medium">{greeting}</p>
            <h1 className="text-2xl md:text-3xl font-bold mt-1">
              {user?.name || user?.email?.split("@")[0] || "Supervisor"}
            </h1>
            <p className="text-purple-200 mt-2 text-sm">
              You have{" "}
              <span className="text-white font-semibold">
                {stats.confirmed + stats.preparing}
              </span>{" "}
              orders needing attention
            </p>
          </div>
          <div className="relative z-10 mt-4 flex gap-3">
            <Button
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              variant="outline"
              onClick={() => navigate("/supervisor/orders")}
            >
              <ClipboardList className="w-4 h-4 mr-2" />
              View All Orders
            </Button>
            <Button
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              variant="outline"
              onClick={loadOrders}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: STATUS_LABELS.confirmed,
              value: stats.confirmed,
              icon: AlertCircle,
              gradient: STATUS_COLORS.confirmed,
            },
            {
              label: STATUS_LABELS.preparing,
              value: stats.preparing,
              icon: Clock,
              gradient: STATUS_COLORS.preparing,
            },
            {
              label: STATUS_LABELS.packed,
              value: stats.packed,
              icon: PackageCheck,
              gradient: STATUS_COLORS.packed,
            },
            {
              label: STATUS_LABELS.assigned,
              value: stats.assigned,
              icon: Truck,
              gradient: STATUS_COLORS.assigned,
            },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="relative overflow-hidden p-5 border-0 shadow-lg">
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-5`}
                  />
                  <div className="relative z-10">
                    <div
                      className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center mb-3`}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-3xl font-bold text-slate-800">
                      {stat.value}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      {stat.label}
                    </p>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Pending Orders */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">
              Orders Needing Action
            </h2>
            {pendingOrders.length > 0 && (
              <Badge variant="warning">{pendingOrders.length} pending</Badge>
            )}
          </div>

          {pendingOrders.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-slate-800 text-lg">
                All caught up!
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                No orders needing attention right now.
              </p>
            </Card>
          ) : (
            <motion.div
              className="space-y-3"
              variants={listContainerVariants}
              initial="hidden"
              animate="visible"
            >
              {pendingOrders.slice(0, 6).map((order) => (
                <motion.div key={order.id} variants={listItemVariants}>
                  <Card
                    className="p-4 hover:shadow-md transition-all cursor-pointer group border-l-4"
                    style={{
                      borderLeftColor:
                        order.orderStatus === "confirmed"
                          ? "#3b82f6"
                          : order.orderStatus === "preparing"
                            ? "#f59e0b"
                            : "#10b981",
                    }}
                    onClick={() =>
                      navigate(`/supervisor/orders/${order.id}`)
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-slate-800 truncate">
                            {order.orderNumber
                              ? `Order #${order.orderNumber}`
                              : `#${order.id.slice(0, 8)}`}
                          </h3>
                          <Badge
                            variant={
                              order.orderStatus === "confirmed"
                                ? ("blue" as any)
                                : order.orderStatus === "preparing"
                                  ? ("yellow" as any)
                                  : ("green" as any)
                            }
                          >
                            {order.orderStatus.charAt(0).toUpperCase() +
                              order.orderStatus.slice(1)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Package className="w-3.5 h-3.5" />
                            ₹{order.totalAmount?.toFixed?.(2) || order.totalAmount}
                          </span>
                          <span className="text-slate-400">
                            {new Date(order.createdAt).toLocaleString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-purple-600 transition-colors flex-shrink-0" />
                    </div>
                  </Card>
                </motion.div>
              ))}

              {pendingOrders.length > 6 && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/supervisor/orders")}
                >
                  View all {pendingOrders.length} pending orders
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
            <h3 className="font-semibold text-slate-800">Today's Overview</h3>
          </div>
          <p className="text-sm text-slate-500">
            {stats.confirmed} new orders waiting,{" "}
            {stats.preparing} in preparation,{" "}
            {stats.packed} packed and ready,{" "}
            {stats.assigned} assigned for delivery.
          </p>
        </Card>
      </motion.div>
    </DashboardLayout>
  );
}
