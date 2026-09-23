/**
 * Order Details Page (Admin)
 * View complete order information and manage delivery assignment
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Package, MapPin, CreditCard, FileText, 
  Clock, CheckCircle, Truck, XCircle, User, Phone, Edit 
} from 'lucide-react';
import { DashboardLayout } from '../../components/layout';
import { orderService, type Order } from '../../services/order.service';
import { deliveryService, type Delivery } from '../../services/delivery.service';
import { AssignDeliveryModal } from '../../components/admin';
import { 
  Button, Card, Badge, Skeleton, Alert, Separator 
} from '../../components/ui';
import { fadeVariants } from '../../utils/animations';
import { formatDate, formatDateTime } from '../../utils/date';
import { showSuccessToast, showErrorToast } from '../../utils/toast';

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

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function OrderDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDelivery, setLoadingDelivery] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');

  useEffect(() => {
    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const response = await orderService.getOrderById(id);
      setOrder(response.data.order);
      setNewStatus(response.data.order.orderStatus);
      
      // Try to load delivery if order is confirmed or beyond
      if (['confirmed', 'assigned', 'delivered', 'completed'].includes(response.data.order.orderStatus)) {
        await loadDelivery(response.data.order.id);
      }
    } catch (error) {
      showErrorToast('Failed to load order');
      console.error('Error loading order:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDelivery = async (orderId: string) => {
    try {
      setLoadingDelivery(true);
      const response = await deliveryService.getDeliveryByOrderId(orderId);
      setDelivery(response.data.delivery);
    } catch (error) {
      console.error('Error loading delivery:', error);
      // Delivery might not exist yet if order just confirmed
    } finally {
      setLoadingDelivery(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!order || !newStatus) return;
    
    try {
      setUpdating(true);
      await orderService.updateOrderStatus(order.id, {
        status: newStatus as any,
        notes: statusNotes || undefined,
      });
      
      showSuccessToast('Order status updated successfully');
      setShowStatusUpdate(false);
      setStatusNotes('');
      await loadOrder();
    } catch (error) {
      showErrorToast('Failed to update order status');
      console.error('Error updating status:', error);
    } finally {
      setUpdating(false);
    }
  };

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
          <Alert variant="error">
            Order not found.
          </Alert>
          <Button
            onClick={() => navigate('/admin/orders')}
            className="mt-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Orders
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const statusConfig = ORDER_STATUS_CONFIG[order.orderStatus];
  const paymentConfig = PAYMENT_STATUS_CONFIG[order.paymentStatus];
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
              onClick={() => navigate('/admin/orders')}
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
            <p className="text-sm text-slate-500">
              {order.customerName || order.customerEmail || 'Customer'}
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <Card>
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-slate-600" />
                  <h2 className="text-lg font-semibold text-slate-800">Order Items</h2>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-4 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800">{item.productName}</h3>
                      <p className="text-sm text-slate-500">SKU: {item.productSku}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-sm text-slate-600">Qty: {item.quantity}</span>
                        <span className="text-sm text-slate-400">×</span>
                        <span className="text-sm font-semibold text-slate-800">₹{item.unitPrice.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-800">₹{item.totalPrice.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Customer & Delivery Information */}
            <Card>
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-slate-600" />
                  <h2 className="text-lg font-semibold text-slate-800">Delivery Address</h2>
                </div>
              </div>
              <div className="p-6">
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

            {/* Status Update Section */}
            <Card>
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-800">Update Order Status</h2>
                  {!showStatusUpdate && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowStatusUpdate(true)}
                    >
                      <Edit className="w-4 h-4" />
                      Update Status
                    </Button>
                  )}
                </div>
              </div>
              {showStatusUpdate && (
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">
                      New Status
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={statusNotes}
                      onChange={(e) => setStatusNotes(e.target.value)}
                      placeholder="Add notes about this status change..."
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleStatusUpdate}
                      disabled={updating || newStatus === order.orderStatus}
                    >
                      {updating ? 'Updating...' : 'Update Status'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowStatusUpdate(false);
                        setNewStatus(order.orderStatus);
                        setStatusNotes('');
                      }}
                      disabled={updating}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </Card>
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
            <Card>
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-slate-600" />
                  <h2 className="text-lg font-semibold text-slate-800">Order Summary</h2>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Subtotal ({order.items.length} items)</span>
                    <span className="font-semibold text-slate-800">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Delivery Charges</span>
                    <span className="font-semibold text-green-600">FREE</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-800">Total Amount</span>
                    <span className="text-xl font-bold text-slate-900">₹{order.totalAmount.toFixed(2)}</span>
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
                  
                  {(order.orderStatus === 'assigned' || order.orderStatus === 'delivered' || order.orderStatus === 'completed') && (
                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-purple-600 mt-2"></div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Delivery Assigned</p>
                        <p className="text-xs text-slate-500">Assigned to delivery partner</p>
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

            {/* Delivery Assignment */}
            {order.orderStatus === 'confirmed' && !delivery?.deliveryPartnerId && (
              <Card className="border-2 border-blue-200 bg-blue-50">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Truck className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-blue-900">Ready for Delivery Assignment</h3>
                  </div>
                  <p className="text-sm text-blue-700 mb-4">
                    This order is confirmed and ready to be assigned to a delivery partner.
                  </p>
                  <Button
                    className="w-full"
                    onClick={() => setShowAssignModal(true)}
                  >
                    Assign Delivery Partner
                  </Button>
                </div>
              </Card>
            )}

            {/* Assigned Delivery Info */}
            {delivery?.deliveryPartnerId && (
              <Card>
                <div className="p-6 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <Truck className="w-5 h-5 text-slate-600" />
                    <h2 className="text-lg font-semibold text-slate-800">Delivery Information</h2>
                  </div>
                </div>
                <div className="p-6 space-y-3">
                  <div>
                    <p className="text-sm text-slate-500">Delivery Partner</p>
                    <p className="font-semibold text-slate-800">{delivery.partnerName || 'Assigned'}</p>
                    {delivery.partnerPhone && (
                      <p className="text-sm text-slate-600">{delivery.partnerPhone}</p>
                    )}
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm text-slate-500">Delivery Status</p>
                    <Badge variant={delivery.status === 'delivered' ? 'green' : 'blue'} className="mt-1">
                      {delivery.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  {delivery.assignedAt && (
                    <div>
                      <p className="text-sm text-slate-500">Assigned At</p>
                      <p className="text-sm font-semibold text-slate-800">{formatDateTime(delivery.assignedAt)}</p>
                    </div>
                  )}
                  {delivery.deliveredAt && (
                    <div>
                      <p className="text-sm text-slate-500">Delivered At</p>
                      <p className="text-sm font-semibold text-slate-800">{formatDateTime(delivery.deliveredAt)}</p>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Assign Delivery Modal */}
        <AssignDeliveryModal
          isOpen={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          order={order}
          deliveryId={delivery?.id}
          onSuccess={loadOrder}
        />
      </motion.div>
    </DashboardLayout>
  );
}
