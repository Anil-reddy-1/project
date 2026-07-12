/**
 * TypeScript type definitions for Ledger Entry entity.
 * Derived from: schema.md §5 — `ledger_entries/{entryId}`
 *
 * Ledger entries track COD cash custody from collection to confirmation.
 * Amounts are never rounded (rules.md §5).
 */

/** Ledger entry status */
export type LedgerStatus =
  | "PENDING_CONFIRMATION"
  | "CONFIRMED"
  | "ESCALATED";

/** Ledger entry document shape — Firestore `ledger_entries/{entryId}` */
export interface LedgerEntry {
  /** Document ID */
  entryId: string;

  /** Order this entry relates to — References: `orders/{orderId}` */
  orderId: string;

  /** Delivery partner who collected cash — References: `users/{uid}` */
  partnerUid: string;

  /** Wholesaler who must confirm receipt — References: `users/{uid}` */
  wholesalerUid: string;

  /** Exact cash amount — never rounded */
  amount: number;

  /** Current ledger status */
  status: LedgerStatus;

  /** When cash was collected by the delivery partner */
  collectedAt: Date;

  /** When wholesaler confirmed receipt — set on CONFIRMED */
  confirmedAt?: Date;

  /** When SLA breach was detected — set on ESCALATED */
  escalatedAt?: Date;
}
