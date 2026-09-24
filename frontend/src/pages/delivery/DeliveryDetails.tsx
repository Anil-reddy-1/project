/**
 * Delivery Details Page (Delivery Partner)
 * View and manage individual delivery
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, MapPin, Phone, User, 
  Clock, CheckCircle, Truck, FileText 
} from 'lucide-react';
import { DashboardLayout } from '../../components/layout';
import { useDeliveries } from '../../hooks/useDeliveries';
import { 
  Button, Card, Badge, Skeleton, Alert, Separator 
} from '../../components/ui';
import { fadeVariants } from '../../utils/animations';
import { formatDateTime } from '../../utils/date';
import type { Delivery } from '../../services/delivery.service';

const DELIVERY_STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'gray', icon: Clock },
  assigned: { label: 'Assigned', color: 'yellow', icon: Clock },
  accepted: { label: 'Accepted', color: 'blue', icon: CheckCircle },
  in_transit: { label: 'In Transit', color: 'purple', icon: Truck },
  delivered: { label: 'Delivered', color: 'green', icon: CheckCircle },
  failed: { label: 'Failed', color: 'red', icon: Clock },
};

export function DeliveryDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getDeliveryById, acceptDelivery, startDelivery, completeDelivery } = useDeliveries({
    autoLoad: false,
  });
  
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadDelivery();
  }, [id]);

  const loadDelivery = async () => {
    if (!id) return;
    
    setLoading(true);
    const deliveryData = await getDeliveryById(id);
    setDelivery(deliveryData);
    setLoading(false);
  };

  const handleAccept = async () => {
    if (!delivery) return;
    
    setUpdating(true);
    const success = await acceptDelivery(delivery.id, notes || undefined);
    if (success) {
      await loadDelivery();
      setNotes('');
    }
    setUpdating(false);
  };

  const handleStart = async () => {
    if (!delivery) return;
    
    setUpdating(true);
    const success = await startDelivery(delivery.id, notes || undefined);
    if (success) {
      await loadDelivery();
      setNotes('');
    }
    setUpdating(false);
  };

  const handleComplete = async () => {
    if (!delivery) return;
    
    if (!window.confirm('Are you sure you want to mark this delivery as completed?')) {
      return;
    }
    
    setUpdating(true);
    const success = await completeDelivery(delivery.id, notes || undefined);
    if (success) {
      await loadDelivery();
      setNotes('');
    }
    setUpdating(false);
  };

  // Loading state
  if (loading) {
    return (
      <DashboardLayout title="Delivery Details" subtitle="View delivery information">
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
  if (!delivery) {
    return (
      <DashboardLayout title="Delivery Details" subtitle="View delivery information">
        <div className="max-w-5xl mx-auto py-8">
          <Alert variant="destructive">
            Delivery not found or you don't have permission to view it.
          </Alert>
          <Button
            onClick={() => navigate('/delivery/deliveries')}
            className="mt-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Deliveries
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const statusConfig = DELIVERY_STATUS_CONFIG[delivery.status];

  // Determine available actions based on current status
  const canAccept = delivery.status === 'assigned';
  const canStart = delivery.status === 'accepted';
  const canComplete = delivery.status === 'in_transit';
  const isCompleted = delivery.status === 'delivered';

  return (
    <DashboardLayout title="Delivery Details" subtitle={delivery.orderNumber ? `Order #${delivery.orderNumber}` : 'Delivery'}>
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
              onClick={() => navigate('/delivery/deliveries')}
              className="mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Deliveries
            </Button>
            <h1 className="text-2xl font-bold text-slate-800">
              {delivery.orderNumber ? `Order #${delivery.orderNumber}` : `Delivery #${delivery.id.slice(0, 8)}`}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {delivery.assignedAt ? `Assigned on ${formatDateTime(delivery.assignedAt)}` : 'Recently assigned'}
            </p>
          </div>
          <Badge variant={statusConfig.color as any} className="text-base px-4 py-2">
            {statusConfig.label}
          </Badge>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Customer & Address Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Information */}
            <Card>
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-slate-600" />
                  <h2 className="text-lg font-semibold text-slate-800">Customer Information</h2>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-slate-500">Name</p>
                    <p className="font-semibold text-slate-800 text-lg">{delivery.customerName}</p>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-500" />
                    <div>
                      <p className="text-sm text-slate-500">Phone</p>
                      <a 
                        href={`tel:${delivery.customerPhone}`}
                        className="font-semibold text-blue-600 hover:text-blue-700"
                      >
                        {delivery.customerPhone}
                      </a>
                    </div>
                  </div>
                </div>
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
              <div className="p-6">
                <div className="space-y-2">
                  <p className="font-semibold text-slate-800">{delivery.deliveryAddress.name}</p>
                  <p className="text-sm text-slate-600">{delivery.deliveryAddress.phone}</p>
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
                    {delivery.deliveryAddress.city}, {delivery.deliveryAddress.state} {delivery.deliveryAddress.postalCode}
                  </p>
                  
                  {/* Google Maps Link */}
                  <div className="pt-3">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `${delivery.deliveryAddress.addressLine1}, ${delivery.deliveryAddress.city}, ${delivery.deliveryAddress.state} ${delivery.deliveryAddress.postalCode}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
                    >
                      <MapPin className="w-4 h-4" />
                      Open in Google Maps
                    </a>
                  </div>
                </div>
              </div>
            </Card>

            {/* Notes */}
            {delivery.notes && (
              <Card>
                <div className="p-6 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-slate-600" />
                    <h2 className="text-lg font-semibold text-slate-800">Delivery Notes</h2>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-sm text-slate-600">{delivery.notes}</p>
                </div>
              </Card>
            )}
          </div>

          {/* Right Column - Actions & Timeline */}
          <div className="lg:col-span-1 space-y-6">
            {/* Action Card */}
            {!isCompleted && (
              <Card>
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-lg font-semibold text-slate-800">Actions</h2>
                </div>
                <div className="p-6 space-y-4">
                  {/* Notes Input */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add notes about this status update..."
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      rows={3}
                      disabled={updating}
                    />
                  </div>

                  {/* Action Buttons */}
                  {canAccept && (
                    <Button
                      onClick={handleAccept}
                      disabled={updating}
                      className="w-full"
                    >
                      {updating ? 'Accepting...' : 'Accept Delivery'}
                    </Button>
                  )}

                  {canStart && (
                    <Button
                      onClick={handleStart}
                      disabled={updating}
                      className="w-full"
                    >
                      {updating ? 'Starting...' : 'Start Delivery'}
                    </Button>
                  )}

                  {canComplete && (
                    <Button
                      onClick={handleComplete}
                      disabled={updating}
                      className="w-full"
                    >
                      {updating ? 'Completing...' : 'Mark as Delivered'}
                    </Button>
                  )}
                </div>
              </Card>
            )}

            {/* Completed Message */}
            {isCompleted && (
              <Card className="border-2 border-green-200 bg-green-50">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-green-900">Delivery Completed</h3>
                      <p className="text-sm text-green-700">Great job!</p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Timeline */}
            <Card>
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-slate-600" />
                  <h2 className="text-lg font-semibold text-slate-800">Timeline</h2>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {delivery.assignedAt && (
                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-yellow-600 mt-2"></div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Assigned</p>
                        <p className="text-xs text-slate-500">{formatDateTime(delivery.assignedAt)}</p>
                      </div>
                    </div>
                  )}
                  
                  {delivery.acceptedAt && (
                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-600 mt-2"></div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Accepted</p>
                        <p className="text-xs text-slate-500">{formatDateTime(delivery.acceptedAt)}</p>
                      </div>
                    </div>
                  )}
                  
                  {delivery.startedAt && (
                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-purple-600 mt-2"></div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Started</p>
                        <p className="text-xs text-slate-500">{formatDateTime(delivery.startedAt)}</p>
                      </div>
                    </div>
                  )}
                  
                  {delivery.deliveredAt && (
                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-600 mt-2"></div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Delivered</p>
                        <p className="text-xs text-slate-500">{formatDateTime(delivery.deliveredAt)}</p>
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
