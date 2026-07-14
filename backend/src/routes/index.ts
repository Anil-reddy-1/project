/**
 * Route registry — mounts all sub-routers under their prefixes.
 * Derived from: tech-spec.md §12
 *
 * Adding a new feature set = import its router and add one line here.
 */

import { Router } from "express";
import uploadRouter from "./upload.routes";
import authRouter from "./auth.routes";
import usersRouter from "./users.routes";
import shopsRouter from "./shops.routes";
import ordersRouter from "./orders.routes";
import paymentsRouter from "./payments.routes";

const router = Router();

// ─── Health check (unauthenticated) ──────────────────────────────────────────
router.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Feature routers ──────────────────────────────────────────────────────────
router.use("/upload", uploadRouter);     // File uploads → Cloudinary
router.use("/auth", authRouter);         // Role/claim management (Phase 1)
router.use("/users", usersRouter);       // User CRUD (Phase 1)
router.use("/shops", shopsRouter);       // Shop + item CRUD (Phase 2)
router.use("/orders", ordersRouter);     // Order state machine (Phase 3+)
router.use("/payments", paymentsRouter); // Payment handling (Phase 3)

export default router;
