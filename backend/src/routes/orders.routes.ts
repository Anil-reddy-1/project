/**
 * Order routes — order lifecycle and state machine.
 * Derived from: tech-spec.md §6, PRD.md §3, rules.md §2, Phase 3+
 *
 * Every state transition is a POST to a named action endpoint (not a PATCH to state).
 * This enforces the state machine contract — you can't set an arbitrary state,
 * you can only trigger a valid action for your role.
 *
 * STATUS: Phase 0 stub — route shapes defined, implementations in Phase 3+.
 */

import { Router, type Request, type Response } from "express";
import { verifyFirebaseToken } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";

const router = Router();

// ─── Order CRUD ───────────────────────────────────────────────────────────────

/**
 * GET /orders
 * List orders scoped to the caller's role:
 *  - retailer: their own orders
 *  - wholesaler: orders for their shop
 *  - delivery_partner: orders assigned to them
 *  - admin: all orders (with filters)
 */
router.get("/", verifyFirebaseToken, async (_req: Request, res: Response) => {
  res.status(501).json({ message: "Phase 3 — not yet implemented" });
});

/**
 * GET /orders/:orderId
 * Get a single order. Role-scoped access enforced in implementation.
 */
router.get(
  "/:orderId",
  verifyFirebaseToken,
  async (_req: Request, res: Response) => {
    res.status(501).json({ message: "Phase 3 — not yet implemented" });
  },
);

/**
 * POST /orders
 * Place a new order (Retailer only).
 * Body: { shopId, items: [{itemId, qty}], paymentMethod }
 *
 * For prepaid: returns { orderId, razorpayOrderId } → frontend opens Razorpay checkout.
 * For COD: returns { orderId } directly with state PLACED.
 */
router.post(
  "/",
  verifyFirebaseToken,
  requireRole("retailer"),
  async (_req: Request, res: Response) => {
    res.status(501).json({ message: "Phase 3 — not yet implemented" });
  },
);

// ─── State machine actions ─────────────────────────────────────────────────────
// Each action is a named POST, not a PATCH to state directly.

/** POST /orders/:orderId/approve — Wholesaler approves (PLACED → APPROVED + inventory decrement) */
router.post(
  "/:orderId/approve",
  verifyFirebaseToken,
  requireRole("wholesaler"),
  async (_req: Request, res: Response) => {
    res.status(501).json({ message: "Phase 4 — not yet implemented" });
  },
);

/** POST /orders/:orderId/reject — Wholesaler rejects (PLACED → REJECTED) */
router.post(
  "/:orderId/reject",
  verifyFirebaseToken,
  requireRole("wholesaler"),
  async (_req: Request, res: Response) => {
    res.status(501).json({ message: "Phase 4 — not yet implemented" });
  },
);

/** POST /orders/:orderId/pack — Wholesaler marks packed (APPROVED → PACKED) */
router.post(
  "/:orderId/pack",
  verifyFirebaseToken,
  requireRole("wholesaler"),
  async (_req: Request, res: Response) => {
    res.status(501).json({ message: "Phase 4 — not yet implemented" });
  },
);

/** POST /orders/:orderId/ready — Wholesaler marks ready for pickup + generates pickup OTP (PACKED → READY_FOR_PICKUP) */
router.post(
  "/:orderId/ready",
  verifyFirebaseToken,
  requireRole("wholesaler"),
  async (_req: Request, res: Response) => {
    res.status(501).json({ message: "Phase 4 — not yet implemented" });
  },
);

/** POST /orders/:orderId/cancel — Retailer or Admin cancels (PLACED|APPROVED|PACKED → CANCELLED) */
router.post(
  "/:orderId/cancel",
  verifyFirebaseToken,
  requireRole("retailer", "admin"),
  async (_req: Request, res: Response) => {
    res.status(501).json({ message: "Phase 4 — not yet implemented" });
  },
);

/** POST /orders/:orderId/assign — Internal/admin triggers assignment (READY_FOR_PICKUP → ASSIGNED) */
router.post(
  "/:orderId/assign",
  verifyFirebaseToken,
  requireRole("admin"),
  async (_req: Request, res: Response) => {
    res.status(501).json({ message: "Phase 5 — not yet implemented" });
  },
);

/** POST /orders/:orderId/verify-pickup — Wholesaler verifies pickup OTP (ASSIGNED → PICKED_UP) */
router.post(
  "/:orderId/verify-pickup",
  verifyFirebaseToken,
  requireRole("wholesaler"),
  async (_req: Request, res: Response) => {
    res.status(501).json({ message: "Phase 6 — not yet implemented" });
  },
);

/** POST /orders/:orderId/verify-drop — Delivery partner verifies drop OTP (ON_THE_WAY → DELIVERED) */
router.post(
  "/:orderId/verify-drop",
  verifyFirebaseToken,
  requireRole("delivery_partner"),
  async (_req: Request, res: Response) => {
    res.status(501).json({ message: "Phase 6 — not yet implemented" });
  },
);

/** POST /orders/:orderId/mark-cash-collected — Delivery partner marks COD cash collected (DELIVERED → ledger entry) */
router.post(
  "/:orderId/mark-cash-collected",
  verifyFirebaseToken,
  requireRole("delivery_partner"),
  async (_req: Request, res: Response) => {
    res.status(501).json({ message: "Phase 7 — not yet implemented" });
  },
);

/** POST /orders/:orderId/dispute — Retailer raises a dispute (DELIVERED+ only) */
router.post(
  "/:orderId/dispute",
  verifyFirebaseToken,
  requireRole("retailer"),
  async (_req: Request, res: Response) => {
    res.status(501).json({ message: "Phase 8 — not yet implemented" });
  },
);

export default router;
