/**
 * TypeScript type definitions for User entity.
 * Derived from: schema.md §1 — `users/{uid}`
 */

/** User roles — set as Firebase custom claims, server-side only */
export type UserRole = "retailer" | "wholesaler" | "delivery_partner" | "admin";

/** User account status */
export type UserStatus = "active" | "suspended" | "pending_approval";

/** User document shape — Firestore `users/{uid}` */
export interface User {
  /** Firebase Auth UID (document ID) */
  uid: string;

  /** User role — stored as Firebase custom claim, mirrored in Firestore */
  role: UserRole;

  /** Account status */
  status: UserStatus;

  /** Full name */
  name: string;

  /** Phone number — E.164 format recommended */
  phone: string;

  /** Email — required for email/password auth path */
  email?: string;

  /**
   * Shop reference — present only if `role === "wholesaler"`
   * References: `shops/{shopId}`
   */
  shopId?: string;

  /**
   * Exclusive shop references — present only if `role === "delivery_partner"`
   * Empty array = open-pool partner
   * References: `shops/{shopId}`
   */
  exclusiveShopIds?: string[];

  /**
   * Admin UID who created this account — present if admin-provisioned
   * References: `users/{uid}` where role === "admin"
   */
  createdBy?: string;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Firebase Auth custom claims shape.
 * Set server-side via Firebase Admin SDK — never client-side.
 */
export interface AuthClaims {
  role: UserRole;
  status: UserStatus;
}
