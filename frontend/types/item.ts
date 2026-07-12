/**
 * TypeScript type definitions for Item/Product entity.
 * Derived from: schema.md §3 — `items/{shopId}/products/{itemId}`
 */

/** Product document shape — Firestore subcollection under shop */
export interface Item {
  /** Document ID */
  itemId: string;

  /** Product display name */
  name: string;

  /** Price per unit — exact, never rounded (rules.md §5) */
  price: number;

  /**
   * Current stock quantity.
   * Decremented only at PLACED → APPROVED transition (rules.md §2).
   */
  stockQty: number;

  /** Unit of measurement (e.g., "kg", "box", "unit", "piece") */
  unit: string;

  /**
   * Availability toggle — controlled by wholesaler.
   * When false, item is hidden from retailer browsing but not deleted.
   */
  isAvailable: boolean;

  /**
   * How this item counts toward the shop-order MOQ.
   * MOQ is per-shop-order total, not per-item (rules.md §3).
   */
  moqContribution?: number;

  updatedAt: Date;
}
