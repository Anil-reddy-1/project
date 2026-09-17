import { api } from './api.service';

export interface Delivery {
  id: string;
  orderId: string;
  customer: {
    name: string;
    phone: string;
    address: string;
  };
  partner?: {
    id: string;
    name: string;
  };
  status: 'pending' | 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'failed';
  amount: number;
  assignedAt?: string;
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface DeliveriesResponse {
  success: boolean;
  data: {
    deliveries: Delivery[];
  };
}

export interface AssignDeliveryPayload {
  partnerId: string;
}

export interface UpdateDeliveryStatusPayload {
  status: 'accepted' | 'in_progress' | 'completed' | 'failed';
  notes?: string;
  proofOfDelivery?: string;
}

export const deliveryService = {
  getDeliveries: (params?: {
    status?: string;
    partnerId?: string;
  }) => api.get<DeliveriesResponse>('/deliveries', params),

  assignDelivery: (id: string, payload: AssignDeliveryPayload) =>
    api.post<{ success: boolean; data: { delivery: Delivery } }>(
      `/deliveries/${id}/assign`,
      payload
    ),

  updateDeliveryStatus: (id: string, payload: UpdateDeliveryStatusPayload) =>
    api.patch<{ success: boolean; data: { delivery: Delivery } }>(
      `/deliveries/${id}/status`,
      payload
    ),
};
