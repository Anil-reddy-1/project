/**
 * TypeScript type definitions for Shop entity.
 * Derived from: schema.md §2 — `shops/{shopId}`
 */

import type { GeoPoint } from "firebase/firestore";

/** Shop verification status — recommended values per open question resolution */
export type VerificationStatus = "unverified" | "pending" | "verified";

/**
 * Operating hours for a single day.
 * Times in 24-hour "HH:mm" format (e.g., "09:00", "18:30").
 * Recommended structure per open question resolution.
 */
export interface DayHours {
  open: string;
  close: string;
  isClosed: boolean;
}

/** Days of the week — used as keys for operating hours */
export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

/** Operating hours map — day of week to hours */
export type OperatingHours = Record<DayOfWeek, DayHours>;

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

  /** Shop category (e.g., "grocery", "electronics", "textiles") */
  category: string;

  /** Weekly operating hours — see DayHours */
  operatingHours: OperatingHours;

  /** Verification status */
  verificationStatus: VerificationStatus;

  /**
   * Minimum order value/qty threshold per shop-order.
   * MOQ is enforced per shop-order as a whole, not per line item (rules.md §3).
   */
  moqThreshold: number;

  /** Shop photo URL — Firebase Storage */
  photoUrl?: string;

  createdAt: Date;
  updatedAt: Date;
}
