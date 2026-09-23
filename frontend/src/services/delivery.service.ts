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
  orderId: string;
  deliveryPartnerId?: string;
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
  deliveryPartnerId: string;
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
  assignDelivery: (id: string, payload: AssignDeliveryPayload) =>
    api.post<DeliveryResponse>(`/deliveries/${id}/assign`, payload),

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
