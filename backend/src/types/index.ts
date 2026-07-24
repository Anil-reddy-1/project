/**
 * Shared TypeScript types — mirrored from frontend/types/ for backend use.
 * Derived from: schema.md, tech-spec.md §3.2
 *
 * Keep this file in sync with frontend/types/index.ts.
 * Single source of truth for enum values to prevent drift between
 * frontend and backend (rules.md — lock enums before any phase starts).
 */

// ─── Auth / Users ─────────────────────────────────────────────────────────────

export type UserRole =
  | "retailer"
  | "wholesaler"
  | "delivery_partner"
  | "admin";

export type UserStatus = "active" | "suspended" | "pending_approval";

// ─── Orders ───────────────────────────────────────────────────────────────────

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

export type PaymentMethod = "prepaid" | "cod";

export type PaymentStatus =
  | "PENDING"
  | "INITIATED"
  | "SUCCESS"
  | "FAILED"
  | "PENDING_COD"
  | "CANCELLED"
  | "EXPIRED"
  | "paid"
  | "failed"
  | "pending";

// ─── Order Rejection (Phase 4) ───────────────────────────────────────────────

export type OrderRejectionReason =
  | "out_of_stock"
  | "moq_not_met"
  | "pricing_error"
  | "suspicious_order"
  | "wholesaler_unavailable"
  | "other";

// ─── Ledger ───────────────────────────────────────────────────────────────────

export type LedgerStatus =
  | "PENDING_CONFIRMATION"
  | "CONFIRMED"
  | "ESCALATED";

// ─── Disputes ─────────────────────────────────────────────────────────────────

export type DisputeStatus =
  | "OPEN"
  | "WHOLESALER_RESPONDED"
  | "RESOLVED"
  | "CLOSED_NO_ACTION";

// ─── Shops ────────────────────────────────────────────────────────────────────

export type VerificationStatus = "pending" | "verified" | "rejected";

export type DayOfWeek = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export interface OperatingHours {
  days: DayOfWeek[];
  open: string;  // "HH:MM" format
  close: string; // "HH:MM" format
}

// ─── Uploads ──────────────────────────────────────────────────────────────────

/** Cloudinary folder targets for different upload contexts */
export type UploadFolder =
  | "shop_photos"
  | "verification_images"
  | "dispute_attachments"
  | "product_images";

// ─── Orders & Payments (Phase 3) ─────────────────────────────────────────────

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
  addressId: string;
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
  
  // Shop information (single shop)
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
  paymentDetails?: any;
  
  // Order status
  orderState: OrderState;
  
  // Timestamps
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  
  // Audit
  createdBy: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface Payment {
  paymentId: string;
  orderId: string;
  
  // Payment gateway details
  gateway: "PHONEPE";
  merchantTransactionId: string;
  gatewayTransactionId?: string;
  
  // Amount
  amount: number;
  currency: "INR";
  
  // Status tracking
  status: PaymentStatus;
  
  // PhonePe specific
  phonePeResponse?: any;
  checksum?: string;
  
  // Retry tracking
  retryCount: number;
  maxRetries: number;
  
  // Timestamps
  initiatedAt: any; // Firestore Timestamp
  completedAt?: any; // Firestore Timestamp
  expiresAt: any; // Firestore Timestamp
  
  // Audit
  retailerId: string;
  ipAddress?: string;
  webhookReceived: boolean;
  webhookData?: any;
}

export interface OrderAuditLog {
  orderId: string;
  timestamp: any; // Firestore Timestamp
  action: string;
  performedBy: string;
  performedByRole: UserRole;
  oldState?: string;
  newState: string;
  metadata?: any;
  ipAddress?: string;
}

export interface CartValidationResult {
  valid: boolean;
  errors: string[];
  items?: OrderItem[];
  subtotal?: number;
  grandTotal?: number;
}

export interface PaymentInitiationRequest {
  orderId: string;
  amount: number;
  retailerId: string;
  retailerName: string;
  retailerEmail: string;
  retailerPhone: string;
}

export interface PaymentVerificationResult {
  success: boolean;
  status: PaymentStatus;
  orderId?: string;
  orderNumber?: string;
  transactionId?: string;
  message?: string;
}
