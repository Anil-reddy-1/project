/**
 * Supervisor Orders Page
 * List of all orders with status filters and actions
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Package,
  Search,
  RefreshCw,
  ArrowRight,
  Clock,
  CheckCircle,
  PackageCheck,
  Truck,
  AlertCircle,
  Banknote,
} from "lucide-react";
import { DashboardLayout } from "../../components/layout";
import { Button, Card, Badge, Skeleton } from "../../components/ui";
import {
  fadeVariants,
  listContainerVariants,
  listItemVariants,
} from "../../utils/animations";
import { supervisorService } from "../../services/supervisor.service";
import toast from "react-hot-toast";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "confirmed", label: "New / Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "packed", label: "Packed" },
  { value: "assigned", label: "Assigned" },
  { value: "delivered", label: "Delivered" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_BADGE_VARIANT: Record<string, string> = {
  pending: "default",
  confirmed: "info",
  preparing: "warning",
  packed: "success",
  assigned: "purple",
  delivered: "success",
  completed: "success",
  cancelled: "destructive",
};

const STATUS_ICON: Record<string, any> = {
  confirmed: AlertCircle,
  preparing: Clock,
  packed: PackageCheck,
  assigned: Truck,
  delivered: CheckCircle,
  completed: CheckCircle,
};

export function SupervisorOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Orders delivered but whose COD cash is still with the delivery partner —
  // kept in their own category until a supervisor confirms collection.
  const [view, setView] = useState<"all" | "cashPending">("all");
  const [cashPendingOrders, setCashPendingOrders] = useState<any[]>([]);
  const [cashPendingLoading, setCashPendingLoading] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit };
      if (statusFilter) params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;

      const res = await supervisorService.getAllOrders(params);
      const data = res?.data;

      if (Array.isArray(data)) {
        setOrders(data);
        setTotal(data.length);
      } else {
        setOrders(data?.orders || []);
        setTotal(data?.total || data?.orders?.length || 0);
      }
    } catch (err) {
      console.error("Failed to load orders:", err);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const loadCashPendingOrders = async () => {
    try {
      setCashPendingLoading(true);
      const res = await supervisorService.getCashPendingOrders();
      setCashPendingOrders(res?.data?.orders || []);
    } catch (err) {
      console.error("Failed to load cash pending orders:", err);
      toast.error("Failed to load cash pending orders");
    } finally {
      setCashPendingLoading(false);
    }
  };

  const handleConfirmCashHandover = async (orderId: string) => {
    try {
      setConfirmingId(orderId);
      await supervisorService.confirmCashHandover(orderId);
      toast.success("Cash received — order marked complete");
      setCashPendingOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to confirm cash handover");
    } finally {
      setConfirmingId(null);
    }
  };

  useEffect(() => {
    if (view === "all") {
      loadOrders();
    } else {
      loadCashPendingOrders();
    }
  }, [statusFilter, page, view]);

  // Load once on mount so the badge count shows even while on the "All Orders" tab
  useEffect(() => {
    loadCashPendingOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    setPage(1);
    loadOrders();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <DashboardLayout title="Orders" subtitle="Manage and prepare orders">
      <motion.div
        className="py-2 space-y-6"
        variants={fadeVariants}
        initial="hidden"
        animate="visible"
      >
        {/* View Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              setView("all");
              setPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              view === "all"
                ? "bg-purple-600 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            All Orders
          </button>
          <button
            onClick={() => setView("cashPending")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              view === "cashPending"
                ? "bg-amber-600 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Banknote className="w-4 h-4" />
            Cash Pending Collection
            {cashPendingOrders.length > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                  view === "cashPending" ? "bg-white/20" : "bg-amber-100 text-amber-700"
                }`}
              >
                {cashPendingOrders.length}
              </span>
            )}
          </button>
        </div>

        {view === "cashPending" ? (
          <>
            {cashPendingLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : cashPendingOrders.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                  <Banknote className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="font-semibold text-slate-800 text-lg">
                  No cash pending collection
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  All COD cash has been collected from delivery partners.
                </p>
              </Card>
            ) : (
              <motion.div
                className="space-y-3"
                variants={listContainerVariants}
                initial="hidden"
                animate="visible"
              >
                {cashPendingOrders.map((order) => (
                  <motion.div key={order.id} variants={listItemVariants}>
                    <Card className="p-4 border-l-4" style={{ borderLeftColor: "#f59e0b" }}>
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => navigate(`/supervisor/orders/${order.id}`)}
                        >
                          <h3 className="font-semibold text-slate-800">
                            {order.orderNumber ? `Order #${order.orderNumber}` : `#${order.id.slice(0, 8)}`}
                          </h3>
                          <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 flex-wrap">
                            <span className="font-bold text-amber-700">
                              ₹{order.totalAmount?.toFixed?.(2) || order.totalAmount}
                            </span>
                            {order.deliveryPartnerName && (
                              <>
                                <span className="text-slate-400">•</span>
                                <span>With: {order.deliveryPartnerName}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          disabled={confirmingId === order.id}
                          onClick={() => handleConfirmCashHandover(order.id)}
                          className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 border-0"
                        >
                          {confirmingId === order.id ? "Completing..." : "Cash Received · Mark Complete"}
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </>
        ) : (
          <>
        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by order number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setPage(1);
                loadOrders();
              }}
              className="h-[42px]"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          </div>
        </Card>

        {/* Orders List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="font-semibold text-slate-800 text-lg">
              No orders found
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {statusFilter
                ? `No orders with status "${statusFilter}".`
                : "No orders available."}
            </p>
          </Card>
        ) : (
          <motion.div
            className="space-y-3"
            variants={listContainerVariants}
            initial="hidden"
            animate="visible"
          >
            {orders.map((order) => {
              const StatusIcon =
                STATUS_ICON[order.orderStatus] || Package;
              return (
                <motion.div key={order.id} variants={listItemVariants}>
                  <Card
                    className="p-4 hover:shadow-md transition-all cursor-pointer group border-l-4"
                    style={{
                      borderLeftColor:
                        order.orderStatus === "confirmed"
                          ? "#3b82f6"
                          : order.orderStatus === "preparing"
                            ? "#f59e0b"
                            : order.orderStatus === "packed"
                              ? "#10b981"
                              : order.orderStatus === "assigned"
                                ? "#8b5cf6"
                                : order.orderStatus === "cancelled"
                                  ? "#ef4444"
                                  : "#94a3b8",
                    }}
                    onClick={() =>
                      navigate(`/supervisor/orders/${order.id}`)
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <StatusIcon className="w-4 h-4 text-slate-500 shrink-0" />
                          <h3 className="font-semibold text-slate-800 truncate">
                            {order.orderNumber
                              ? `Order #${order.orderNumber}`
                              : `#${order.id.slice(0, 8)}`}
                          </h3>
                          <Badge
                            variant={
                              (STATUS_BADGE_VARIANT[order.orderStatus] ||
                                "default") as any
                            }
                          >
                            {order.orderStatus === "confirmed"
                              ? "New"
                              : order.orderStatus.charAt(0).toUpperCase() +
                                order.orderStatus.slice(1)}
                          </Badge>
                          {order.cashHandoverStatus === "pending" && (
                            <Badge variant="warning">Cash Pending</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                          <span className="font-medium">
                            ₹{order.totalAmount?.toFixed?.(2) || order.totalAmount}
                          </span>
                          <span className="text-slate-400">•</span>
                          <span>
                            {new Date(order.createdAt).toLocaleString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {order.customerName && (
                            <>
                              <span className="text-slate-400">•</span>
                              <span>{order.customerName}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {order.orderStatus === "confirmed" && (
                          <span className="px-2 py-1 text-xs font-bold bg-blue-100 text-blue-700 rounded-full">
                            ACTION NEEDED
                          </span>
                        )}
                        <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-purple-600 transition-colors flex-shrink-0" />
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-slate-500">
              Showing {(page - 1) * limit + 1}–
              {Math.min(page * limit, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
          </>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
