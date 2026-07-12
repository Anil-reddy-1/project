/**
 * Ledger constants.
 * Derived from: schema.md §5, rules.md §5
 */

import type { LedgerStatus } from "@/types";

/** All valid ledger entry statuses */
export const LEDGER_STATUSES: readonly LedgerStatus[] = [
  "PENDING_CONFIRMATION",
  "CONFIRMED",
  "ESCALATED",
] as const;

/** Human-readable labels for ledger statuses */
export const LEDGER_STATUS_LABELS: Record<LedgerStatus, string> = {
  PENDING_CONFIRMATION: "Pending Confirmation",
  CONFIRMED: "Confirmed",
  ESCALATED: "Escalated",
};

/**
 * Semantic color mapping for ledger statuses.
 * Consistent with order state color vocabulary (design-doc.md §10).
 */
export const LEDGER_STATUS_COLORS: Record<LedgerStatus, string> = {
  PENDING_CONFIRMATION: "amber",
  CONFIRMED: "green",
  ESCALATED: "red",
};
