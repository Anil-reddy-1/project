import { Router, Request, Response } from "express";
import { verifyFirebaseToken } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import { adminDb } from "../config/firebase";
import { FieldValue, GeoPoint } from "firebase-admin/firestore";
import * as geofire from "geofire-common";
import itemsRouter from "./items.routes";

const router = Router();

// Mount items router under shops
router.use("/:shopId/items", itemsRouter);

// ─── POST /shops ────────────────────────────────────────────────────────────
// Create a new shop. Only active wholesalers can create a shop.
router.post(
  "/",
  verifyFirebaseToken,
  requireRole("wholesaler"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { uid, status } = req.user!;
      if (status !== "active") {
        res.status(403).json({ error: "Forbidden", message: "Account is not active." });
        return;
      }

      // Check if user already has a shop
      const userDoc = await adminDb().collection("users").doc(uid).get();
      if (userDoc.exists && userDoc.data()?.shopId) {
        res.status(409).json({ error: "Conflict", message: "Wholesaler already has a shop." });
        return;
      }

      const { name, address, lat, lng, category, operatingHours, moqThreshold, photoUrl } = req.body;

      if (!name || !address || lat === undefined || lng === undefined || !category || !operatingHours || moqThreshold === undefined) {
        res.status(400).json({ error: "Bad Request", message: "Missing required fields." });
        return;
      }

      // Compute geohash
      const geohash = geofire.geohashForLocation([lat, lng]);
      const geopoint = new GeoPoint(lat, lng);

      const shopRef = adminDb().collection("shops").doc();
      const shopId = shopRef.id;

      const now = FieldValue.serverTimestamp();

      const shopData = {
        shopId,
        ownerUid: uid,
        name,
        address,
        geopoint,
        geohash,
        category,
        operatingHours,
        verificationStatus: "pending",
        moqThreshold: Number(moqThreshold),
        photoUrl: photoUrl || null,
        createdAt: now,
        updatedAt: now,
      };

      // Atomic write: Create shop and update user's shopId
      const batch = adminDb().batch();
      batch.set(shopRef, shopData);
      batch.update(adminDb().collection("users").doc(uid), { 
        shopId,
        updatedAt: now
      });

      await batch.commit();

      res.status(201).json(shopData);
    } catch (err) {
      console.error("[POST /shops]", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// ─── GET /shops ─────────────────────────────────────────────────────────────
// List shops. Supports geospatial querying if lat, lng, radius (in km) are provided.
router.get(
  "/",
  verifyFirebaseToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { lat, lng, radiusInKm } = req.query;

      if (lat && lng && radiusInKm) {
        const center = [Number(lat), Number(lng)] as [number, number];
        const radiusInM = Number(radiusInKm) * 1000;
        
        // Calculate geohash query bounds
        const bounds = geofire.geohashQueryBounds(center, radiusInM);
        const promises = [];

        for (const b of bounds) {
          const q = adminDb()
            .collection("shops")
            .where("verificationStatus", "==", "verified")
            .orderBy("geohash")
            .startAt(b[0])
            .endAt(b[1]);
          promises.push(q.get());
        }

        const snapshots = await Promise.all(promises);
        
        const matchingDocs: any[] = [];
        for (const snap of snapshots) {
          for (const doc of snap.docs) {
            const data = doc.data();
            const distanceInKm = geofire.distanceBetween([data.geopoint.latitude, data.geopoint.longitude], center);
            if (distanceInKm <= Number(radiusInKm)) {
              matchingDocs.push({ ...data, distanceInKm });
            }
          }
        }

        // Sort by distance
        matchingDocs.sort((a, b) => a.distanceInKm - b.distanceInKm);

        res.json({ shops: matchingDocs });
      } else {
        // Fallback: list all verified shops (maybe paginate in the future)
        const snapshot = await adminDb()
          .collection("shops")
          .where("verificationStatus", "==", "verified")
          .limit(50)
          .get();
        
        const shops = snapshot.docs.map(doc => doc.data());
        res.json({ shops });
      }
    } catch (err) {
      console.error("[GET /shops]", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// ─── GET /shops/:shopId ─────────────────────────────────────────────────────
router.get(
  "/:shopId",
  verifyFirebaseToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const doc = await adminDb().collection("shops").doc(req.params.shopId).get();
      if (!doc.exists) {
        res.status(404).json({ error: "Not Found", message: "Shop not found." });
        return;
      }
      res.json(doc.data());
    } catch (err) {
      console.error("[GET /shops/:shopId]", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// ─── PATCH /shops/:shopId ───────────────────────────────────────────────────
router.patch(
  "/:shopId",
  verifyFirebaseToken,
  requireRole("wholesaler", "admin"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { shopId } = req.params;
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
      
      const updateableFields = ["name", "address", "category", "operatingHours", "moqThreshold", "photoUrl"];
      for (const field of updateableFields) {
        if (updates[field] !== undefined) {
          allowedUpdates[field] = updates[field];
        }
      }

      // Re-compute geohash if lat/lng change
      if (updates.lat !== undefined && updates.lng !== undefined) {
        allowedUpdates.geopoint = new GeoPoint(Number(updates.lat), Number(updates.lng));
        allowedUpdates.geohash = geofire.geohashForLocation([Number(updates.lat), Number(updates.lng)]);
      }

      // Only admin can change verificationStatus
      if (role === "admin" && updates.verificationStatus) {
        allowedUpdates.verificationStatus = updates.verificationStatus;
      }

      if (Object.keys(allowedUpdates).length === 0) {
        res.status(400).json({ error: "Bad Request", message: "No valid fields to update." });
        return;
      }

      allowedUpdates.updatedAt = FieldValue.serverTimestamp();

      await adminDb().collection("shops").doc(shopId).update(allowedUpdates);

      res.json({ message: "Shop updated successfully" });
    } catch (err) {
      console.error("[PATCH /shops/:shopId]", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
