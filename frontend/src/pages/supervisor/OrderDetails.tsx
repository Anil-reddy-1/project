/**
 * Supervisor Order Details Page
 * Full order detail with action buttons: Prepare, Pack (OTP), Assign Delivery
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle,
  PackageCheck,
  Truck,
  KeyRound,
  UserCheck,
  AlertCircle,
  Copy,
  RefreshCw,
} from "lucide-react";
import { DashboardLayout } from "../../components/layout";
import { Button, Card, Badge, Skeleton } from "../../components/ui";
import { fadeVariants } from "../../utils/animations";
import { supervisorService } from "../../services/supervisor.service";
import toast from "react-hot-toast";

const STATUS_FLOW = [
  { key: "confirmed", label: "Confirmed", icon: AlertCircle, color: "text-blue-600", bg: "bg-blue-100" },
  { key: "preparing", label: "Preparing", icon: Clock, color: "text-amber-600", bg: "bg-amber-100" },
  { key: "packed", label: "Packed", icon: PackageCheck, color: "text-emerald-600", bg: "bg-emerald-100" },
  { key: "assigned", label: "Assigned", icon: Truck, color: "text-violet-600", bg: "bg-violet-100" },
  { key: "delivered", label: "Delivered", icon: CheckCircle, color: "text-green-600", bg: "bg-green-100" },
];

export function SupervisorOrderDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [partners, setPartners] = useState<any[]>([]);
  const [selectedPartner, setSelectedPartner] = useState("");
  const [showAssignPanel, setShowAssignPanel] = useState(false);

  const loadOrder = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await supervisorService.getOrderById(id);
      const data = res?.data;
      setOrder(data?.order || data);
    } catch (err) {
      console.error("Failed to load order:", err);
      toast.error("Failed to load order details");
    } finally {
      setLoading(false);
    }
  };

  const loadPartners = async () => {
    try {
      const list = await supervisorService.getAvailablePartners();
      setPartners(list);
    } catch (err) {
      console.error("Failed to load partners:", err);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [id]);

  const handlePrepare = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      await supervisorService.markAsPreparing(id);
      toast.success("Order marked as preparing!");
      await loadOrder();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to mark as preparing");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePack = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      const res = await supervisorService.markAsPacked(id);
      const updatedOrder = res?.data?.order || res?.data;
      toast.success("Order packed! OTP generated for delivery partner.");
      setOrder(updatedOrder);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to mark as packed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignDelivery = async () => {
    if (!id || !selectedPartner) {
      toast.error("Please select a delivery partner");
      return;
    }
    try {
      setActionLoading(true);
      await supervisorService.assignDeliveryPartner(id, selectedPartner);
      toast.success("Delivery partner assigned successfully!");
      setShowAssignPanel(false);
      setSelectedPartner("");
      await loadOrder();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to assign delivery partner");
    } finally {
      setActionLoading(false);
    }
  };

  const copyOtp = () => {
    if (order?.pickupOtp) {
      navigator.clipboard.writeText(order.pickupOtp);
      toast.success("OTP copied to clipboard");
    }
  };

  const getStatusIndex = (status: string) => {
    return STATUS_FLOW.findIndex((s) => s.key === status);
  };

  if (loading) {
    return (
      <DashboardLayout title="Order Details" subtitle="Loading...">
        <div className="py-2 space-y-6">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout title="Order Details" subtitle="Not found">
        <Card className="p-12 text-center">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">
            Order not found
          </h3>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate("/supervisor/orders")}
          >
            Back to Orders
          </Button>
        </Card>
      </DashboardLayout>
    );
  }

  const currentStatusIdx = getStatusIndex(order.orderStatus);

  return (
    <DashboardLayout
      title={`Order ${order.orderNumber ? `#${order.orderNumber}` : ""}`}
      subtitle="Order details and actions"
    >
      <motion.div
        className="py-2 space-y-6"
        variants={fadeVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Back Button */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/supervisor/orders")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </Button>
          <Button variant="outline" size="sm" onClick={loadOrder}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Status Progress Bar */}
        <Card className="p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Order Progress</h3>
          <div className="flex items-center justify-between relative">
            {/* Connection line */}
            <div className="absolute top-5 left-8 right-8 h-0.5 bg-slate-200 z-0" />
            <div
              className="absolute top-5 left-8 h-0.5 bg-purple-500 z-0 transition-all duration-500"
              style={{
                width: `${Math.max(0, currentStatusIdx / (STATUS_FLOW.length - 1)) * (100 - 10)}%`,
              }}
            />

            {STATUS_FLOW.map((step, idx) => {
              const Icon = step.icon;
              const isActive = idx <= currentStatusIdx;
              const isCurrent = step.key === order.orderStatus;
              return (
                <div
                  key={step.key}
                  className="flex flex-col items-center relative z-10"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isCurrent
                        ? `${step.bg} ring-2 ring-offset-2 ring-purple-500`
                        : isActive
                          ? step.bg
                          : "bg-slate-100"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${
                        isActive ? step.color : "text-slate-400"
                      }`}
                    />
                  </div>
                  <span
                    className={`text-xs mt-2 font-medium ${
                      isCurrent
                        ? "text-purple-700"
                        : isActive
                          ? "text-slate-700"
                          : "text-slate-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Action Buttons */}
        <Card className="p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Actions</h3>

          <div className="flex flex-wrap gap-3">
            {/* Prepare Button */}
            {order.orderStatus === "confirmed" && (
              <Button
                onClick={handlePrepare}
                disabled={actionLoading}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
              >
                <Clock className="w-4 h-4 mr-2" />
                {actionLoading ? "Processing..." : "Start Preparing"}
              </Button>
            )}

            {/* Pack Button */}
            {order.orderStatus === "preparing" && (
              <Button
                onClick={handlePack}
                disabled={actionLoading}
                className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white border-0"
              >
                <PackageCheck className="w-4 h-4 mr-2" />
                {actionLoading ? "Packing..." : "Mark as Packed"}
              </Button>
            )}

            {/* Assign Delivery Button */}
            {(order.orderStatus === "packed" ||
              order.orderStatus === "confirmed" ||
              order.orderStatus === "preparing") && (
              <Button
                variant="outline"
                onClick={() => {
                  setShowAssignPanel(true);
                  loadPartners();
                }}
                disabled={actionLoading}
              >
                <UserCheck className="w-4 h-4 mr-2" />
                Assign Delivery Partner
              </Button>
            )}

            {/* Terminal status */}
            {["delivered", "completed", "cancelled"].includes(
              order.orderStatus
            ) && (
              <Badge
                variant={
                  order.orderStatus === "cancelled"
                    ? ("destructive" as any)
                    : ("success" as any)
                }
              >
                {order.orderStatus.charAt(0).toUpperCase() +
                  order.orderStatus.slice(1)}
              </Badge>
            )}
          </div>
        </Card>

        {/* OTP Display */}
        {order.pickupOtp && (
          <Card className="p-6 border-2 border-purple-200 bg-purple-50/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Pickup OTP</h3>
                <p className="text-xs text-slate-500">
                  Share this with the delivery partner for verification
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-mono font-bold text-purple-700 tracking-[0.3em] bg-white px-6 py-3 rounded-xl border border-purple-200 shadow-sm">
                {order.pickupOtp}
              </div>
              <Button variant="outline" size="sm" onClick={copyOtp}>
                <Copy className="w-4 h-4 mr-1" />
                Copy
              </Button>
            </div>
            {order.pickupOtpExpiresAt && (
              <p className="text-xs text-slate-500 mt-3">
                Expires:{" "}
                {new Date(order.pickupOtpExpiresAt).toLocaleString("en-IN")}
              </p>
            )}
          </Card>
        )}

        {/* Assign Delivery Panel */}
        {showAssignPanel && (
          <Card className="p-6 border-2 border-violet-200 bg-violet-50/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">
                Assign Delivery Partner
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAssignPanel(false)}
              >
                Cancel
              </Button>
            </div>

            {partners.length === 0 ? (
              <div className="text-center py-6">
                <Truck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">
                  No active delivery partners available
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Partners will be notified when they come online
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <select
                  value={selectedPartner}
                  onChange={(e) => setSelectedPartner(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white"
                >
                  <option value="">Select a delivery partner...</option>
                  {partners.map((p) => (
                    <option key={p.id || p.userId} value={p.id || p.userId}>
                      {p.name || p.email || p.id}
                    </option>
                  ))}
                </select>
                <Button
                  onClick={handleAssignDelivery}
                  disabled={actionLoading || !selectedPartner}
                  className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white border-0"
                >
                  <UserCheck className="w-4 h-4 mr-2" />
                  {actionLoading ? "Assigning..." : "Assign Partner"}
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* Order Summary */}
        <Card className="p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Order Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <DetailRow label="Order Number" value={order.orderNumber || "—"} />
              <DetailRow label="Order ID" value={order.id || "—"} />
              <DetailRow label="Status" value={
                <Badge variant={
                  order.orderStatus === "confirmed" ? "info" as any :
                  order.orderStatus === "preparing" ? "warning" as any :
                  order.orderStatus === "packed" ? "success" as any :
                  order.orderStatus === "cancelled" ? "destructive" as any :
                  "default" as any
                }>
                  {order.orderStatus?.charAt(0).toUpperCase() + order.orderStatus?.slice(1)}
                </Badge>
              } />
              <DetailRow
                label="Total Amount"
                value={`₹${order.totalAmount?.toFixed?.(2) || order.totalAmount}`}
              />
              <DetailRow label="Payment Method" value={order.paymentMethod || "COD"} />
              <DetailRow label="Payment Status" value={order.paymentStatus || "—"} />
            </div>
            <div className="space-y-3">
              <DetailRow
                label="Created"
                value={new Date(order.createdAt).toLocaleString("en-IN")}
              />
              <DetailRow
                label="Updated"
                value={
                  order.updatedAt
                    ? new Date(order.updatedAt).toLocaleString("en-IN")
                    : "—"
                }
              />
              {order.customerName && (
                <DetailRow label="Customer" value={order.customerName} />
              )}
              {(order.deliveryPartnerId || order.deliveryPartner) && (
                <DetailRow label="Delivery Partner" value={
                  (order.deliveryPartner && typeof order.deliveryPartner === 'object') ? order.deliveryPartner.name : 
                  (order.deliveryPartnerName || order.deliveryPartnerId || order.deliveryPartner)
                } />
              )}
              {order.notes && <DetailRow label="Notes" value={order.notes} />}
            </div>
          </div>
        </Card>

        {/* Order Items */}
        {order.items && order.items.length > 0 && (
          <Card className="p-6">
            <h3 className="font-semibold text-slate-800 mb-4">
              Items ({order.items.length})
            </h3>
            <div className="divide-y divide-slate-100">
              {order.items.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="py-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Package className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 text-sm">
                        {item.productName || item.name || "Product"}
                      </p>
                      <p className="text-xs text-slate-500">
                        Qty: {item.quantity}{" "}
                        {item.unit && `× ${item.unit}`}
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold text-slate-800">
                    ₹{(item.subtotal || item.price * item.quantity)?.toFixed?.(2)}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Delivery Address */}
        {order.deliveryAddress && (
          <Card className="p-6">
            <h3 className="font-semibold text-slate-800 mb-3">
              Delivery Address
            </h3>
            <p className="text-sm text-slate-600">
              {typeof order.deliveryAddress === "string"
                ? order.deliveryAddress
                : [
                    order.deliveryAddress.addressLine1,
                    order.deliveryAddress.addressLine2,
                    order.deliveryAddress.city,
                    order.deliveryAddress.state,
                    order.deliveryAddress.pincode,
                  ]
                    .filter(Boolean)
                    .join(", ")}
            </p>
          </Card>
        )}
      </motion.div>
    </DashboardLayout>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-sm text-slate-500 shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-800 text-right">
        {value}
      </span>
    </div>
  );
}
