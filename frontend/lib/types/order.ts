/**
 * Order and Order-related TypeScript types
 * Phase 3: Order Placement & Checkout
 * 
 * These types match the backend types but are tailored for frontend use
 */

export type OrderState =
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "PACKED"
  | "READY_FOR_PICKUP"
  | "ASSIGNED"
  | "PICKED_UP"
  | "ON_THE_WAY"
  | "DELIVERED"
  | "CANCELLED"
  | "DISPUTED"
  | "PAYMENT_SETTLED";

export type PaymentMethod = "PHONEPE" | "COD";

export type PaymentStatus =
  | "PENDING"
  | "INITIATED"
  | "SUCCESS"
  | "FAILED"
  | "PENDING_COD"
  | "CANCELLED"
  | "EXPIRED";

export interface OrderItem {
  itemId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  moq: number;
  totalPrice: number;
  imageUrl?: string;
}

export interface DeliveryAddress {
  addressId?: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  isDefault?: boolean;
}

export interface Order {
  orderId: string;
  orderNumber: string;
  
  // Retailer information
  retailerId: string;
  retailerName: string;
  retailerEmail: string;
  retailerPhone: string;
  
  // Shop information
  shopId: string;
  shopName: string;
  
  // Order items
  items: OrderItem[];
  
  // Pricing breakdown
  subtotal: number;
  deliveryCharges: number;
  tax: number;
  discount: number;
  grandTotal: number;
  
  // Delivery information
  deliveryAddress: DeliveryAddress;
  
  // Payment information
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentId?: string;
  
  // Order status
  orderState: OrderState;
  
  // Timestamps
  createdAt: string | Date;
  updatedAt: string | Date;
  
  // Audit
  createdBy: string;
}

export interface OrderAuditLog {
  orderId: string;
  timestamp: string | Date;
  action: string;
  performedBy: string;
  performedByRole: string;
  oldState?: string;
  newState: string;
  metadata?: any;
}

export interface CreateOrderRequest {
  items: {
    itemId: string;
    quantity: number;
  }[];
  deliveryAddress: DeliveryAddress;
  paymentMethod: PaymentMethod;
  saveAddress?: boolean;
}

export interface CreateOrderResponse {
  success: boolean;
  message: string;
  data: {
    orderId: string;
    orderNumber: string;
    paymentId?: string;
    phonepeRedirectUrl?: string;
    state?: OrderState;
    grandTotal?: number;
  };
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
    auditLog?: OrderAuditLog[];
  };
}
