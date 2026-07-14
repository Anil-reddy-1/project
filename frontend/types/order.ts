/**
 * TypeScript type definitions for Order entity.
 * Derived from: schema.md §4 — `orders/{orderId}`
 *
 * The order state machine is the core of the platform.
 * See rules.md §2 for transition rules and permissions.
 */

/** All possible order states — schema.md §4 */
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

/** Terminal states — orders in these states cannot transition further */
export type TerminalOrderState = "REJECTED" | "CANCELLED" | "PAYMENT_SETTLED";

/** Payment method */
export type PaymentMethod = "prepaid" | "cod";

/**
 * Payment status — values depend on payment method.
 * Prepaid: "pending" | "paid" | "failed"
 * COD: tracked primarily via ledger_entries, not this field alone
 */
export type PaymentStatus = "pending" | "paid" | "failed";

/** Rejection reason — per open question resolution */
export type RejectionReason =
  | "stock_unavailable"
  | "moq_unmet"
  | "pricing_error"
  | "suspicious_order"
  | "other";

/** Line item snapshot in an order — price frozen at order time */
export interface OrderItem {
  /** References: `items/{shopId}/products/{itemId}` */
  itemId: string;
  qty: number;
  /** Price snapshotted at order time — not live-referenced */
  price: number;
}

/**
 * State history entry — append-only audit trail.
 * This IS the audit trail (tech-spec.md §9).
 * Never overwrite entries.
 */
export interface StateHistoryEntry {
  state: OrderState;
  timestamp: Date;
  /** The user who triggered this transition */
  actorUid: string;
}

/** Order document shape — Firestore `orders/{orderId}` */
export interface Order {
  /** Document ID */
  orderId: string;

  /** Retailer who placed the order — References: `users/{uid}` */
  retailerUid: string;

  /**
   * Single-shop scoped — never multi-shop (PRD.md §3.1).
   * References: `shops/{shopId}`
   */
  shopId: string;

  /** Line items with snapshotted prices */
  items: OrderItem[];

  /** Total order value — exact, never rounded */
  totalValue: number;

  /** Payment method selected at checkout */
  paymentMethod: PaymentMethod;

  /** Payment status — see type definition for method-specific values */
  paymentStatus: PaymentStatus;

  /** Current order state — see OrderState type */
  state: OrderState;

  /**
   * Assigned delivery partner — set once state reaches ASSIGNED.
   * References: `users/{uid}` where role === "delivery_partner"
   */
  assignedPartnerUid?: string;

  /** Pickup OTP bcrypt hash — set at READY_FOR_PICKUP transition */
  pickupOtpHash?: string;

  /** Drop OTP bcrypt hash — set at PICKED_UP transition */
  dropOtpHash?: string;

  /**
   * Pickup OTP expiry — set at READY_FOR_PICKUP transition.
   * Separate field per open question resolution (two independent OTP lifecycles).
   */
  pickupOtpExpiresAt?: Date;

  /**
   * Drop OTP expiry — set at PICKED_UP transition.
   * Separate field per open question resolution.
   */
  dropOtpExpiresAt?: Date;

  /**
   * Append-only state history — this IS the audit trail.
   * Every transition appends one entry. Never overwrite.
   */
  stateHistory: StateHistoryEntry[];

  /** Rejection reason — set on REJECTED state */
  rejectionReason?: RejectionReason;

  /** Optional freeform rejection note — required when reason is "other" */
  rejectionNote?: string;

  createdAt: Date;
  updatedAt: Date;
}
