/**
 * Order Details Page (Buyer)
 * View complete order information including items, delivery status, and timeline
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Package, MapPin, CreditCard, FileText, 
  Clock, CheckCircle, Truck, XCircle, User, Phone,
  ExternalLink, Image as ImageIcon, KeyRound, Copy
} from 'lucide-react';
import { DashboardLayout } from '../../components/layout';
import { useOrders } from '../../hooks/useOrders';
import { 
  Button, Card, Badge, Skeleton, Alert, Separator 
} from '../../components/ui';
import { fadeVariants } from '../../utils/animations';
import { formatDateTime } from '../../utils/date';
import { showSuccessToast } from '../../utils/toast';
import { addressService } from '../../services/address.service';
import { formatCoordinatesWithLabels } from '../../utils/geolocation';
import type { Order } from '../../services/order.service';

const ORDER_STATUS_CONFIG: Record<string, { label: string, color: string, icon: any }> = {
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

const BUYER_STEPS = [
  { key: 'placed', label: 'Order Placed', icon: Clock },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { key: 'in_transit', label: 'In Transit', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle },
];

function getBuyerStepIndex(status: string): number {
  if (['delivered', 'completed'].includes(status)) return 3;
  if (['assigned', 'in_transit', 'out_for_delivery'].includes(status)) return 2;
  if (['confirmed', 'preparing', 'packed'].includes(status)) return 1;
  if (['pending'].includes(status)) return 0;
  return -1;
}

export function OrderDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getOrderById } = useOrders({ autoLoad: false });
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrder = async () => {
      if (!id) return;
      
      setLoading(true);
      const orderData = await getOrderById(id);
      setOrder(orderData);
      setLoading(false);
    };
    
    loadOrder();
  }, [id, getOrderById]);

  // Loading state
  if (loading) {
    return (
      <DashboardLayout title="Order Details" subtitle="View order information">
        <div className="max-w-5xl mx-auto py-2 space-y-6">
          <Skeleton className="h-8 w-48" />
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
  if (!order) {
    return (
      <DashboardLayout title="Order Details" subtitle="View order information">
        <div className="max-w-5xl mx-auto py-8">
          <Alert variant="destructive">
            Order not found or you don't have permission to view it.
          </Alert>
          <Button
            onClick={() => navigate('/buyer/orders')}
            className="mt-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Orders
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const statusConfig = ORDER_STATUS_CONFIG[order.orderStatus] || { label: order.orderStatus || 'Unknown', color: 'gray', icon: Package };
  const paymentConfig = PAYMENT_STATUS_CONFIG[order.paymentStatus] || { label: order.paymentStatus || 'Unknown', color: 'gray' };
  const StatusIcon = statusConfig.icon;
  
  const subtotal = order.items.reduce((sum, item) => sum + item.totalPrice, 0);

  return (
    <DashboardLayout title="Order Details" subtitle={`Order #${order.orderNumber}`}>
      <motion.div 
        className="max-w-5xl mx-auto py-2 space-y-6"
        variants={fadeVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              onClick={() => navigate('/buyer/orders')}
              className="mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Orders
            </Button>
            <h1 className="text-2xl font-bold text-slate-800">Order #{order.orderNumber}</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Placed on {formatDateTime(order.createdAt)}
            </p>
          </div>
          <div className="text-right">
            <Badge variant={statusConfig.color as any} className="mb-2">
              {statusConfig.label}
            </Badge>
            <p className="text-sm text-slate-500">Order ID: {order.id.slice(0, 8)}...</p>
          </div>
        </div>

        {/* Visual Progress Stepper */}
        {order.orderStatus !== 'cancelled' && (
          <Card className="p-6 rounded-3xl border border-slate-200/80 shadow-sm bg-white overflow-hidden">
            <div className="flex items-start sm:items-center justify-between relative overflow-x-auto pb-1">
              <div className="absolute top-5 left-10 right-10 h-0.5 bg-slate-100" />
              <div
                className="absolute top-5 left-10 h-0.5 bg-gradient-to-r from-indigo-500 to-violet-600 transition-all duration-500"
                style={{
                  width: `${Math.max(0, (getBuyerStepIndex(order.orderStatus) / (BUYER_STEPS.length - 1)) * (100 - 15))}%`,
                }}
              />

              {BUYER_STEPS.map((step, idx) => {
                const StepIcon = step.icon;
                const currentStep = getBuyerStepIndex(order.orderStatus);
                const isActive = idx <= currentStep;
                const isCurrent = idx === currentStep;

                return (
                  <div key={step.key} className="relative z-10 flex min-w-[72px] flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                        isCurrent
                          ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30 ring-4 ring-indigo-50"
                          : isActive
                            ? "bg-emerald-500 text-white shadow-sm"
                            : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      <StepIcon className="w-5 h-5" />
                    </div>
                    <span
                      className={`text-xs mt-2 font-bold tracking-tight ${
                        isCurrent
                          ? "text-indigo-600"
                          : isActive
                            ? "text-emerald-600"
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
        )}

        {/* Delivery Verification OTP for Buyer */}
        {order.deliveryOtp && (
          <Card className="overflow-hidden border border-indigo-200/80 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 text-white rounded-3xl shadow-xl">
            <div className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-md">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-white text-lg tracking-tight">Delivery Verification OTP</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      Share with Partner
                    </span>
                  </div>
                  <p className="text-sm text-slate-300">
                    Share this 6-digit secure OTP with the delivery partner upon arrival to confirm receipt.
                  </p>
                  {order.deliveryOtpExpiresAt && (
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Valid until {formatDateTime(order.deliveryOtpExpiresAt)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20 shadow-inner self-start sm:self-auto">
                  <span className="font-mono text-3xl font-black tracking-[0.3em] text-white">
                    {order.deliveryOtp}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (order?.deliveryOtp) {
                        navigator.clipboard.writeText(order.deliveryOtp);
                        showSuccessToast("Delivery OTP copied to clipboard");
                      }
                    }}
                    title="Copy OTP"
                    className="text-white/80 hover:text-white hover:bg-white/10 ml-1 rounded-xl"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <Card className="rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden bg-white">
              <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/60">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Package className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold text-slate-800">Order Items ({order.items.length})</h2>
              </div>
              <div className="p-6 divide-y divide-slate-100">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0 items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 text-sm">{item.productName}</h3>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">SKU: {item.productSku}</p>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">Qty: {item.quantity}</span>
                        <span>×</span>
                        <span className="font-semibold text-slate-800">₹{item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-slate-900 text-sm">
                        ₹{item.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Delivery Address */}
            <Card>
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-slate-600" />
                  <h2 className="text-lg font-semibold text-slate-800">Delivery Address</h2>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {/* Basic Address Info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-500" />
                    <p className="font-semibold text-slate-800">{order.deliveryAddress.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-500" />
                    <p className="text-sm text-slate-600">{order.deliveryAddress.phone}</p>
                  </div>
                  <Separator className="my-3" />
                  <p className="text-sm text-slate-600">
                    {order.deliveryAddress.addressLine1}
                  </p>
                  {order.deliveryAddress.addressLine2 && (
                    <p className="text-sm text-slate-600">
                      {order.deliveryAddress.addressLine2}
                    </p>
                  )}
                  <p className="text-sm text-slate-600">
                    {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.postalCode}
                  </p>
                </div>

                {/* Shop/Location Image */}
                {order.deliveryAddress.imageUrl && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <ImageIcon className="w-4 h-4" />
                      Shop/Location Image
                    </div>
                    <div className="rounded-lg overflow-hidden border border-slate-200">
                      <img
                        src={order.deliveryAddress.imageUrl}
                        alt="Shop location"
                        className="w-full h-48 object-cover"
                      />
                    </div>
                  </div>
                )}

                {/* Geolocation */}
                {order.deliveryAddress.latitude && order.deliveryAddress.longitude && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <MapPin className="w-4 h-4" />
                      Location Coordinates
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-sm text-slate-700">
                        {formatCoordinatesWithLabels(
                          order.deliveryAddress.latitude,
                          order.deliveryAddress.longitude
                        )}
                      </span>
                      <a
                        href={addressService.getMapUrl(
                          order.deliveryAddress.latitude,
                          order.deliveryAddress.longitude
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm font-medium"
                      >
                        View on Map
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Order Notes */}
            {order.notes && (
              <Card>
                <div className="p-6 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-slate-600" />
                    <h2 className="text-lg font-semibold text-slate-800">Order Notes</h2>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-sm text-slate-600">{order.notes}</p>
                </div>
              </Card>
            )}
          </div>

          {/* Right Column - Order Summary & Status */}
          <div className="lg:col-span-1 space-y-6">
            {/* Order Status */}
            <Card>
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-800">Order Status</h2>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-${statusConfig.color}-100 flex items-center justify-center`}>
                    <StatusIcon className={`w-6 h-6 text-${statusConfig.color}-600`} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{statusConfig.label}</p>
                    <p className="text-xs text-slate-500">Order Status</p>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Payment Status</span>
                    <Badge variant={paymentConfig.color as any}>
                      {paymentConfig.label}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Payment Method</span>
                    <span className="font-semibold text-slate-800">{order.paymentMethod}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Order Summary */}
            <Card className="rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden bg-white">
              <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/60">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-slate-800">Order Summary</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Subtotal ({order.items.length} items)</span>
                    <span className="font-semibold text-slate-800">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Delivery Charges</span>
                    <span className="font-bold text-emerald-600 uppercase text-xs tracking-wider">FREE DELIVERY</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-baseline pt-1">
                    <span className="font-bold text-slate-800 text-base">Total Amount</span>
                    <span className="text-2xl font-black text-indigo-600">
                      ₹{order.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Order Timeline */}
            <Card>
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-slate-600" />
                  <h2 className="text-lg font-semibold text-slate-800">Timeline</h2>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-600 mt-2"></div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Order Placed</p>
                      <p className="text-xs text-slate-500">{formatDateTime(order.createdAt)}</p>
                    </div>
                  </div>
                  
                  {order.orderStatus !== 'pending' && (
                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-600 mt-2"></div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Order Confirmed</p>
                        <p className="text-xs text-slate-500">{formatDateTime(order.updatedAt)}</p>
                      </div>
                    </div>
                  )}
                  
                  {(order.orderStatus === 'assigned' || order.orderStatus === 'in_transit' || order.orderStatus === 'delivered' || order.orderStatus === 'completed') && (
                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-purple-600 mt-2"></div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Delivery Assigned</p>
                        <p className="text-xs text-slate-500">Assigned to delivery partner</p>
                      </div>
                    </div>
                  )}

                  {(order.orderStatus === 'in_transit' || order.orderStatus === 'delivered' || order.orderStatus === 'completed' || Boolean(order.deliveryOtp)) && (
                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-600 mt-2"></div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Picked Up & Out for Delivery</p>
                        <p className="text-xs text-slate-500">Order is on its way with delivery partner</p>
                      </div>
                    </div>
                  )}
                  
                  {(order.orderStatus === 'delivered' || order.orderStatus === 'completed') && (
                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-600 mt-2"></div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Delivered</p>
                        <p className="text-xs text-slate-500">Order delivered successfully</p>
                      </div>
                    </div>
                  )}
                  
                  {order.orderStatus === 'cancelled' && (
                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-red-600 mt-2"></div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Cancelled</p>
                        <p className="text-xs text-slate-500">Order was cancelled</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
