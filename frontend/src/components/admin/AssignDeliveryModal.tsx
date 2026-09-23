/**
 * Assign Delivery Modal
 * Modal for admins to assign orders to delivery partners
 */

import { useState, useEffect } from 'react';
import { X, User, Phone, Mail, Truck, AlertCircle } from 'lucide-react';
import { useDeliveryPartners } from '../../hooks/useDeliveryPartners';
import { Button, LoadingSpinner, Alert } from '../ui';
import type { Order } from '../../services/order.service';

interface AssignDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  deliveryId?: string;
  onSuccess?: () => void;
}

export function AssignDeliveryModal({
  isOpen,
  onClose,
  order,
  deliveryId,
  onSuccess,
}: AssignDeliveryModalProps) {
  const { partners, loading, assigning, fetchPartners, assignDelivery } = useDeliveryPartners();
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchPartners();
      setSelectedPartnerId('');
      setNotes('');
    }
  }, [isOpen, fetchPartners]);

  const handleAssign = async () => {
    if (!selectedPartnerId || !deliveryId) return;

    const success = await assignDelivery(deliveryId, selectedPartnerId, notes || undefined);
    
    if (success) {
      onSuccess?.();
      onClose();
    }
  };

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Truck className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Assign Delivery Partner</h2>
                <p className="text-sm text-slate-500">Order #{order.orderNumber}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
              disabled={assigning}
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Order Info */}
          <div className="bg-slate-50 rounded-xl p-4 mb-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-2">Order Details</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-slate-500">Customer:</span>
                <p className="font-semibold text-slate-800">{order.deliveryAddress.name}</p>
              </div>
              <div>
                <span className="text-slate-500">Amount:</span>
                <p className="font-semibold text-slate-800">₹{order.totalAmount.toFixed(2)}</p>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500">Delivery Location:</span>
                <p className="font-semibold text-slate-800">
                  {order.deliveryAddress.city}, {order.deliveryAddress.state}
                </p>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          )}

          {/* No Partners */}
          {!loading && partners.length === 0 && (
            <Alert variant="warning">
              <AlertCircle className="h-4 w-4" />
              <div>
                <p className="font-semibold">No delivery partners available</p>
                <p className="text-sm mt-1">
                  Please create delivery partner accounts before assigning deliveries.
                </p>
              </div>
            </Alert>
          )}

          {/* Partners List */}
          {!loading && partners.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-800">Select Delivery Partner</h3>
              
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {partners.map((partner) => (
                  <div
                    key={partner.id}
                    onClick={() => setSelectedPartnerId(partner.id)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedPartnerId === partner.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedPartnerId === partner.id
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-slate-300'
                      }`}>
                        {selectedPartnerId === partner.id && (
                          <div className="w-2 h-2 rounded-full bg-white"></div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-slate-500" />
                          <p className="font-semibold text-slate-800">{partner.name}</p>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            {partner.status}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            <span>{partner.email}</span>
                          </div>
                          {partner.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              <span>{partner.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  Assignment Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any special instructions for the delivery partner..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-slate-500 mt-1">{notes.length}/500 characters</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-slate-50">
          <div className="flex gap-3">
            <Button
              onClick={handleAssign}
              disabled={!selectedPartnerId || assigning || loading}
              className="flex-1"
            >
              {assigning ? 'Assigning...' : 'Assign Delivery'}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={assigning}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
