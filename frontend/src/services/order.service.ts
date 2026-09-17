import { api } from './api.service';

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Order {
  id: string;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'processing' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  deliveryStatus: 'pending' | 'assigned' | 'in_progress' | 'delivered';
  createdAt: string;
}

export interface OrdersResponse {
  success: boolean;
  data: {
    orders: Order[];
  };
}

export interface CreateOrderPayload {
  customerId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  deliveryAddress: {
    name: string;
    phone: string;
    addressLine: string;
    city: string;
    state: string;
    postalCode: string;
  };
}

export interface UpdateOrderStatusPayload {
  status: 'confirmed' | 'processing' | 'completed' | 'cancelled';
  notes?: string;
}

export const orderService = {
  getOrders: (params?: {
    status?: string;
    customer?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => api.get<OrdersResponse>('/orders', params),

  createOrder: (payload: CreateOrderPayload) =>
    api.post<{ success: boolean; data: { order: Order } }>('/orders', payload),

  updateOrderStatus: (id: string, payload: UpdateOrderStatusPayload) =>
    api.patch<{ success: boolean; data: { order: Order } }>(
      `/orders/${id}/status`,
      payload
    ),
};
