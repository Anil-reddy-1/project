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
  | "PLACED"
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
  | "pending"
  | "paid"
  | "failed"
  | "refunded";

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

// ─── Uploads ──────────────────────────────────────────────────────────────────

/** Cloudinary folder targets for different upload contexts */
export type UploadFolder =
  | "shop_photos"
  | "verification_images"
  | "dispute_attachments";
