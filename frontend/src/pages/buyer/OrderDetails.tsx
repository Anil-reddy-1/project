/**
 * Order Details Page (Buyer)
 * View complete order information including items, delivery status, the buyer's
 * delivery OTP (issued when a partner is assigned) and timeline
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Package, MapPin, FileText, Clock, CheckCircle, Truck, XCircle,
  User, Phone, ExternalLink, Image as ImageIcon, KeyRound, Copy, RefreshCw,
  ShieldCheck, Banknote, BadgeCheck, type LucideIcon,
} from 'lucide-react';
import { DashboardLayout } from '../../components/layout';
import { useOrders } from '../../hooks/useOrders';
import { Skeleton } from '../../components/ui';
import { fadeVariants } from '../../utils/animations';
import { formatDateTime } from '../../utils/date';
import { showSuccessToast, showErrorToast } from '../../utils/toast';
import { addressService } from '../../services/address.service';
import { orderService, type Order } from '../../services/order.service';
import type { Notification } from '../../services/notification.service';
import { useSocketEvent } from '../../context/SocketContext';
import { formatCoordinatesWithLabels } from '../../utils/geolocation';

// Soft semantic pills for the storefront ("classic & modern")
const TONE = {
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  ink: 'bg-ink-50 text-ink-700 border-ink-100',
  brass: 'bg-brass-50 text-brass-700 border-brass-100',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  stone: 'bg-stone-50 text-stone-600 border-stone-200',
} as const;

const ORDER_STATUS_CONFIG: Record<string, { label: string; tone: string; icon: LucideIcon }> = {
  pending: { label: 'Pending', tone: TONE.amber, icon: Clock },
  confirmed: { label: 'Confirmed', tone: TONE.ink, icon: CheckCircle },
  preparing: { label: 'Preparing', tone: TONE.ink, icon: Package },
  packed: { label: 'Packed', tone: TONE.ink, icon: Package },
  assigned: { label: 'Partner assigned', tone: TONE.brass, icon: Truck },
  in_transit: { label: 'Out for delivery', tone: TONE.brass, icon: Truck },
  out_for_delivery: { label: 'Out for delivery', tone: TONE.brass, icon: Truck },
  delivered: { label: 'Delivered', tone: TONE.emerald, icon: CheckCircle },
  completed: { label: 'Completed', tone: TONE.emerald, icon: BadgeCheck },
  cancelled: { label: 'Cancelled', tone: TONE.red, icon: XCircle },
};

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; tone: string }> = {
  pending: { label: 'Pending', tone: TONE.amber },
  paid: { label: 'Paid', tone: TONE.emerald },
  failed: { label: 'Failed', tone: TONE.red },
  refunded: { label: 'Refunded', tone: TONE.stone },
};

const PILL = 'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap';
const META_LABEL = 'text-[11px] uppercase font-semibold tracking-[0.16em] text-stone-400';

const BUYER_STEPS = [
  { key: 'placed', label: 'Placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'assigned', label: 'Partner assigned' },
  { key: 'in_transit', label: 'Out for delivery' },
  { key: 'delivered', label: 'Delivered' },
];

function getBuyerStepIndex(status: string): number {
  if (['delivered', 'completed'].includes(status)) return 4;
  if (['in_transit', 'out_for_delivery'].includes(status)) return 3;
  if (status === 'assigned') return 2;
  if (['confirmed', 'preparing', 'packed'].includes(status)) return 1;
  if (status === 'pending') return 0;
  return -1;
}

const money = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

function isCashOnDelivery(order: Order) {
  const method = (order.paymentMethod || '').toLowerCase();
  return (method.includes('cod') || method.includes('cash')) && order.paymentStatus !== 'paid';
}

export function OrderDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getOrderById } = useOrders({ autoLoad: false });

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  // Re-render periodically so an OTP that expires while the page is open shows as expired
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

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

  // Live updates: partner assigned (OTP issued), OTP verified, delivered, completed…
  const handleNotification = useCallback(
    async (n: Notification) => {
      if (!id || n?.data?.orderId !== id) return;
      const fresh = await getOrderById(id);
      if (fresh) setOrder(fresh);
    },
    [id, getOrderById],
  );
  useSocketEvent<Notification>('notification:new', handleNotification);

  const handleRegenerateOtp = async () => {
    if (!order) return;
    try {
      setRegenerating(true);
      const res = await orderService.regenerateDeliveryOtp(order.id);
      setOrder((prev) => (prev ? { ...prev, ...res.data.order, items: prev.items } : res.data.order));
      showSuccessToast('New delivery code generated. Your previous code no longer works.');
    } catch (err) {
      showErrorToast((err as { message?: string })?.message || 'Could not regenerate the delivery code');
    } finally {
      setRegenerating(false);
    }
  };

  const copyOrderId = () => {
    if (order?.id) {
      navigator.clipboard.writeText(order.id);
      showSuccessToast('Order ID copied');
    }
  };

  const copyOtp = () => {
    if (order?.deliveryOtp) {
      navigator.clipboard.writeText(order.deliveryOtp);
      showSuccessToast('Delivery code copied');
    }
  };

  // Loading state
  if (loading) {
    return (
      <DashboardLayout title="Order Details" subtitle="View order information">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64 bg-ivory-200" />
          <Skeleton className="h-24 rounded-2xl bg-ivory-200" />
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-64 rounded-2xl bg-ivory-200" />
              <Skeleton className="h-48 rounded-2xl bg-ivory-200" />
            </div>
            <Skeleton className="h-96 rounded-2xl bg-ivory-200" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Not found
  if (!order) {
    return (
      <DashboardLayout title="Order Details" subtitle="View order information">
        <div className="max-w-xl mx-auto shop-card p-10 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-ivory-100 ring-1 ring-ivory-300 flex items-center justify-center">
            <Package className="w-6 h-6 text-brass-600" />
          </div>
          <h1 className="shop-heading mt-5">Order not found</h1>
          <p className="shop-subtitle mt-2">
            This order doesn&apos;t exist or you don&apos;t have permission to view it.
          </p>
          <button type="button" onClick={() => navigate('/buyer/orders')} className="shop-btn-primary mt-6">
            <ArrowLeft className="w-4 h-4" />
            Back to my orders
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const statusConfig = ORDER_STATUS_CONFIG[order.orderStatus] || { label: order.orderStatus || 'Unknown', tone: TONE.stone, icon: Package };
  const paymentConfig = PAYMENT_STATUS_CONFIG[order.paymentStatus] || { label: order.paymentStatus || 'Unknown', tone: TONE.stone };
  const StatusIcon = statusConfig.icon;
  const currentStep = getBuyerStepIndex(order.orderStatus);

  const subtotal = order.items.reduce((sum, item) => sum + item.totalPrice, 0);
  const awaitingDelivery = ['assigned', 'in_transit'].includes(order.orderStatus);
  const otpVerified = !!order.deliveryOtpVerifiedAt;
  const otpExpired = !!order.deliveryOtpExpiresAt && new Date(order.deliveryOtpExpiresAt).getTime() < now;
  const showOtpCard = awaitingDelivery && !otpVerified;
  const payCashNow = order.orderStatus === 'in_transit' && otpVerified && isCashOnDelivery(order);
  const partnerName = order.deliveryPartnerName;
  // Older orders may predate order-number generation — fall back to the short ID
  const orderLabel = order.orderNumber || order.id.slice(0, 8).toUpperCase();

  return (
    <DashboardLayout title="Order Details" subtitle={`Order #${orderLabel}`}>
      <motion.div
        className="max-w-5xl mx-auto space-y-6"
        variants={fadeVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <div>
          <button type="button" onClick={() => navigate('/buyer/orders')} className="shop-btn-ghost -ml-3">
            <ArrowLeft className="w-4 h-4" />
            My orders
          </button>
          <div className="mt-3 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="min-w-0">
              <p className="shop-eyebrow">Order details</p>
              <h1 className="shop-title mt-2 break-all">Order #{orderLabel}</h1>
              <p className="shop-subtitle mt-1.5">Placed on {formatDateTime(order.createdAt)}</p>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                <span className={META_LABEL}>Order ID</span>
                <span className="font-mono text-ink-700 break-all">{order.id}</span>
                <button
                  type="button"
                  onClick={copyOrderId}
                  aria-label="Copy order ID"
                  className="w-7 h-7 rounded-full text-ink-500 hover:text-ink hover:bg-ivory-100 flex items-center justify-center transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </p>
            </div>
            <span className={`${PILL} ${statusConfig.tone} self-start sm:self-auto text-xs px-3 py-1`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {statusConfig.label}
            </span>
          </div>
          <div className="shop-rule mt-6" />
        </div>

        {/* Progress */}
        {order.orderStatus !== 'cancelled' && (
          <section className="shop-card px-5 py-6 sm:px-8" aria-label="Order progress">
            <ol className="grid grid-cols-5 gap-1">
              {BUYER_STEPS.map((step, idx) => {
                const done = idx < currentStep;
                const current = idx === currentStep;
                return (
                  <li key={step.key} className="relative flex flex-col items-center text-center">
                    {idx > 0 && (
                      <span
                        aria-hidden
                        className={`absolute top-[11px] right-1/2 w-full h-px ${idx <= currentStep ? 'bg-brass' : 'bg-ivory-300'}`}
                      />
                    )}
                    <span
                      className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white ${
                        current
                          ? 'bg-ink text-white'
                          : done
                            ? 'bg-brass text-white'
                            : 'bg-white border border-ivory-300 text-stone-300'
                      }`}
                    >
                      {done ? <CheckCircle className="w-3.5 h-3.5" /> : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                    </span>
                    <span
                      className={`mt-2 text-[11px] sm:text-xs leading-tight ${
                        current ? 'font-semibold text-ink' : done ? 'text-ink-500' : 'text-stone-400'
                      }`}
                      aria-current={current ? 'step' : undefined}
                    >
                      {step.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {/* Delivery code — issued when a partner is assigned, shared at the door */}
        {showOtpCard && (
          <section className="rounded-2xl bg-ink text-ivory-100 overflow-hidden" aria-label="Delivery verification code">
            <div className="p-6 sm:p-7 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="space-y-2 max-w-md">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brass-300 flex items-center gap-2">
                  <KeyRound className="w-3.5 h-3.5" />
                  Delivery code
                </p>
                <h2 className="font-display text-2xl font-medium text-white">
                  {order.deliveryOtp && !otpExpired ? 'Share this code on delivery' : 'Your code needs refreshing'}
                </h2>
                <p className="text-sm text-ink-300 leading-relaxed">
                  {order.deliveryOtp && !otpExpired
                    ? `Give this code to ${partnerName || 'your delivery partner'} only when your order is in your hands.`
                    : 'Your previous code has expired. Generate a new one before the delivery partner arrives.'}
                </p>
                {order.deliveryOtpExpiresAt && order.deliveryOtp && (
                  <p className={`text-xs flex items-center gap-1.5 ${otpExpired ? 'text-red-300' : 'text-ink-300'}`}>
                    <Clock className="w-3.5 h-3.5" />
                    {otpExpired ? 'Expired' : 'Valid until'} {formatDateTime(order.deliveryOtpExpiresAt)}
                  </p>
                )}
              </div>

              <div className="flex flex-col items-start md:items-end gap-3">
                {order.deliveryOtp && !otpExpired && (
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5" aria-label={`Delivery code ${order.deliveryOtp.split('').join(' ')}`}>
                      {order.deliveryOtp.split('').map((digit, i) => (
                        <span
                          key={i}
                          className="w-9 h-12 sm:w-11 sm:h-14 rounded-lg bg-ivory-50 text-ink font-mono text-2xl sm:text-3xl font-semibold flex items-center justify-center"
                        >
                          {digit}
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={copyOtp}
                      aria-label="Copy delivery code"
                      className="w-10 h-10 rounded-full border border-white/20 text-ivory-100 hover:bg-white/10 flex items-center justify-center transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleRegenerateOtp}
                  disabled={regenerating}
                  className={
                    order.deliveryOtp && !otpExpired
                      ? 'inline-flex items-center gap-2 h-9 px-4 rounded-full text-xs font-semibold text-ivory-100 border border-white/20 hover:bg-white/10 transition-colors disabled:opacity-50'
                      : 'inline-flex items-center gap-2 h-11 px-6 rounded-full text-sm font-semibold bg-brass text-white hover:bg-brass-600 transition-colors disabled:opacity-50'
                  }
                >
                  <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
                  {regenerating ? 'Generating…' : order.deliveryOtp && !otpExpired ? 'Regenerate code' : 'Generate new code'}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* OTP verified at the door — pay the partner in cash */}
        {payCashNow && (
          <section className="shop-card border-brass-300 bg-brass-50 p-6 flex flex-col sm:flex-row sm:items-center gap-4" aria-live="polite">
            <div className="w-12 h-12 rounded-full bg-white ring-1 ring-brass-300 flex items-center justify-center shrink-0">
              <Banknote className="w-5 h-5 text-brass-700" />
            </div>
            <div className="flex-1">
              <p className="shop-eyebrow flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Code verified
              </p>
              <p className="font-display text-xl text-ink mt-1">
                Please pay <span className="font-semibold">{money(order.totalAmount)}</span> in cash to {partnerName || 'the delivery partner'}.
              </p>
            </div>
          </section>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Items */}
            <section className="shop-card overflow-hidden">
              <div className="shop-card-header">
                <h2 className="shop-heading text-lg">Items</h2>
                <span className="shop-chip">{order.items.length} {order.items.length === 1 ? 'item' : 'items'}</span>
              </div>
              <ul className="divide-y divide-ivory-200">
                {order.items.map((item) => (
                  <li key={item.id} className="px-6 py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-display text-[15px] font-medium text-ink">{item.productName}</p>
                      <p className="text-[11px] text-stone-400 font-mono mt-0.5">SKU {item.productSku}</p>
                      <p className="text-xs text-stone-500 mt-1">
                        {item.quantity} × {money(item.unitPrice)}
                      </p>
                    </div>
                    <p className="shop-price text-[15px] shrink-0">{money(item.totalPrice)}</p>
                  </li>
                ))}
              </ul>
            </section>

            {/* Delivery Address */}
            <section className="shop-card overflow-hidden">
              <div className="shop-card-header">
                <h2 className="shop-heading text-lg">Delivery address</h2>
                <MapPin className="w-4 h-4 text-brass-500" />
              </div>
              <div className="p-6 space-y-5">
                <div className="space-y-1.5">
                  <p className="flex items-center gap-2 font-medium text-ink">
                    <User className="w-4 h-4 text-stone-400" />
                    {order.deliveryAddress.name}
                  </p>
                  <p className="flex items-center gap-2 text-sm text-ink-500">
                    <Phone className="w-4 h-4 text-stone-400" />
                    {order.deliveryAddress.phone}
                  </p>
                  <address className="not-italic text-sm text-ink-500 leading-relaxed pt-2">
                    {order.deliveryAddress.addressLine1}
                    {order.deliveryAddress.addressLine2 && <><br />{order.deliveryAddress.addressLine2}</>}
                    <br />
                    {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.postalCode}
                  </address>
                </div>

                {order.deliveryAddress.imageUrl && (
                  <div className="space-y-2">
                    <p className={`${META_LABEL} flex items-center gap-1.5`}>
                      <ImageIcon className="w-3.5 h-3.5" />
                      Shop / location
                    </p>
                    <div className="rounded-xl overflow-hidden border border-ivory-200">
                      <img
                        src={order.deliveryAddress.imageUrl}
                        alt="Shop location"
                        className="w-full h-48 object-cover"
                      />
                    </div>
                  </div>
                )}

                {order.deliveryAddress.latitude && order.deliveryAddress.longitude && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ivory-50 border border-ivory-200 px-4 py-3">
                    <span className="text-sm text-ink-700">
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
                      className="inline-flex items-center gap-1 text-sm font-semibold text-ink underline decoration-brass-300 underline-offset-4 hover:decoration-brass"
                    >
                      View on map
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            </section>

            {/* Order Notes */}
            {order.notes && (
              <section className="shop-card overflow-hidden">
                <div className="shop-card-header">
                  <h2 className="shop-heading text-lg">Notes</h2>
                  <FileText className="w-4 h-4 text-brass-500" />
                </div>
                <p className="p-6 text-sm text-ink-500 leading-relaxed whitespace-pre-line">{order.notes}</p>
              </section>
            )}
          </div>

          {/* Right Column */}
          <div className="lg:col-span-1 space-y-6">
            {/* Receipt */}
            <section className="shop-card overflow-hidden">
              <div className="px-6 pt-6">
                <p className="shop-eyebrow">Receipt</p>
                <h2 className="shop-heading mt-1">Order summary</h2>
              </div>
              <div className="mx-6 mt-4 border-t border-dashed border-ivory-300" />
              <dl className="px-6 py-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-stone-500">Subtotal ({order.items.length} items)</dt>
                  <dd className="text-ink tabular-nums">{money(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-500">Delivery</dt>
                  <dd className="text-emerald-700 font-medium">Free</dd>
                </div>
              </dl>
              <div className="mx-6 shop-rule" />
              <div className="px-6 py-5 flex items-baseline justify-between">
                <span className="text-sm font-medium text-ink">Total</span>
                <span className="shop-price text-2xl">{money(order.totalAmount)}</span>
              </div>
              <dl className="bg-ivory-50 border-t border-ivory-200 px-6 py-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className={META_LABEL}>Payment</dt>
                  <dd className={`${PILL} ${paymentConfig.tone}`}>{paymentConfig.label}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className={META_LABEL}>Method</dt>
                  <dd className="font-medium text-ink">{order.paymentMethod}</dd>
                </div>
                {partnerName && (
                  <div className="flex items-center justify-between gap-3">
                    <dt className={META_LABEL}>Delivery partner</dt>
                    <dd className="font-medium text-ink text-right truncate">{partnerName}</dd>
                  </div>
                )}
              </dl>
            </section>

            {/* Timeline */}
            <section className="shop-card overflow-hidden">
              <div className="shop-card-header">
                <h2 className="shop-heading text-lg">Timeline</h2>
                <Clock className="w-4 h-4 text-brass-500" />
              </div>
              <ol className="p-6 space-y-5">
                {[
                  { show: true, title: 'Order placed', detail: formatDateTime(order.createdAt) },
                  { show: currentStep >= 1, title: 'Order confirmed', detail: 'We have started on your order' },
                  { show: currentStep >= 2, title: 'Delivery partner assigned', detail: partnerName ? `${partnerName} · delivery code issued` : 'Delivery code issued' },
                  { show: currentStep >= 3, title: 'Out for delivery', detail: 'Your order is on its way' },
                  { show: otpVerified, title: 'Delivery code verified', detail: order.deliveryOtpVerifiedAt ? formatDateTime(order.deliveryOtpVerifiedAt) : '' },
                  { show: currentStep >= 4, title: 'Delivered', detail: 'Order delivered successfully' },
                  { show: order.orderStatus === 'completed', title: 'Completed', detail: order.completedAt ? formatDateTime(order.completedAt) : 'Thank you for your order' },
                  { show: order.orderStatus === 'cancelled', title: 'Cancelled', detail: 'This order was cancelled', danger: true },
                ]
                  .filter((e) => e.show)
                  .map((e, idx, arr) => (
                    <li key={e.title} className="relative flex gap-3">
                      {idx < arr.length - 1 && (
                        <span aria-hidden className="absolute left-[5px] top-4 -bottom-5 w-px bg-ivory-300" />
                      )}
                      <span
                        className={`relative mt-1.5 w-[11px] h-[11px] rounded-full shrink-0 ${
                          'danger' in e && e.danger ? 'bg-red-500' : idx === arr.length - 1 ? 'bg-ink' : 'bg-brass'
                        }`}
                      />
                      <div>
                        <p className="text-sm font-medium text-ink">{e.title}</p>
                        {e.detail && <p className="text-xs text-stone-500 mt-0.5">{e.detail}</p>}
                      </div>
                    </li>
                  ))}
              </ol>
            </section>
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
