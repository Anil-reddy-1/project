import { api } from './api.service';

export interface DeliveryStatusHistory {
  id: string;
  deliveryId: string;
  status: string;
  changedBy: string;
  notes?: string;
  createdAt: string;
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

export interface UpdateDeliveryStatusPayload {
  notes?: string;
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

  // Get delivery status history
  getDeliveryHistory: (id: string) =>
    api.get<DeliveryHistoryResponse>(`/deliveries/${id}/history`),

  // Assign delivery to partner (admin only)
  assignDelivery: async (payload: AssignDeliveryPayload): Promise<Delivery> => {
    const id = payload.deliveryId || '';
    const res = await api.post<DeliveryResponse>(`/deliveries/${id}/assign`, payload);
    return res.data.delivery;
  },

  // Accept delivery assignment (delivery partner)
  acceptDelivery: (id: string, payload?: UpdateDeliveryStatusPayload) =>
    api.post<DeliveryResponse>(`/deliveries/${id}/accept`, payload || {}),

  // Start delivery / mark in transit (delivery partner)
  startDelivery: (id: string, payload?: UpdateDeliveryStatusPayload) =>
    api.post<DeliveryResponse>(`/deliveries/${id}/start`, payload || {}),

  // Complete delivery / mark as delivered (delivery partner)
  completeDelivery: (id: string, payload?: UpdateDeliveryStatusPayload) =>
    api.post<DeliveryResponse>(`/deliveries/${id}/complete`, payload || {}),
};
