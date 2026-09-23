import { api } from './api.service';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: string;
}

export interface DeliveryAddress {
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
}

export interface Order {
  id: string;
  userId: string;
  firebaseUid: string;
  orderNumber: string;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  orderStatus: 'pending' | 'confirmed' | 'assigned' | 'delivered' | 'completed' | 'cancelled';
  deliveryAddress: DeliveryAddress;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  customerName?: string;
  customerEmail?: string;
}

export interface OrdersListResponse {
  success: boolean;
  message: string;
  data: {
    orders: Order[];
    total: number;
    page: number;
    limit: number;
  };
}

export interface OrderResponse {
  success: boolean;
  message: string;
  data: {
    order: Order;
  };
}

export interface CreateOrderPayload {
  addressId: string;
  paymentMethod?: string;
  notes?: string;
}

export interface UpdateOrderStatusPayload {
  status: 'pending' | 'confirmed' | 'assigned' | 'delivered' | 'completed' | 'cancelled';
  notes?: string;
}

export interface CancelOrderPayload {
  reason: string;
}

export interface ValidateOrderPayload {
  addressId: string;
}

export interface ValidateOrderResponse {
  success: boolean;
  message: string;
  data: {
    valid: boolean;
    errors: string[];
  };
}

export interface OrderStatsResponse {
  success: boolean;
  message: string;
  data: {
    totalOrders: number;
    pendingOrders: number;
    confirmedOrders: number;
    deliveredOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    totalSpent: number;
  };
}

export const orderService = {
  // Create new order from cart
  createOrder: (payload: CreateOrderPayload) =>
    api.post<OrderResponse>('/orders', payload),

  // Validate order before placement
  validateOrder: (payload: ValidateOrderPayload) =>
    api.post<ValidateOrderResponse>('/orders/validate', payload),

  // Get current user's orders
  getMyOrders: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => api.get<OrdersListResponse>('/orders/me', params),

  // Get all orders (admin only)
  getAllOrders: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    paymentStatus?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }) => api.get<OrdersListResponse>('/orders', params),

  // Get order by ID
  getOrderById: (id: string) =>
    api.get<OrderResponse>(`/orders/${id}`),

  // Get order by order number
  getOrderByNumber: (orderNumber: string) =>
    api.get<OrderResponse>(`/orders/number/${orderNumber}`),

  // Get current user's order statistics
  getMyOrderStats: () =>
    api.get<OrderStatsResponse>('/orders/stats/me'),

  // Update order status (admin only)
  updateOrderStatus: (id: string, payload: UpdateOrderStatusPayload) =>
    api.patch<OrderResponse>(`/orders/${id}/status`, payload),

  // Cancel order
  cancelOrder: (id: string, payload: CancelOrderPayload) =>
    api.post<OrderResponse>(`/orders/${id}/cancel`, payload),
};
