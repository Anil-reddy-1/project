/**
 * Role-based access control middleware factory.
 * Derived from: tech-spec.md §3.2, rules.md §1
 *
 * Usage:
 *   router.post("/approve", verifyFirebaseToken, requireRole("wholesaler"), handler)
 *   router.get("/admin/users", verifyFirebaseToken, requireRole("admin"), handler)
 *   router.post("/orders", verifyFirebaseToken, requireRole("retailer", "admin"), handler)
 *
 * Always apply verifyFirebaseToken BEFORE requireRole.
 */

import type { Request, Response, NextFunction } from "express";
import type { UserRole } from "../types";

/**
 * requireRole — Express middleware factory
 *
 * Returns a middleware that allows the request only if req.user.role
 * is one of the provided roles. Otherwise responds 403.
 *
 * @param roles — one or more allowed roles
 */
export function requireRole(
  ...roles: UserRole[]
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      // verifyFirebaseToken was not applied — misconfigured route
      res.status(500).json({
        error: "Internal Server Error",
        message: "requireRole used without verifyFirebaseToken",
      });
      return;
    }

    if (!req.user.role || !roles.includes(req.user.role)) {
      res.status(403).json({
        error: "Forbidden",
        message: `This action requires one of: [${roles.join(", ")}]. Your role: ${req.user.role ?? "none (no role assigned)"}`,
      });
      return;
    }

    next();
  };
}
