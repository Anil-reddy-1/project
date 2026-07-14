/**
 * Orders API Client
 * Derived from: Phase 3 Implementation Plan §9.4.1
 * 
 * API client functions for order management:
 * - Create order (checkout)
 * - List orders (with filters and pagination)
 * - Get order details
 * - Cancel order
 */

import { apiClient } from './client';
import type { OrderState, PaymentMethod } from '@/types';

// ─── Request/Response Types ───────────────────────────────────────────────────

export interface CreateOrderRequest {
  items: Array<{
    itemId: string;
    quantity: number;
  }>;
  deliveryAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
    landmark?: string;
  };
  paymentMethod: PaymentMethod;
  saveAddress?: boolean;
}

export interface CreateOrderResponse {
  success: boolean;
  message: string;
  data: {
    orderId: string;
    orderNumber: string;
    // Prepaid orders include payment info
    paymentId?: string;
    phonepeRedirectUrl?: string;
    amount?: number;
    // COD orders include state and total
    state?: string;
    grandTotal?: number;
  };
}

export interface OrderFilters {
  page?: number;
  limit?: number;
  state?: OrderState;
  paymentStatus?: string;
}

export interface Order {
  orderId: string;
  orderNumber: string;
  state: OrderState;
  retailerId: string;
  retailerSnapshot: {
    name: string;
    email: string;
    phone: string;
  };
  shopId: string;
  shopSnapshot: {
    name: string;
    phone: string;
    address: string;
  };
  wholesalerId: string;
  items: Array<{
    itemId: string;
    productSnapshot: {
      name: string;
      description: string;
      imageUrl: string;
      category: string;
      sku?: string;
      barcode?: string;
    };
    priceSnapshot: {
      unitPrice: number;
      moq: number;
      currency: string;
    };
    quantity: number;
    itemTotal: number;
    availableStock: number;
  }>;
  subtotal: number;
  taxAmount: number;
  taxPercentage: number;
  deliveryCharge: number;
  discount: number;
  grandTotal: number;
  deliveryAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
    landmark?: string;
  };
  paymentMethod: PaymentMethod;
  paymentId?: string;
  paymentStatus: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  placedAt?: Date | string;
  lastActionBy?: string;
  lastActionAt?: Date | string;
  lastAction?: string;
}

export interface OrderListResponse {
  success: boolean;
  data: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface OrderDetailsResponse {
  success: boolean;
  data: Order & {
    auditLog?: Array<{
      logId: string;
      orderId: string;
      action: string;
      actorId: string;
      actorRole: string;
      beforeState?: OrderState;
      afterState?: OrderState;
      metadata?: any;
      timestamp: Date | string;
    }>;
  };
}

export interface CancelOrderRequest {
  reason: string;
}

export interface CancelOrderResponse {
  success: boolean;
  message: string;
  data: Order;
}

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * Create a new order
 * 
 * @param data - Order creation data
 * @returns Order creation response with payment info (if prepaid)
 */
export async function createOrder(
  data: CreateOrderRequest
): Promise<CreateOrderResponse> {
  return apiClient<CreateOrderResponse>('/orders', {
    method: 'POST',
    body: data,
  });
}

/**
 * Get list of orders with optional filters
 * 
 * @param filters - Optional filters (page, limit, state, paymentStatus)
 * @returns Paginated list of orders
 */
export async function getOrders(
  filters?: OrderFilters
): Promise<OrderListResponse> {
  const params = new URLSearchParams();
  
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.state) params.append('state', filters.state);
  if (filters?.paymentStatus) params.append('paymentStatus', filters.paymentStatus);

  const queryString = params.toString();
  const endpoint = queryString ? `/orders?${queryString}` : '/orders';

  return apiClient<OrderListResponse>(endpoint);
}

/**
 * Get order details by ID
 * 
 * @param orderId - Order ID
 * @returns Order details with audit log
 */
export async function getOrderById(orderId: string): Promise<OrderDetailsResponse> {
  return apiClient<OrderDetailsResponse>(`/orders/${orderId}`);
}

/**
 * Cancel an order
 * Only allowed for orders in PENDING_APPROVAL state
 * 
 * @param orderId - Order ID
 * @param reason - Cancellation reason
 * @returns Updated order
 */
export async function cancelOrder(
  orderId: string,
  reason: string
): Promise<CancelOrderResponse> {
  return apiClient<CancelOrderResponse>(`/orders/${orderId}/cancel`, {
    method: 'POST',
    body: { reason },
  });
}
