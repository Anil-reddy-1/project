/**
 * Delivery Details Page (Delivery Partner)
 * Clean, modern view for managing individual delivery with step-based actions
 */

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  Phone,
  User,
  Clock,
  CheckCircle,
  Truck,
  FileText,
  Package,
  Navigation,
  ShoppingBag,
  CreditCard,
  Banknote,
} from "lucide-react";
import { DashboardLayout } from "../../components/layout";
import { useDeliveries } from "../../hooks/useDeliveries";
import { Button, Card, Skeleton, Alert, Separator } from "../../components/ui";
import { fadeVariants } from "../../utils/animations";
import { formatDateTime } from "../../utils/date";
import { showErrorToast } from "../../utils/toast";
import type { Delivery } from "../../services/delivery.service";

const DELIVERY_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: any; gradient: string }
> = {
  pending: {
    label: "Pending",
    color: "gray",
    icon: Clock,
    gradient: "from-slate-400 to-slate-500",
  },
  assigned: {
    label: "Assigned to You",
    color: "yellow",
    icon: Clock,
    gradient: "from-amber-400 to-orange-500",
  },
  accepted: {
    label: "Accepted",
    color: "blue",
    icon: CheckCircle,
    gradient: "from-blue-400 to-indigo-500",
  },
  in_transit: {
    label: "In Transit",
    color: "purple",
    icon: Truck,
    gradient: "from-violet-400 to-purple-500",
  },
  delivered: {
    label: "Delivered",
    color: "green",
    icon: CheckCircle,
    gradient: "from-emerald-400 to-green-500",
  },
  failed: {
    label: "Failed",
    color: "red",
    icon: Clock,
    gradient: "from-red-400 to-red-500",
  },
};

const STEPS = [
  { key: "assigned", label: "Assigned", icon: Package },
  { key: "accepted", label: "Accepted", icon: CheckCircle },
  { key: "in_transit", label: "In Transit", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle },
];

function getStepIndex(status: string): number {
  const idx = STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : -1;
}

export function DeliveryDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getDeliveryById, acceptDelivery, startDelivery, completeDelivery } =
    useDeliveries({
      autoLoad: false,
    });

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [notes, setNotes] = useState("");
  const [pickupOtp, setPickupOtp] = useState("");
  const [deliveryOtp, setDeliveryOtp] = useState("");

  const loadDelivery = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const deliveryData = await getDeliveryById(id);
    setDelivery(deliveryData);
    setLoading(false);
  }, [id, getDeliveryById]);

  useEffect(() => {
    let mounted = true;
    const fetchDelivery = async () => {
      if (!id) return;
      if (mounted) setLoading(true);
      const deliveryData = await getDeliveryById(id);
      if (mounted) {
        setDelivery(deliveryData);
        setLoading(false);
      }
    };
    fetchDelivery();
    return () => {
      mounted = false;
    };
  }, [id, getDeliveryById]);

  const handleAction = async (action: "accept" | "start" | "complete") => {
    if (!delivery) return;

    if (action === "start" && !pickupOtp.trim()) {
      showErrorToast("Please enter the Pickup OTP");
      return;
    }

    if (action === "complete") {
      if (!deliveryOtp.trim()) {
        showErrorToast("Please enter the Buyer Delivery OTP");
        return;
      }
      if (
        !window.confirm(
          "Are you sure you want to verify the buyer OTP and mark this delivery as completed?",
        )
      )
        return;
    }

    setUpdating(true);
    const success = await (action === "accept" 
      ? acceptDelivery(delivery.id, notes || undefined)
      : action === "start" 
      ? startDelivery(delivery.id, notes || undefined, pickupOtp)
      : completeDelivery(delivery.id, notes || undefined, deliveryOtp));
    if (success) {
      await loadDelivery();
      setNotes("");
      setPickupOtp("");
      setDeliveryOtp("");
    }
    setUpdating(false);
  };

  // Loading state
  if (loading) {
    return (
      <DashboardLayout
        title="Delivery Details"
        subtitle="View delivery information"
      >
        <div className="max-w-5xl mx-auto py-2 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-20" />
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <Skeleton className="h-64" />
              <Skeleton className="h-48" />
            </div>
            <Skeleton className="h-96" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Not found
  if (!delivery) {
    return (
      <DashboardLayout
        title="Delivery Details"
        subtitle="View delivery information"
      >
        <div className="max-w-5xl mx-auto py-8">
          <Alert variant="destructive">
            Delivery not found or you don't have permission to view it.
          </Alert>
          <Button
            onClick={() => navigate("/delivery/deliveries")}
            className="mt-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Deliveries
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const statusConfig =
    DELIVERY_STATUS_CONFIG[delivery.status] || DELIVERY_STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;
  const currentStep = getStepIndex(delivery.status);
  const canAccept = delivery.status === "assigned";
  const canStart = delivery.status === "accepted";
  const canComplete = delivery.status === "in_transit";
  const isCompleted = delivery.status === "delivered";

  const hasCoordinates = delivery.deliveryAddress.lat !== undefined && delivery.deliveryAddress.lng !== undefined;
  
  const mapsCoordinatesUrl = hasCoordinates
    ? `https://www.google.com/maps/search/?api=1&query=${delivery.deliveryAddress.lat},${delivery.deliveryAddress.lng}`
    : '';

  const mapsAddressUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${delivery.deliveryAddress.addressLine1}, ${delivery.deliveryAddress.city}, ${delivery.deliveryAddress.state} ${delivery.deliveryAddress.postalCode}`,
  )}`;

  return (
    <DashboardLayout
      title="Delivery Details"
      subtitle={
        delivery.orderNumber ? `Order #${delivery.orderNumber}` : "Delivery"
      }
    >
      <motion.div
        className="max-w-5xl mx-auto py-2 space-y-6"
        variants={fadeVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <Button
              variant="ghost"
              onClick={() => navigate("/delivery/deliveries")}
              className="mb-2 -ml-3"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <h1 className="text-2xl font-bold text-slate-800">
              {delivery.orderNumber
                ? `Order #${delivery.orderNumber}`
                : `Delivery #${delivery.id.slice(0, 8)}`}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {delivery.assignedAt
                ? `Assigned on ${formatDateTime(delivery.assignedAt)}`
                : "Recently assigned"}
            </p>
          </div>
          <div
            className={`px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r ${statusConfig.gradient} text-white font-semibold text-sm shadow-lg`}
          >
            <StatusIcon className="w-4 h-4 inline mr-2" />
            {statusConfig.label}
          </div>
        </div>

        {/* Progress Steps */}
        <Card className="p-6">
          <div className="flex items-start sm:items-center justify-between relative overflow-x-auto pb-1">
            {/* Connection line */}
            <div className="absolute top-5 left-10 right-10 h-0.5 bg-slate-200" />
            <div
              className="absolute top-5 left-10 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
              style={{
                width: `${Math.max(0, (currentStep / (STEPS.length - 1)) * (100 - 10))}%`,
              }}
            />

            {STEPS.map((step, idx) => {
              const StepIcon = step.icon;
              const isActive = idx <= currentStep;
              const isCurrent = idx === currentStep;

              return (
                <div
                  key={step.key}
                  className="relative z-10 flex min-w-[72px] flex-col items-center"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isCurrent
                        ? "bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-lg ring-4 ring-blue-100"
                        : isActive
                          ? "bg-green-500 text-white"
                          : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    <StepIcon className="w-5 h-5" />
                  </div>
                  <span
                    className={`text-xs mt-2 font-medium ${
                      isCurrent
                        ? "text-blue-600"
                        : isActive
                          ? "text-green-600"
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

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Information */}
            <Card>
              <div className="p-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-800">
                    Customer
                  </h2>
                </div>
              </div>
              <div className="p-5">
                <div className="flex flex-wrap gap-6">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">
                      Name
                    </p>
                    <p className="font-semibold text-slate-800 text-lg mt-0.5">
                      {delivery.customerName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">
                      Phone
                    </p>
                    <a
                      href={`tel:${delivery.customerPhone}`}
                      className="flex items-center gap-2 font-semibold text-blue-600 hover:text-blue-700 text-lg mt-0.5"
                    >
                      <Phone className="w-4 h-4" />
                      {delivery.customerPhone}
                    </a>
                  </div>
                </div>
              </div>
            </Card>

            {/* Delivery Address */}
            <Card>
              <div className="p-5 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-slate-800">
                      Delivery Address
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasCoordinates && (
                      <a
                        href={mapsCoordinatesUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-xl text-sm font-semibold transition-colors"
                        title="Navigate to exact coordinates"
                      >
                        <Navigation className="w-4 h-4" />
                        By Coordinates
                      </a>
                    )}
                    <a
                      href={mapsAddressUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-sm font-semibold transition-colors"
                      title="Navigate to address"
                    >
                      <MapPin className="w-4 h-4" />
                      By Address
                    </a>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <div className="space-y-1">
                  <p className="font-semibold text-slate-800">
                    {delivery.deliveryAddress.name}
                  </p>
                  <p className="text-sm text-slate-600">
                    {delivery.deliveryAddress.phone}
                  </p>
                  <Separator className="my-3" />
                  <p className="text-sm text-slate-600">
                    {delivery.deliveryAddress.addressLine1}
                  </p>
                  {delivery.deliveryAddress.addressLine2 && (
                    <p className="text-sm text-slate-600">
                      {delivery.deliveryAddress.addressLine2}
                    </p>
                  )}
                  <p className="text-sm text-slate-600">
                    {delivery.deliveryAddress.city},{" "}
                    {delivery.deliveryAddress.state}{" "}
                    {delivery.deliveryAddress.postalCode}
                  </p>
                  
                  {hasCoordinates && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Exact Coordinates
                      </p>
                      <p className="text-sm text-slate-700 font-mono bg-slate-50 p-2 rounded border border-slate-100 inline-block">
                        {delivery.deliveryAddress.lat}, {delivery.deliveryAddress.lng}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Order Items */}
            {delivery.orderItems && delivery.orderItems.length > 0 && (
              <Card>
                <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-800">
                        Order Items
                      </h2>
                      <p className="text-xs text-slate-500">
                        {delivery.orderItems.length} {delivery.orderItems.length === 1 ? 'item' : 'items'} in this order
                      </p>
                    </div>
                  </div>
                  {delivery.totalAmount !== undefined && (
                    <span className="font-bold text-slate-800 text-lg">
                      Total: ₹{delivery.totalAmount.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
                <div className="divide-y divide-slate-100">
                  {delivery.orderItems.map((item) => (
                    <div key={item.id} className="p-4 flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-800 text-sm truncate">
                          {item.productName}
                        </p>
                        {item.productSku && (
                          <p className="text-xs text-slate-400 font-mono mt-0.5">
                            SKU: {item.productSku}
                          </p>
                        )}
                        <p className="text-xs text-slate-500 mt-1">
                          Qty: <span className="font-semibold text-slate-700">{item.quantity}</span> × ₹{item.unitPrice.toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-slate-800 text-sm">
                          ₹{item.totalPrice.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Delivery Notes */}
            {delivery.notes && (
              <Card>
                <div className="p-5 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-amber-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-slate-800">
                      Delivery Notes
                    </h2>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {delivery.notes}
                  </p>
                </div>
              </Card>
            )}
          </div>

          {/* Right Column - Actions & Timeline */}
          <div className="lg:col-span-1 space-y-6">
            {/* Amount to Collect / Payment Info Card */}
            <Card className="overflow-hidden border border-slate-200 shadow-sm">
              {(() => {
                const total = delivery.totalAmount ?? delivery.orderAmount ?? 0;
                const isCOD = (delivery.paymentMethod || '').toLowerCase() === 'cod' || 
                              (delivery.paymentMethod || '').toLowerCase().includes('cash');
                const isPaid = (delivery.paymentStatus || '').toLowerCase() === 'paid';
                const needCollection = isCOD && !isPaid;

                return (
                  <div>
                    <div className={`p-5 ${
                      needCollection 
                        ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-inner' 
                        : isPaid 
                          ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-inner' 
                          : 'bg-gradient-to-br from-slate-800 to-slate-900 text-white'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-wider font-semibold opacity-90 flex items-center gap-1.5">
                          {needCollection ? (
                            <>
                              <Banknote className="w-4 h-4" />
                              Amount to Collect
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-4 h-4" />
                              Payment Status
                            </>
                          )}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 uppercase tracking-wide">
                          {delivery.paymentMethod || 'COD'}
                        </span>
                      </div>
                      <div className="mt-3 flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold tracking-tight">
                          ₹{total.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <p className="text-xs opacity-95 mt-2 font-medium">
                        {needCollection 
                          ? '⚠️ Cash on Delivery: Collect ₹' + total.toLocaleString('en-IN') + ' from customer' 
                          : isPaid 
                            ? '✓ Order is Prepaid Online. Do NOT collect any cash.' 
                            : `Payment Status: ${delivery.paymentStatus || 'Pending'}`}
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 divide-y divide-slate-100 text-xs">
                      <div className="pb-2.5 flex items-center justify-between text-slate-600">
                        <span>Payment Mode</span>
                        <span className="font-bold text-slate-800 uppercase">
                          {delivery.paymentMethod || 'COD'}
                        </span>
                      </div>
                      <div className="pt-2.5 flex items-center justify-between text-slate-600">
                        <span>Payment Status</span>
                        <span className={`font-bold uppercase px-2 py-0.5 rounded ${
                          isPaid 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {delivery.paymentStatus || 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </Card>

            {/* Action Card */}
            {!isCompleted && (canAccept || canStart || canComplete) && (
              <Card className="overflow-hidden">
                <div
                  className={`p-5 bg-gradient-to-r ${statusConfig.gradient} text-white`}
                >
                  <h2 className="text-lg font-bold">
                    {canAccept
                      ? "Accept This Delivery"
                      : canStart
                        ? "Ready to Go?"
                        : "Almost There!"}
                  </h2>
                  <p className="text-sm opacity-90 mt-1">
                    {canAccept
                      ? "Confirm you can make this delivery"
                      : canStart
                        ? "Start navigating to the customer"
                        : "Mark as delivered when done"}
                  </p>
                </div>
                <div className="p-5 space-y-4">
                  {/* Notes Input */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any notes..."
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
                      rows={2}
                      disabled={updating}
                    />
                  </div>

                  {/* Action Button */}
                  {canAccept && (
                    <Button
                      onClick={() => handleAction("accept")}
                      disabled={updating}
                      className="w-full h-12 text-base bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 border-0"
                    >
                      {updating ? "Accepting..." : "✓ Accept Delivery"}
                    </Button>
                  )}

                  {canStart && (
                    <div className="space-y-4 pt-2 border-t border-slate-100">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          Pickup OTP
                        </label>
                        <p className="text-xs text-slate-500 mb-2">
                          Ask the supervisor for the 6-digit Pickup OTP.
                        </p>
                        <input
                          type="text"
                          value={pickupOtp}
                          onChange={(e) => setPickupOtp(e.target.value)}
                          placeholder="Enter 6-digit OTP"
                          maxLength={6}
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-xl tracking-[0.5em] font-mono"
                          disabled={updating}
                        />
                      </div>
                      <Button
                        onClick={() => handleAction("start")}
                        disabled={updating || pickupOtp.length < 6}
                        className="w-full h-12 text-base bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 border-0"
                      >
                        {updating ? "Verifying..." : "🚚 Verify OTP & Start"}
                      </Button>
                    </div>
                  )}

                  {canComplete && (
                    <div className="space-y-4 pt-2 border-t border-slate-100">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">
                          Buyer Delivery OTP
                        </label>
                        <p className="text-xs text-slate-500 mb-2">
                          Ask the buyer for the 6-digit OTP shown on their order screen to confirm delivery.
                        </p>
                        <input
                          type="text"
                          value={deliveryOtp}
                          onChange={(e) => setDeliveryOtp(e.target.value)}
                          placeholder="Enter 6-digit OTP"
                          maxLength={6}
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-center text-xl tracking-[0.5em] font-mono font-bold"
                          disabled={updating}
                        />
                      </div>
                      <Button
                        onClick={() => handleAction("complete")}
                        disabled={updating || deliveryOtp.length < 6}
                        className="w-full h-12 text-base bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 border-0 shadow-md"
                      >
                        {updating ? "Verifying & Completing..." : "📦 Verify OTP & Complete Delivery"}
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Completed Success */}
            {isCompleted && (
              <Card className="overflow-hidden">
                <div className="p-6 bg-gradient-to-br from-emerald-500 to-green-500 text-white text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-xl">Delivery Completed!</h3>
                  <p className="text-sm opacity-90 mt-1">Great work! 🎉</p>
                </div>
                {delivery.deliveredAt && (
                  <div className="p-4 text-center">
                    <p className="text-xs text-slate-500">Delivered at</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {formatDateTime(delivery.deliveredAt)}
                    </p>
                  </div>
                )}
              </Card>
            )}

            {/* Timeline */}
            <Card>
              <div className="p-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-slate-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-800">
                    Timeline
                  </h2>
                </div>
              </div>
              <div className="p-5">
                <div className="space-y-0">
                  {[
                    {
                      time: delivery.assignedAt,
                      label: "Assigned",
                      color: "bg-amber-500",
                    },
                    {
                      time: delivery.acceptedAt,
                      label: "Accepted",
                      color: "bg-blue-500",
                    },
                    {
                      time: delivery.startedAt,
                      label: "Started",
                      color: "bg-purple-500",
                    },
                    {
                      time: delivery.deliveredAt,
                      label: "Delivered",
                      color: "bg-green-500",
                    },
                  ]
                    .filter((item) => item.time)
                    .map((item, idx, arr) => (
                      <div key={item.label} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-3 h-3 rounded-full ${item.color} ring-4 ring-white`}
                          />
                          {idx < arr.length - 1 && (
                            <div className="w-0.5 h-8 bg-slate-200" />
                          )}
                        </div>
                        <div className="pb-6">
                          <p className="text-sm font-semibold text-slate-800">
                            {item.label}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatDateTime(item.time!)}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
