/**
 * TypeScript type definitions for Delivery Partner Meta entity.
 * Derived from: schema.md §7 — `delivery_partners_meta/{uid}`
 *
 * This collection supports the geo-based delivery assignment engine.
 * It is a supplementary doc keyed by the partner's user UID.
 */

/** Delivery partner metadata — Firestore `delivery_partners_meta/{uid}` */
export interface DeliveryPartnerMeta {
  /** Same as user UID — document ID */
  uid: string;

  /** Whether this partner is shop-exclusive */
  isExclusive: boolean;

  /**
   * Linked shop IDs — non-empty only if isExclusive is true.
   * Empty array = open-pool partner.
   * References: `shops/{shopId}`
   */
  linkedShopIds: string[];

  /** Online/offline toggle — controlled by the partner */
  isOnline: boolean;

  /**
   * Current geohash — mirrors RTDB location at lower frequency.
   * Used for eligibility queries in the assignment engine.
   */
  currentGeohash: string;

  /**
   * Currently active order IDs — supports batching.
   * Multiple concurrent orders allowed if geographically clustered.
   * References: `orders/{orderId}`
   */
  activeOrderIds: string[];

  /** Partner rating — optional, computed metric */
  rating?: number;

  /** Assignment acceptance rate — computed metric for Admin performance view */
  acceptanceRate?: number;
}
