import { Router, Request, Response } from "express";
import { verifyFirebaseToken } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import { adminDb } from "../config/firebase";
import { FieldValue } from "firebase-admin/firestore";

const router = Router({ mergeParams: true }); // Access :shopId from parent router

// ─── POST /shops/:shopId/items ──────────────────────────────────────────────
router.post(
  "/",
  verifyFirebaseToken,
  requireRole("wholesaler"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { shopId } = req.params;
      const { uid, status } = req.user!;

      if (status !== "active") {
        res.status(403).json({ error: "Forbidden", message: "Account not active." });
        return;
      }

      const shopDoc = await adminDb().collection("shops").doc(shopId).get();
      if (!shopDoc.exists || shopDoc.data()?.ownerUid !== uid) {
        res.status(403).json({ error: "Forbidden", message: "Not your shop." });
        return;
      }

      const { name, price, stockQty, unit, isAvailable } = req.body;

      if (!name || price === undefined || stockQty === undefined || !unit) {
        res.status(400).json({ error: "Bad Request", message: "Missing required fields." });
        return;
      }

      const itemRef = adminDb().collection("shops").doc(shopId).collection("products").doc();
      const itemId = itemRef.id;

      const now = FieldValue.serverTimestamp();
      const itemData = {
        itemId,
        name,
        price: Number(price),
        stockQty: Number(stockQty),
        unit,
        isAvailable: isAvailable ?? true,
        updatedAt: now,
      };

      await itemRef.set(itemData);

      res.status(201).json(itemData);
    } catch (err) {
      console.error("[POST /items]", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// ─── GET /shops/:shopId/items ───────────────────────────────────────────────
router.get(
  "/",
  verifyFirebaseToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { shopId } = req.params;
      
      const snapshot = await adminDb()
        .collection("shops")
        .doc(shopId)
        .collection("products")
        .get();
      
      const items = snapshot.docs.map(doc => doc.data());

      // If the caller is not the owner (or admin), filter out unavailable items
      const { uid, role } = req.user!;
      const shopDoc = await adminDb().collection("shops").doc(shopId).get();
      const isOwnerOrAdmin = role === "admin" || shopDoc.data()?.ownerUid === uid;

      const filteredItems = isOwnerOrAdmin ? items : items.filter(item => item.isAvailable);

      res.json({ items: filteredItems });
    } catch (err) {
      console.error("[GET /items]", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// ─── PATCH /shops/:shopId/items/:itemId ─────────────────────────────────────
router.patch(
  "/:itemId",
  verifyFirebaseToken,
  requireRole("wholesaler", "admin"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { shopId, itemId } = req.params;
      const { uid, role } = req.user!;

      const shopDoc = await adminDb().collection("shops").doc(shopId).get();
      if (!shopDoc.exists) {
        res.status(404).json({ error: "Not Found", message: "Shop not found." });
        return;
      }

      if (role !== "admin" && shopDoc.data()?.ownerUid !== uid) {
        res.status(403).json({ error: "Forbidden", message: "Not your shop." });
        return;
      }

      const updates = req.body;
      const allowedUpdates: Record<string, any> = {};

      if (updates.name !== undefined) allowedUpdates.name = updates.name;
      if (updates.price !== undefined) allowedUpdates.price = Number(updates.price);
      if (updates.stockQty !== undefined) allowedUpdates.stockQty = Number(updates.stockQty);
      if (updates.unit !== undefined) allowedUpdates.unit = updates.unit;
      if (updates.isAvailable !== undefined) allowedUpdates.isAvailable = Boolean(updates.isAvailable);

      if (Object.keys(allowedUpdates).length === 0) {
        res.status(400).json({ error: "Bad Request", message: "No valid fields to update." });
        return;
      }

      allowedUpdates.updatedAt = FieldValue.serverTimestamp();

      const itemRef = adminDb().collection("shops").doc(shopId).collection("products").doc(itemId);
      await itemRef.update(allowedUpdates);

      res.json({ message: "Item updated successfully" });
    } catch (err) {
      console.error("[PATCH /items/:itemId]", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// ─── DELETE /shops/:shopId/items/:itemId ────────────────────────────────────
router.delete(
  "/:itemId",
  verifyFirebaseToken,
  requireRole("wholesaler", "admin"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { shopId, itemId } = req.params;
      const { uid, role } = req.user!;

      const shopDoc = await adminDb().collection("shops").doc(shopId).get();
      if (role !== "admin" && shopDoc.data()?.ownerUid !== uid) {
        res.status(403).json({ error: "Forbidden", message: "Not your shop." });
        return;
      }

      await adminDb().collection("shops").doc(shopId).collection("products").doc(itemId).delete();

      res.json({ message: "Item deleted successfully" });
    } catch (err) {
      console.error("[DELETE /items/:itemId]", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
