/**
 * Payment constants.
 * Derived from: schema.md §4, rules.md §5
 */

import type { PaymentMethod, PaymentStatus } from "@/types";

/** All valid payment methods */
export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  "prepaid",
  "cod",
] as const;

/** All valid payment statuses */
export const PAYMENT_STATUSES: readonly PaymentStatus[] = [
  "pending",
  "paid",
  "failed",
] as const;

/** Human-readable labels for payment methods */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  prepaid: "Prepaid (Online)",
  cod: "Cash on Delivery",
};

/** Human-readable labels for payment statuses */
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Payment Pending",
  paid: "Paid",
  failed: "Payment Failed",
};
