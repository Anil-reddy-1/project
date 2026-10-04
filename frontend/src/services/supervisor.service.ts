import { api } from './api.service';

/**
 * Supervisor Service
 * API calls for supervisor-specific order preparation and handoff workflow
 */

// Local types (the order service doesn't export shared interfaces)
interface Order {
  id: string;
  orderNumber: string;
  totalAmount: number;
  orderStatus: string;
  paymentMethod: string;
  paymentStatus: string;
  pickupOtp?: string | null;
  pickupOtpExpiresAt?: string | null;
  deliveryAddress: any;
  notes?: string;
  items?: any[];
  customerName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarkAsPreparingResponse {
  success: boolean;
  message: string;
  data: { order: Order };
}

export interface MarkAsPackedResponse {
  success: boolean;
  message: string;
  data: { order: Order };
}

export interface VerifyOtpResponse {
  success: boolean;
  message: string;
  data: { order: Order };
}

export const supervisorService = {
  // Get all orders (supervisor has same access as admin for viewing)
  getAllOrders: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    paymentStatus?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }) => api.get<any>('/orders', params),

  // Get order by ID
  getOrderById: (id: string) =>
    api.get<any>(`/orders/${id}`),

  // Mark order as preparing
  markAsPreparing: (orderId: string) =>
    api.post<MarkAsPreparingResponse>(`/orders/${orderId}/prepare`, {}),

  // Mark order as packed (generates OTP)
  markAsPacked: (orderId: string) =>
    api.post<MarkAsPackedResponse>(`/orders/${orderId}/pack`, {}),

  // Verify pickup OTP
  verifyPickupOtp: (orderId: string, otp: string) =>
    api.post<VerifyOtpResponse>(`/orders/${orderId}/verify-otp`, { otp }),

  // Assign delivery partner to order
  assignDeliveryPartner: (orderId: string, partnerId: string, notes?: string) =>
    api.post<any>(`/deliveries/order/${orderId}/assign`, { partnerId, notes }),

  // Get available delivery partners
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

  // Update order status
  updateOrderStatus: (id: string, payload: { status: string; notes?: string }) =>
    api.patch<any>(`/orders/${id}/status`, payload),
};
