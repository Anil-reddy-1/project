/**
 * TypeScript type definitions for Dispute entity.
 * Derived from: schema.md §6 — `disputes/{disputeId}`
 *
 * Disputes are post-delivery recourse for retailers.
 * Every resolution requires mandatory notes (app-flow.md §4.4).
 */

/** Dispute reason — per open question resolution */
export type DisputeReason =
  | "damaged_goods"
  | "shortage"
  | "wrong_item"
  | "quality_issue"
  | "other";

/** Dispute status — per open question resolution */
export type DisputeStatus =
  | "open"
  | "under_review"
  | "responded"
  | "resolved";

/**
 * Admin resolution action types.
 * Each requires mandatory resolution notes (rules.md §6).
 */
export type DisputeResolutionAction =
  | "force_cancel"
  | "force_settle"
  | "reassign_partner"
  | "close_no_action";

/** Dispute document shape — Firestore `disputes/{disputeId}` */
export interface Dispute {
  /** Document ID */
  disputeId: string;

  /**
   * Must reference a DELIVERED (or later state) order.
   * References: `orders/{orderId}`
   */
  orderId: string;

  /** Retailer who raised the dispute — References: `users/{uid}` */
  raisedByUid: string;

  /** Dispute reason category */
  reason: DisputeReason;

  /** Current dispute status */
  status: DisputeStatus;

  /** Freeform description from the retailer */
  description?: string;

  /** Optional photo evidence URLs — Firebase Storage */
  photoUrls?: string[];

  /** Wholesaler's response text */
  wholesalerResponse?: string;

  /**
   * Admin resolution notes — required for any resolution action.
   * Never allow a resolution without notes (rules.md §6).
   */
  resolutionNotes?: string;

  /** Resolution action taken by admin */
  resolutionAction?: DisputeResolutionAction;

  /**
   * Admin who resolved the dispute.
   * References: `users/{uid}` where role === "admin"
   */
  resolvedByUid?: string;

  createdAt: Date;
  updatedAt: Date;
}
