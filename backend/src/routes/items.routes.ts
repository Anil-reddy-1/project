import { Router, type Request, type Response } from "express";
import { verifyFirebaseToken } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import { validateItemCreation, validateItemUpdate } from "../middleware/validate";
import { adminDb } from "../config/firebase";
import { FieldValue } from "firebase-admin/firestore";

// mergeParams: true so /:shopId from the parent shops router is accessible
const router = Router({ mergeParams: true });

// ─── POST /shops/:shopId/items ──────────────────────────────────────────────
// Create a catalog item. Only the shop owner (active wholesaler) can do this.
router.post(
  "/",
  verifyFirebaseToken,
  requireRole("wholesaler"),
  validateItemCreation,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { shopId } = req.params;
      const { uid, status } = req.user!;

      if (status !== "active") {
        res.status(403).json({ error: "Forbidden", message: "Account not active." });
        return;
      }

      const shopDoc = await adminDb().collection("shops").doc(shopId).get();
      if (!shopDoc.exists) {
        res.status(404).json({ error: "Not Found", message: "Shop not found." });
        return;
      }
      if (shopDoc.data()?.ownerUid !== uid) {
        res.status(403).json({ error: "Forbidden", message: "Not your shop." });
        return;
      }

      const { name, price, stockQty, unit, isAvailable, images } = req.body as {
        name: string;
        price: number;
        stockQty: number;
        unit: string;
        isAvailable?: boolean;
        images?: Array<{ url: string; publicId: string }>;
      };

      // Validation already done by middleware - fields are guaranteed to be valid

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
        images: images ?? [], // Array of { url, publicId }
        updatedAt: now,
      };

      await itemRef.set(itemData);

      res.status(201).json(itemData);
    } catch (err) {
      console.error("[POST /shops/:shopId/items]", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// ─── GET /shops/:shopId/items ───────────────────────────────────────────────
// List all items for a shop.
// Owner/admin see ALL items. Other callers see only isAvailable=true items.
router.get(
  "/",
  verifyFirebaseToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { shopId } = req.params;
      const { uid, role } = req.user!;

      // BUG-2 fix: fetch shop and items in parallel, not sequentially
      const shopPromise = adminDb().collection("shops").doc(shopId).get();
      const itemsPromise = adminDb().collection("shops").doc(shopId).collection("products").get();
      shopPromise.catch(() => {});
      itemsPromise.catch(() => {});

      const [shopDoc, itemsSnap] = await Promise.all([shopPromise, itemsPromise]);

      if (!shopDoc.exists) {
        res.status(404).json({ error: "Not Found", message: "Shop not found." });
        return;
      }

      const isOwnerOrAdmin = role === "admin" || shopDoc.data()?.ownerUid === uid;
      const items = itemsSnap.docs.map((doc) => doc.data());
      const filtered = isOwnerOrAdmin ? items : items.filter((item) => item.isAvailable);

      res.json({ items: filtered });
    } catch (err) {
      console.error("[GET /shops/:shopId/items]", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// ─── PATCH /shops/:shopId/items/:itemId ─────────────────────────────────────
// Update an item's mutable fields. Owner or admin only.
router.patch(
  "/:itemId",
  verifyFirebaseToken,
  requireRole("wholesaler", "admin"),
  validateItemUpdate,
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

      const itemRef = adminDb().collection("shops").doc(shopId).collection("products").doc(itemId);
      const itemDoc = await itemRef.get();
      if (!itemDoc.exists) {
        res.status(404).json({ error: "Not Found", message: "Item not found." });
        return;
      }

      const updates = req.body;
      const allowedUpdates: Record<string, unknown> = {};

      // Validation middleware has already validated all provided fields
      if (updates.name !== undefined) allowedUpdates.name = String(updates.name);
      if (updates.price !== undefined) allowedUpdates.price = Number(updates.price);
      if (updates.stockQty !== undefined) allowedUpdates.stockQty = Number(updates.stockQty);
      if (updates.unit !== undefined) allowedUpdates.unit = String(updates.unit);
      if (updates.isAvailable !== undefined) allowedUpdates.isAvailable = Boolean(updates.isAvailable);
      if (updates.images !== undefined && Array.isArray(updates.images)) {
        allowedUpdates.images = updates.images;
      }

      if (Object.keys(allowedUpdates).length === 0) {
        res.status(400).json({ error: "Bad Request", message: "No valid fields to update." });
        return;
      }

      allowedUpdates.updatedAt = FieldValue.serverTimestamp();
      await itemRef.update(allowedUpdates);

      res.json({ message: "Item updated." });
    } catch (err) {
      console.error("[PATCH /shops/:shopId/items/:itemId]", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// ─── DELETE /shops/:shopId/items/:itemId ────────────────────────────────────
// Delete an item. Owner or admin only. Returns 404 if item doesn't exist.
router.delete(
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

      // BUG-3 fix: check item exists before deleting
      const itemRef = adminDb().collection("shops").doc(shopId).collection("products").doc(itemId);
      const itemDoc = await itemRef.get();
      if (!itemDoc.exists) {
        res.status(404).json({ error: "Not Found", message: "Item not found." });
        return;
      }

      await itemRef.delete();

      res.json({ message: "Item deleted." });
    } catch (err) {
      console.error("[DELETE /shops/:shopId/items/:itemId]", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
