/**
 * User role constants.
 * Derived from: schema.md §1, rules.md §1
 */

import type { UserRole, UserStatus } from "@/types";

/** All valid user roles */
export const USER_ROLES: readonly UserRole[] = [
  "retailer",
  "wholesaler",
  "delivery_partner",
  "admin",
] as const;

/** All valid user statuses */
export const USER_STATUSES: readonly UserStatus[] = [
  "active",
  "suspended",
  "pending_approval",
] as const;

/** Human-readable labels for roles */
export const ROLE_LABELS: Record<UserRole, string> = {
  retailer: "Retailer",
  wholesaler: "Wholesaler",
  delivery_partner: "Delivery Partner",
  admin: "Admin",
};

/**
 * Route group path prefix for each role.
 * Maps to Next.js App Router route groups (tech-spec.md §12.1).
 */
export const ROLE_ROUTE_PREFIX: Record<UserRole, string> = {
  retailer: "/retailer",
  wholesaler: "/wholesaler",
  delivery: "/delivery",
  admin: "/admin",
} as unknown as Record<UserRole, string>;

/**
 * Roles that can self-register (rules.md §1).
 * - Retailer: open self-signup
 * - Wholesaler: self-register pending admin approval (creates disabled account)
 */
export const SELF_REGISTERABLE_ROLES: readonly UserRole[] = [
  "retailer",
  "wholesaler",
] as const;

/**
 * Roles that are admin-provisioned only (rules.md §1).
 * No public registration route exists for these roles.
 */
export const ADMIN_PROVISIONED_ROLES: readonly UserRole[] = [
  "delivery_partner",
  "admin",
] as const;
