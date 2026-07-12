/**
 * Order state constants and transition map.
 * Derived from: rules.md §2 — Order State Machine (authoritative)
 *
 * Every transition must be validated as (currentState, action, actorRole) → nextState.
 * Invalid combinations must throw, never silently no-op.
 */

import type { OrderState, UserRole } from "@/types";

/** All valid order states */
export const ORDER_STATES: readonly OrderState[] = [
  "PLACED",
  "APPROVED",
  "REJECTED",
  "PACKED",
  "READY_FOR_PICKUP",
  "ASSIGNED",
  "PICKED_UP",
  "ON_THE_WAY",
  "DELIVERED",
  "CANCELLED",
  "DISPUTED",
  "PAYMENT_SETTLED",
] as const;

/** Terminal states — no further transitions allowed */
export const TERMINAL_STATES: readonly OrderState[] = [
  "REJECTED",
  "CANCELLED",
  "PAYMENT_SETTLED",
] as const;

/**
 * States where retailer cancellation is permitted (rules.md §2).
 * Once READY_FOR_PICKUP or later, cancellation is blocked.
 */
export const CANCELLABLE_STATES: readonly OrderState[] = [
  "PLACED",
  "APPROVED",
  "PACKED",
] as const;

/**
 * States where order edits are permitted (rules.md §2).
 * Only while state === PLACED.
 */
export const EDITABLE_STATES: readonly OrderState[] = ["PLACED"] as const;

/**
 * States where live delivery tracking is shown to the retailer.
 * From ASSIGNED onward — tech-spec.md §10.
 */
export const LIVE_TRACKING_STATES: readonly OrderState[] = [
  "ASSIGNED",
  "PICKED_UP",
  "ON_THE_WAY",
] as const;

/**
 * Valid state transitions with required actor role.
 * This is the authoritative transition map from rules.md §2.
 *
 * Key: current state
 * Value: array of { action, nextState, allowedRoles }
 */
export const STATE_TRANSITIONS: Record<
  string,
  Array<{
    action: string;
    nextState: OrderState;
    allowedRoles: UserRole[];
  }>
> = {
  PLACED: [
    { action: "approve", nextState: "APPROVED", allowedRoles: ["wholesaler", "admin"] },
    { action: "reject", nextState: "REJECTED", allowedRoles: ["wholesaler", "admin"] },
    { action: "cancel", nextState: "CANCELLED", allowedRoles: ["retailer", "admin"] },
  ],
  APPROVED: [
    { action: "pack", nextState: "PACKED", allowedRoles: ["wholesaler"] },
    { action: "cancel", nextState: "CANCELLED", allowedRoles: ["retailer", "admin"] },
  ],
  PACKED: [
    { action: "ready_for_pickup", nextState: "READY_FOR_PICKUP", allowedRoles: ["wholesaler"] },
    { action: "cancel", nextState: "CANCELLED", allowedRoles: ["retailer", "admin"] },
  ],
  READY_FOR_PICKUP: [
    { action: "assign", nextState: "ASSIGNED", allowedRoles: ["admin"] },
  ],
  ASSIGNED: [
    { action: "pickup", nextState: "PICKED_UP", allowedRoles: ["admin"] },
  ],
  PICKED_UP: [
    { action: "in_transit", nextState: "ON_THE_WAY", allowedRoles: ["delivery_partner"] },
  ],
  ON_THE_WAY: [
    { action: "deliver", nextState: "DELIVERED", allowedRoles: ["admin"] },
  ],
  DELIVERED: [
    { action: "settle_payment", nextState: "PAYMENT_SETTLED", allowedRoles: ["admin"] },
    { action: "dispute", nextState: "DISPUTED", allowedRoles: ["retailer"] },
  ],
  DISPUTED: [
    { action: "resolve", nextState: "DELIVERED", allowedRoles: ["admin"] },
  ],
};

/**
 * Human-readable labels for order states.
 * Used in status badges across all role dashboards.
 * Must always pair with semantic color — never color alone (design-doc.md §7).
 */
export const ORDER_STATE_LABELS: Record<OrderState, string> = {
  PLACED: "Order Placed",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PACKED: "Packed",
  READY_FOR_PICKUP: "Ready for Pickup",
  ASSIGNED: "Partner Assigned",
  PICKED_UP: "Picked Up",
  ON_THE_WAY: "On the Way",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  DISPUTED: "Disputed",
  PAYMENT_SETTLED: "Payment Settled",
};

/**
 * Semantic color mapping for order states.
 * Maps to design-doc.md §2.1 color tokens.
 * These are the ONLY colors used for order state — never decoratively (design-doc.md §2.1).
 */
export const ORDER_STATE_COLORS: Record<OrderState, string> = {
  PLACED: "amber",
  APPROVED: "signal",
  REJECTED: "red",
  PACKED: "signal",
  READY_FOR_PICKUP: "amber",
  ASSIGNED: "violet",
  PICKED_UP: "violet",
  ON_THE_WAY: "violet",
  DELIVERED: "green",
  CANCELLED: "red",
  DISPUTED: "red",
  PAYMENT_SETTLED: "green",
};

/**
 * Ordered list of states for the threaded timeline component.
 * This is the visual progression shown to all roles (design-doc.md §3).
 */
export const TIMELINE_STATES: readonly OrderState[] = [
  "PLACED",
  "APPROVED",
  "PACKED",
  "PICKED_UP",
  "ON_THE_WAY",
  "DELIVERED",
] as const;
