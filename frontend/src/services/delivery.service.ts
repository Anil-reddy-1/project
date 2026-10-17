import { api } from './api.service';

export interface DeliveryStatusHistory {
  id: string;
  deliveryId: string;
  status: string;
  changedBy: string;
  notes?: string;
  createdAt: string;
}

export interface DeliveryOrderItem {
  id: string;
  productId: string;
  productName: string;
  productSku?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Delivery {
  id: string;
  deliveryId?: string;
  orderId: string;
  deliveryPartnerId?: string;
  deliveryType?: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: {
    name: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    lat?: number;
    lng?: number;
  };
  origin?: string;
  destination?: string;
  packageCount?: number;
  scheduledDate?: string;
  status: 'pending' | 'assigned' | 'accepted' | 'in_transit' | 'delivered' | 'failed';
  assignedAt?: string;
  acceptedAt?: string;
  startedAt?: string;
  deliveredAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  orderNumber?: string;
  orderAmount?: number;
  totalAmount?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  orderStatus?: string;
  orderNotes?: string;
  cashHandoverStatus?: 'pending' | 'collected' | null;
  cashHandoverAt?: string | null;
  /** Set once the partner verified the buyer's OTP at the door (COD: cash still to collect) */
  deliveryOtpVerifiedAt?: string | null;
  orderItems?: DeliveryOrderItem[];
  partnerName?: string;
  partnerPhone?: string;
  partnerContact?: string;
}

export interface DeliveriesListResponse {
  success: boolean;
  message: string;
  data: {
    deliveries: Delivery[];
    total: number;
    page: number;
    limit: number;
  };
}

export interface DeliveryResponse {
  success: boolean;
  message: string;
  data: {
    delivery: Delivery;
  };
}

export interface DeliveryHistoryResponse {
  success: boolean;
  message: string;
  data: {
    history: DeliveryStatusHistory[];
  };
}

export interface AssignDeliveryPayload {
  deliveryPartnerId?: string;
  partnerId?: string;
  deliveryId?: string;
  notes?: string;
}

export interface PartnerDeliveryStats {
  totalDeliveries: number;
  assignedDeliveries: number;
  acceptedDeliveries: number;
  inTransitDeliveries: number;
  deliveredDeliveries: number;
  /** Delivered and settled: prepaid, or COD cash confirmed by a supervisor */
  successfulDeliveries: number;
  /** Delivered COD orders whose cash must still be returned to a supervisor */
  cashPendingDeliveries: number;
  cashPendingAmount: number;
  failedDeliveries: number;
}

/**
 * A delivered COD order whose cash the partner still holds. It doesn't count as a
 * successful delivery until a supervisor confirms receiving the cash.
 */
export function isCashPendingReturn(delivery: Pick<Delivery, 'status' | 'cashHandoverStatus'>): boolean {
  return delivery.status === 'delivered' && delivery.cashHandoverStatus === 'pending';
}

export interface VerifyDeliveryOtpResponse {
  success: boolean;
  message: string;
  data: {
    otpVerified: boolean;
    needsCashCollection: boolean;
    delivered: boolean;
    amount?: number;
  };
}

export interface UpdateDeliveryStatusPayload {
  notes?: string;
  otp?: string;
  cashCollected?: boolean;
}

export const deliveryService = {
  // Get all deliveries (admin: all, delivery partner: own)
  getDeliveries: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    partnerId?: string;
  }) => api.get<DeliveriesListResponse>('/deliveries', params),

  getAllDeliveries: async (): Promise<Delivery[]> => {
    try {
      const res = await api.get<any>('/deliveries');
      if (Array.isArray(res?.data)) return res.data;
      if (Array.isArray(res?.data?.deliveries)) return res.data.deliveries;
      if (Array.isArray(res)) return res;
      return [];
    } catch (err) {
      console.error('Error in getAllDeliveries:', err);
      return [];
    }
  },

  getAvailablePartners: async (): Promise<any[]> => {
    try {
      let res;
      try {
        res = await api.get<any>('/deliveries/partners/available');
      } catch {
        res = await api.get<any>('/staff', { role: 'Delivery Partner', status: 'active' });
      }
      
      const data = res?.data;
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.partners)) return data.partners;
      if (Array.isArray(data?.staff)) return data.staff;
      if (Array.isArray(res)) return res;
      return [];
    } catch (err) {
      console.error('Error in getAvailablePartners:', err);
      return [];
    }
  },

  // Get delivery by order ID
  getDeliveryByOrderId: (orderId: string) =>
    api.get<DeliveryResponse>(`/deliveries/order/${orderId}`),

  // Get delivery by ID
  getDeliveryById: (id: string) =>
    api.get<DeliveryResponse>(`/deliveries/${id}`),

  // Get deliveries for current delivery partner
  getMyDeliveries: (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) => api.get<DeliveriesListResponse>('/deliveries/me', params),

  // Delivery statistics for the current delivery partner
  getMyStats: () =>
    api.get<{ success: boolean; message: string; data: PartnerDeliveryStats }>('/deliveries/stats/me'),

  // Get delivery status history
  getDeliveryHistory: (id: string) =>
    api.get<DeliveryHistoryResponse>(`/deliveries/${id}/history`),

  // Assign delivery to partner (admin only) — by delivery ID
  assignDelivery: async (payload: AssignDeliveryPayload): Promise<Delivery> => {
    const id = payload.deliveryId || '';
    const res = await api.post<DeliveryResponse>(`/deliveries/${id}/assign`, payload);
    return res.data.delivery;
  },

  // Assign delivery partner by Order ID (creates delivery record if needed)
  assignDeliveryByOrderId: async (orderId: string, partnerId: string, notes?: string): Promise<Delivery> => {
    const res = await api.post<DeliveryResponse>(`/deliveries/order/${orderId}/assign`, { partnerId, notes });
    return res.data.delivery;
  },

  // Accept delivery assignment (delivery partner)
  acceptDelivery: (id: string, payload?: UpdateDeliveryStatusPayload) =>
    api.post<DeliveryResponse>(`/deliveries/${id}/accept`, payload || {}),

  // Start delivery / mark in transit (delivery partner)
  startDelivery: (id: string, payload?: UpdateDeliveryStatusPayload) =>
    api.post<DeliveryResponse>(`/deliveries/${id}/start`, payload || {}),

  // Verify the buyer's delivery OTP at the door (delivery partner).
  // Prepaid orders are delivered immediately; COD orders then need cash collection.
  verifyDeliveryOtp: (id: string, otp: string) =>
    api.post<VerifyDeliveryOtpResponse>(`/deliveries/${id}/verify-otp`, { otp }),

  // Complete delivery / mark as delivered (delivery partner)
  completeDelivery: (id: string, payload?: UpdateDeliveryStatusPayload) =>
    api.post<DeliveryResponse>(`/deliveries/${id}/complete`, payload || {}),
};
