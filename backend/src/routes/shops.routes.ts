import { Router, type Request, type Response } from "express";
import { verifyFirebaseToken } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import { validateShopCreation, validateShopUpdate } from "../middleware/validate";
import { preventMultipleShops, preventShopOwnerChange } from "../middleware/single-shop-validation";
import { adminDb } from "../config/firebase";
import { FieldValue, GeoPoint } from "firebase-admin/firestore";
import * as geofire from "geofire-common";
import itemsRouter from "./items.routes";

// BUG-5 fix: mergeParams: true so /:shopId is accessible in child routers
const router = Router({ mergeParams: true });

// Mount items router — inherits :shopId via mergeParams
router.use("/:shopId/items", itemsRouter);

// ─── POST /shops ─────────────────────────────────────────────────────────────
// Create a new shop. Only an active wholesaler without an existing shop can call this.
// PHASE 2.5: Single-shop validation prevents multiple shops from being created.
router.post(
  "/",
  verifyFirebaseToken,
  requireRole("wholesaler"),
  validateShopCreation,
  preventMultipleShops,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { uid, status } = req.user!;

      if (status !== "active") {
        res.status(403).json({ error: "Forbidden", message: "Account is not active." });
        return;
      }

      // One shop per wholesaler
      const userDoc = await adminDb().collection("users").doc(uid).get();
      if (userDoc.data()?.shopId) {
        res.status(409).json({ error: "Conflict", message: "You already have a shop." });
        return;
      }

      const { name, address, lat, lng, category, operatingHours, moqThreshold, photoUrl } = req.body as {
        name: string;
        address: string;
        lat: number;
        lng: number;
        category: string;
        operatingHours: { days: string[]; open: string; close: string };
        moqThreshold: number;
        photoUrl?: string;
      };

      // Validation already done by middleware - these fields are guaranteed to exist and be valid
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
        verificationStatus: "verified" as const,
        moqThreshold: Number(moqThreshold),
        photoUrl: photoUrl ?? null,
        createdAt: now,
        updatedAt: now,
      };

      // Atomic batch: create shop + link shopId on user doc
      const batch = adminDb().batch();
      batch.set(shopRef, shopData);
      batch.update(adminDb().collection("users").doc(uid), { shopId, updatedAt: now });
      await batch.commit();

      res.status(201).json({ ...shopData, shopId });
    } catch (err) {
      console.error("[POST /shops]", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// ─── GET /shops ───────────────────────────────────────────────────────────────
// List verified shops.
// With lat + lng + radiusInKm: geohash radius query (sorted by distance).
// Without: simple paginated list of verified shops.
//
// BUG-4 fix: The composite index issue with verificationStatus + geohash orderBy
// is avoided by querying ONLY on geohash (which uses a range — Firestore allows
// a range on one field with orderBy on that same field without a composite index)
// and then post-filtering for verificationStatus === "verified".
router.get(
  "/",
  verifyFirebaseToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { lat, lng, radiusInKm } = req.query as {
        lat?: string;
        lng?: string;
        radiusInKm?: string;
      };

      if (lat && lng && radiusInKm) {
        const latNum = Number(lat);
        const lngNum = Number(lng);
        const radiusNum = Number(radiusInKm);

        if (isNaN(latNum) || isNaN(lngNum) || isNaN(radiusNum) || radiusNum <= 0) {
          res.status(400).json({ error: "Bad Request", message: "lat, lng must be numbers; radiusInKm must be a positive number." });
          return;
        }

        const center: [number, number] = [latNum, lngNum];
        const radiusInM = radiusNum * 1000;
        const bounds = geofire.geohashQueryBounds(center, radiusInM);

        // Query on geohash range only — no composite index needed
        // Post-filter verificationStatus in memory (avoids Firestore composite index requirement)
        const snapshots = await Promise.all(
          bounds.map((b) =>
            adminDb()
              .collection("shops")
              .orderBy("geohash")
              .startAt(b[0])
              .endAt(b[1])
              .get()
          )
        );

        const results: Array<Record<string, unknown> & { distanceInKm: number }> = [];
        for (const snap of snapshots) {
          for (const doc of snap.docs) {
            const data = doc.data();
            // Post-filter: only verified shops
            if (data.verificationStatus !== "verified") continue;
            const gp = data.geopoint as GeoPoint;
            const distanceInKm = geofire.distanceBetween([gp.latitude, gp.longitude], center);
            if (distanceInKm <= radiusNum) {
              results.push({ ...data, distanceInKm: Math.round(distanceInKm * 100) / 100 });
            }
          }
        }

        results.sort((a, b) => a.distanceInKm - b.distanceInKm);
        res.json({ shops: results });
      } else {
        const snapshot = await adminDb()
          .collection("shops")
          .where("verificationStatus", "==", "verified")
          .orderBy("createdAt", "desc")
          .limit(50)
          .get();

        res.json({ shops: snapshot.docs.map((d) => d.data()) });
      }
    } catch (err) {
      console.error("[GET /shops]", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// ─── GET /shops/all ───────────────────────────────────────────────────────────
// List ALL shops (admin only) - includes pending, verified, and rejected shops
router.get(
  "/all",
  verifyFirebaseToken,
  requireRole("admin"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const snapshot = await adminDb()
        .collection("shops")
        .orderBy("createdAt", "desc")
        .get();

      res.json({ shops: snapshot.docs.map((d) => d.data()) });
    } catch (err) {
      console.error("[GET /shops/all]", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// ─── GET /shops/:shopId ───────────────────────────────────────────────────────
// Get a single shop by ID.
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

// ─── PATCH /shops/:shopId ─────────────────────────────────────────────────────
// Update shop profile. Owner or admin only.
// Admin can also change verificationStatus.
// PHASE 2.5: Prevents changing shop ownership.
router.patch(
  "/:shopId",
  verifyFirebaseToken,
  requireRole("wholesaler", "admin"),
  validateShopUpdate,
  preventShopOwnerChange,
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

      const body = req.body as Record<string, unknown>;
      const allowedUpdates: Record<string, unknown> = {};

      // Validation middleware has already validated all fields
      const mutableFields = ["name", "address", "category", "operatingHours", "moqThreshold", "photoUrl"] as const;
      for (const field of mutableFields) {
        if (body[field] !== undefined) allowedUpdates[field] = body[field];
      }

      // Re-compute geohash if location changes
      if (body.lat !== undefined && body.lng !== undefined) {
        const lat = Number(body.lat);
        const lng = Number(body.lng);
        allowedUpdates.geopoint = new GeoPoint(lat, lng);
        allowedUpdates.geohash = geofire.geohashForLocation([lat, lng]);
      }

      // Only admin can verify / reject a shop (validation middleware already checked format)
      if (role === "admin" && body.verificationStatus !== undefined) {
        allowedUpdates.verificationStatus = body.verificationStatus;
      }

      if (Object.keys(allowedUpdates).length === 0) {
        res.status(400).json({ error: "Bad Request", message: "No valid fields to update." });
        return;
      }

      allowedUpdates.updatedAt = FieldValue.serverTimestamp();
      await adminDb().collection("shops").doc(shopId).update(allowedUpdates);

      res.json({ message: "Shop updated." });
    } catch (err) {
      console.error("[PATCH /shops/:shopId]", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
