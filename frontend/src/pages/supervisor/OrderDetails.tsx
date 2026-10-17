/**
 * Supervisor Order Details Page
 * Full order detail with action buttons: Prepare, Pack (OTP), Assign Delivery
 */

import { useState, useEffect, useCallback } from "react";
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
  Banknote,
  ShieldCheck,
  BadgeCheck,
} from "lucide-react";
import { DashboardLayout } from "../../components/layout";
import { Button, Card, Badge, Skeleton } from "../../components/ui";
import { fadeVariants } from "../../utils/animations";
import { supervisorService } from "../../services/supervisor.service";
import { useSocketEvent } from "../../context/SocketContext";
import type { Notification } from "../../services/notification.service";
import toast from "react-hot-toast";

const STATUS_FLOW = [
  { key: "confirmed", label: "Confirmed", icon: AlertCircle, color: "text-blue-600", bg: "bg-blue-100" },
  { key: "preparing", label: "Preparing", icon: Clock, color: "text-amber-600", bg: "bg-amber-100" },
  { key: "packed", label: "Packed", icon: PackageCheck, color: "text-emerald-600", bg: "bg-emerald-100" },
  { key: "assigned", label: "Assigned", icon: UserCheck, color: "text-violet-600", bg: "bg-violet-100" },
  { key: "in_transit", label: "Out for Delivery", icon: Truck, color: "text-indigo-600", bg: "bg-indigo-100" },
  { key: "delivered", label: "Delivered", icon: CheckCircle, color: "text-green-600", bg: "bg-green-100" },
  { key: "completed", label: "Completed", icon: BadgeCheck, color: "text-emerald-700", bg: "bg-emerald-100" },
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
  const [cashReceived, setCashReceived] = useState(false);

  const loadOrder = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!id) return;
    try {
      if (!silent) setLoading(true);
      const res = await supervisorService.getOrderById(id);
      const data = res?.data;
      setOrder(data?.order || data);
    } catch (err) {
      console.error("Failed to load order:", err);
      toast.error("Failed to load order details");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);

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
  }, [loadOrder]);

  // Live refresh when a notification about this order arrives (OTP verified, delivered,
  // cash pending handover, ...)
  const handleNotification = useCallback(
    (n: Notification) => {
      if (id && n?.data?.orderId === id) loadOrder({ silent: true });
    },
    [id, loadOrder],
  );
  useSocketEvent<Notification>("notification:new", handleNotification);

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

  const [otpActionLoading, setOtpActionLoading] = useState(false);

  const handleRegeneratePickupOtp = async () => {
    if (!id) return;
    try {
      setOtpActionLoading(true);
      const res = await supervisorService.regeneratePickupOtp(id);
      const updatedOrder = res?.data?.order || res?.data;
      toast.success("Pickup OTP regenerated");
      setOrder(updatedOrder);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to regenerate pickup OTP");
    } finally {
      setOtpActionLoading(false);
    }
  };

  const handleRegenerateDeliveryOtp = async () => {
    if (!id) return;
    try {
      setOtpActionLoading(true);
      const res = await supervisorService.regenerateDeliveryOtp(id);
      const updatedOrder = res?.data?.order || res?.data;
      toast.success("Delivery OTP regenerated");
      setOrder(updatedOrder);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to regenerate delivery OTP");
    } finally {
      setOtpActionLoading(false);
    }
  };

  const handleCompleteOrder = async () => {
    if (!id) return;
    const cashPending = order?.cashHandoverStatus === "pending";
    if (cashPending && !cashReceived) {
      toast.error("Confirm you have received the cash from the delivery partner");
      return;
    }
    try {
      setActionLoading(true);
      await supervisorService.completeOrder(id, cashPending);
      toast.success(cashPending ? "Cash received — order marked complete" : "Order marked complete");
      setCashReceived(false);
      await loadOrder();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to complete order");
    } finally {
      setActionLoading(false);
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
          <Button variant="outline" size="sm" onClick={() => loadOrder()}>
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
            {["completed", "cancelled"].includes(order.orderStatus) && (
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

            {order.orderStatus === "in_transit" && (
              <p className="text-sm text-slate-500">
                Out for delivery — waiting for the partner to verify the buyer&apos;s OTP
                {order.deliveryOtpVerifiedAt ? " and collect payment" : ""}.
              </p>
            )}

            {order.orderStatus === "delivered" && (
              <p className="text-sm text-slate-500">
                Delivered. Mark the order complete below once everything is settled.
              </p>
            )}
          </div>
        </Card>

        {/* Pickup OTP Display */}
        {["packed", "assigned"].includes(order.orderStatus) && (() => {
          const isExpired =
            order.pickupOtp &&
            order.pickupOtpExpiresAt &&
            new Date(order.pickupOtpExpiresAt) < new Date();

          return (
            <Card
              className={`p-6 border-2 ${
                isExpired || !order.pickupOtp
                  ? "border-red-200 bg-red-50/50"
                  : "border-purple-200 bg-purple-50/50"
              }`}
            >
              <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isExpired || !order.pickupOtp ? "bg-red-100" : "bg-purple-100"
                    }`}
                  >
                    <KeyRound
                      className={`w-5 h-5 ${isExpired || !order.pickupOtp ? "text-red-600" : "text-purple-600"}`}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">Pickup OTP</h3>
                    <p className="text-xs text-slate-500">
                      {order.pickupOtp
                        ? "Share this with the delivery partner for verification"
                        : "No OTP generated yet"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegeneratePickupOtp}
                  disabled={otpActionLoading}
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  {otpActionLoading ? "Regenerating..." : "Regenerate OTP"}
                </Button>
              </div>

              {order.pickupOtp && (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    <div
                      className={`w-fit max-w-full break-all text-3xl sm:text-4xl font-mono font-bold tracking-[0.2em] sm:tracking-[0.3em] bg-white px-4 sm:px-6 py-3 rounded-xl border shadow-sm ${
                        isExpired ? "text-red-700 border-red-200" : "text-purple-700 border-purple-200"
                      }`}
                    >
                      {order.pickupOtp}
                    </div>
                    <Button variant="outline" size="sm" onClick={copyOtp} className="w-full sm:w-auto">
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                  {order.pickupOtpExpiresAt && (
                    <p className={`text-xs mt-3 ${isExpired ? "text-red-600 font-semibold" : "text-slate-500"}`}>
                      {isExpired ? "Expired on " : "Expires: "}
                      {new Date(order.pickupOtpExpiresAt).toLocaleString("en-IN")}
                    </p>
                  )}
                </>
              )}
            </Card>
          );
        })()}

        {/* Buyer Delivery OTP Display (assigned / in-transit, until verified at the door) */}
        {["assigned", "in_transit"].includes(order.orderStatus) && !order.deliveryOtpVerifiedAt && (() => {
          const isExpired =
            order.deliveryOtp &&
            order.deliveryOtpExpiresAt &&
            new Date(order.deliveryOtpExpiresAt) < new Date();

          return (
            <Card
              className={`p-6 border-2 ${
                isExpired || !order.deliveryOtp ? "border-red-200 bg-red-50/50" : "border-indigo-200 bg-indigo-50/50"
              }`}
            >
              <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isExpired || !order.deliveryOtp ? "bg-red-100" : "bg-indigo-100"
                    }`}
                  >
                    <KeyRound
                      className={`w-5 h-5 ${isExpired || !order.deliveryOtp ? "text-red-600" : "text-indigo-600"}`}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">Buyer Delivery OTP</h3>
                    <p className="text-xs text-slate-500">
                      {order.deliveryOtp
                        ? "Issued to the buyer at assignment. They share it with the partner on delivery."
                        : "No active OTP — regenerate to send the buyer a new one."}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerateDeliveryOtp}
                  disabled={otpActionLoading}
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  {otpActionLoading ? "Regenerating..." : "Regenerate OTP"}
                </Button>
              </div>
              {order.deliveryOtpExpiresAt && (
                <p className={`text-xs ${isExpired ? "text-red-600 font-semibold" : "text-slate-500"}`}>
                  {isExpired ? "Expired on " : "Expires: "}
                  {new Date(order.deliveryOtpExpiresAt).toLocaleString("en-IN")}
                </p>
              )}
            </Card>
          );
        })()}

        {/* OTP verified at the door — partner collecting COD cash */}
        {order.orderStatus === "in_transit" && order.deliveryOtpVerifiedAt && (
          <Card className="p-6 border-2 border-emerald-200 bg-emerald-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Buyer OTP Verified</h3>
                <p className="text-xs text-slate-500">
                  Verified {new Date(order.deliveryOtpVerifiedAt).toLocaleString("en-IN")}. The delivery
                  partner is collecting ₹{order.totalAmount?.toFixed?.(2) || order.totalAmount} cash.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Mark as Complete (delivered orders) */}
        {order.orderStatus === "delivered" && (() => {
          const cashPending = order.cashHandoverStatus === "pending";
          const partnerName =
            (order.deliveryPartner && typeof order.deliveryPartner === "object"
              ? order.deliveryPartner.name
              : order.deliveryPartnerName) || "the delivery partner";
          const amount = order.totalAmount?.toFixed?.(2) || order.totalAmount;

          return (
            <Card className={`p-6 border-2 ${cashPending ? "border-amber-300 bg-amber-50/60" : "border-emerald-200 bg-emerald-50/40"}`}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cashPending ? "bg-amber-100" : "bg-emerald-100"}`}>
                  {cashPending ? (
                    <Banknote className="w-5 h-5 text-amber-600" />
                  ) : (
                    <BadgeCheck className="w-5 h-5 text-emerald-600" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-800">
                    {cashPending ? "Collect Cash & Complete Order" : "Complete Order"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {cashPending
                      ? `Delivered (COD). ${partnerName} collected ₹${amount} from the buyer and must submit it to you.`
                      : "The order has been delivered and needs no cash handover."}
                  </p>
                </div>
              </div>

              {cashPending && (
                <label
                  className={`mt-4 flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                    cashReceived ? "border-emerald-400 bg-emerald-50" : "border-amber-300 bg-white"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={cashReceived}
                    onChange={(e) => setCashReceived(e.target.checked)}
                    className="mt-0.5 w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 shrink-0"
                    disabled={actionLoading}
                  />
                  <span className="text-sm">
                    <span className="font-bold text-slate-800 block">
                      I have received ₹{amount} cash from {partnerName}.
                    </span>
                    <span className="text-slate-500">
                      This marks the order as paid and completed, and notifies the buyer and the partner.
                    </span>
                  </span>
                </label>
              )}

              <Button
                onClick={handleCompleteOrder}
                disabled={actionLoading || (cashPending && !cashReceived)}
                className="mt-4 w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white border-0"
              >
                <BadgeCheck className="w-4 h-4 mr-2" />
                {actionLoading ? "Completing..." : "Mark Order as Complete"}
              </Button>
            </Card>
          );
        })()}

        {order.orderStatus === "completed" && order.cashHandoverStatus === "collected" && (
          <Card className="p-4 border border-emerald-200 bg-emerald-50/40 text-sm text-emerald-800 flex items-center gap-2">
            <BadgeCheck className="w-4 h-4 shrink-0" />
            Cash received from the delivery partner
            {order.cashHandoverAt ? ` on ${new Date(order.cashHandoverAt).toLocaleString("en-IN")}` : ""}.
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
