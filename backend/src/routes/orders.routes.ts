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
import { orderService } from "../services/order.service";
import { adminDb } from "../config/firebase";
import {
  sendCODConfirmation,
  sendNewOrderAlertToWholesaler,
} from "../services/notification.service";

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
router.get("/", verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.uid;
    const userRole = req.user!.role as any;

    // Parse query parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const state = req.query.state as any;
    const paymentStatus = req.query.paymentStatus as string;

    // Get orders with role-based filtering
    const result = await orderService.getOrdersForUser(userId, userRole, {
      page,
      limit,
      state,
      paymentStatus,
    });

    return res.status(200).json({
      success: true,
      data: result.orders,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error('[Orders] List orders error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch orders',
    });
  }
});

/**
 * GET /orders/:orderId
 * Get a single order. Role-scoped access enforced in implementation.
 */
router.get(
  "/:orderId",
  verifyFirebaseToken,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.uid;
      const userRole = req.user!.role as any;
      const { orderId } = req.params;

      const order = await orderService.getOrderById(orderId, userId, userRole);

      // Fetch audit log
      const auditLog = await orderService.getOrderAuditLog(orderId);

      return res.status(200).json({
        success: true,
        data: {
          ...order,
          auditLog,
        },
      });
    } catch (error: any) {
      console.error('[Orders] Get order error:', error);
      
      if (error.message === 'Order not found') {
        return res.status(404).json({
          success: false,
          message: 'Order not found',
        });
      }

      if (error.message === 'Unauthorized access to order') {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to fetch order',
      });
    }
  },
);

/**
 * POST /orders
 * Place a new order (Retailer only).
 * Body: { items: [{itemId, quantity}], deliveryAddress, paymentMethod, saveAddress }
 *
 * For prepaid: returns { orderId, orderNumber, paymentId, phonepeRedirectUrl }
 * For COD: returns { orderId, orderNumber, state, grandTotal }
 */
router.post(
  "/",
  verifyFirebaseToken,
  requireRole("retailer"),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.uid;
      const { items, deliveryAddress, paymentMethod, saveAddress } = req.body;

      // Validate request body
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cart items are required',
        });
      }

      if (!deliveryAddress) {
        return res.status(400).json({
          success: false,
          message: 'Delivery address is required',
        });
      }

      if (!paymentMethod || !['prepaid', 'cod'].includes(paymentMethod)) {
        return res.status(400).json({
          success: false,
          message: 'Valid payment method is required (prepaid or cod)',
        });
      }

      // Create order
      const order = await orderService.createOrder(
        userId,
        items,
        deliveryAddress,
        paymentMethod
      );

      // Save address to user profile if requested
      if (saveAddress) {
        const db = adminDb();
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        const userData = userDoc.data();
        
        const addresses = userData?.deliveryAddresses || [];
        addresses.push({
          id: `addr_${Date.now()}`,
          ...deliveryAddress,
          isDefault: addresses.length === 0,
          createdAt: new Date(),
        });

        await userRef.update({ deliveryAddresses: addresses });
      }

      // Send notifications
      if (paymentMethod === 'prepaid') {
        // For prepaid, notifications will be sent after payment verification
        return res.status(200).json({
          success: true,
          message: 'Order created, redirecting to payment',
          data: {
            orderId: order.orderId,
            orderNumber: order.orderNumber,
            paymentId: order.paymentId,
            phonepeRedirectUrl: (order as any).redirectUrl,
            amount: order.grandTotal,
          },
        });
      } else {
        // Send COD confirmation
        await sendCODConfirmation({
          orderId: order.orderId,
          orderNumber: order.orderNumber,
          retailerName: order.retailerSnapshot.name,
          retailerEmail: order.retailerSnapshot.email,
          wholesalerEmail: '', // Will be fetched in notification service
          grandTotal: order.grandTotal,
          itemCount: order.items.length,
          paymentMethod: 'cod',
          paymentStatus: 'pending',
          createdAt: order.createdAt,
        });

        // Send new order alert to wholesaler
        await sendNewOrderAlertToWholesaler({
          orderId: order.orderId,
          orderNumber: order.orderNumber,
          retailerName: order.retailerSnapshot.name,
          retailerEmail: order.retailerSnapshot.email,
          wholesalerEmail: '', // Will be fetched in notification service
          grandTotal: order.grandTotal,
          itemCount: order.items.length,
          paymentMethod: 'cod',
          paymentStatus: 'pending',
          createdAt: order.createdAt,
        });

        return res.status(200).json({
          success: true,
          message: 'Order placed successfully',
          data: {
            orderId: order.orderId,
            orderNumber: order.orderNumber,
            state: order.state,
            grandTotal: order.grandTotal,
          },
        });
      }
    } catch (error: any) {
      console.error('[Orders] Create order error:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to create order',
      });
    }
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
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.uid;
      const { orderId } = req.params;
      const { reason } = req.body;

      if (!reason || typeof reason !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Cancellation reason is required',
        });
      }

      const order = await orderService.cancelOrder(orderId, userId, reason);

      return res.status(200).json({
        success: true,
        message: 'Order cancelled successfully',
        data: order,
      });
    } catch (error: any) {
      console.error('[Orders] Cancel order error:', error);

      if (error.message === 'Order not found') {
        return res.status(404).json({
          success: false,
          message: 'Order not found',
        });
      }

      if (error.message === 'Order cannot be cancelled in current state') {
        return res.status(400).json({
          success: false,
          message: 'Order cannot be cancelled in current state',
        });
      }

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to cancel order',
      });
    }
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
