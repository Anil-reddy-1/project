/**
 * TypeScript type definitions for Shop entity.
 * Derived from: schema.md §2 — `shops/{shopId}`
 */

import type { GeoPoint } from "firebase/firestore";

/** Shop verification status — aligned with backend */
export type VerificationStatus = "pending" | "verified" | "rejected";

/** Days of the week */
export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

/**
 * Operating hours structure.
 * Contains days open and time range.
 * Aligned with backend validation.
 */
export interface OperatingHours {
  days: DayOfWeek[];
  open: string;  // "HH:MM" format
  close: string; // "HH:MM" format
}

/** Shop document shape — Firestore `shops/{shopId}` */
export interface Shop {
  /** Document ID */
  shopId: string;

  /**
   * Owner reference — must be a wholesaler-role user
   * References: `users/{uid}` where role === "wholesaler"
   */
  ownerUid: string;

  /** Shop display name */
  name: string;

  /** Full address string */
  address: string;

  /** Geographic coordinates */
  geopoint: GeoPoint;

  /** Geohash computed via geofire-common — used for radius queries */
  geohash: string;

  /** Shop category (e.g., "groceries", "dairy", "bakery") */
  category: string;

  /** Weekly operating hours */
  operatingHours: OperatingHours;

  /** Verification status */
  verificationStatus: VerificationStatus;

  /**
   * Minimum order value threshold per shop-order.
   * MOQ is enforced per shop-order as a whole, not per line item (rules.md §3).
   */
  moqThreshold: number;

  /** Shop photo URL — Cloudinary */
  photoUrl?: string | null;

  createdAt: Date;
  updatedAt: Date;
}

