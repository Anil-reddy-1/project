/**
 * User routes — Admin-provisioned account management.
 * Derived from: tech-spec.md §3.1, §13, rules.md §1, schema.md §1, app-flow.md §4.2
 *
 * Phase 1 implementations:
 *   GET  /users          — Admin: list all users (optional ?role= and ?status= filters)
 *   GET  /users/:uid     — Admin or self: get a single user profile
 *   POST /users          — Admin: provision a wholesaler or delivery_partner account
 *   PATCH /users/:uid    — Admin: update profile fields (name, phone, email only;
 *                          role/status changes go through /auth/set-role, /auth/suspend)
 *
 * Admin-provisioned accounts (wholesaler, delivery_partner):
 *   - Account created with a random temp password (never shared).
 *   - generatePasswordResetLink() is called immediately and dispatched via
 *     CredentialMailer (stub). User sets their own password via the link.
 *   - Forced password reset is enforced naturally: until they click the link,
 *     they have no usable password. No additional schema field needed.
 *
 * Audit trail:
 *   schema.md §1 — createdBy (admin uid) and updatedAt are the account-level
 *   audit fields. No separate stateHistory for users (that's order-specific).
 */

import { Router, type Request, type Response } from "express";
import { FieldValue } from "firebase-admin/firestore";
import { v4 as uuidv4 } from "uuid";
import { verifyFirebaseToken } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import { adminAuth, adminDb } from "../config/firebase";
import { credentialMailer } from "../services/credential-mailer";
import type { UserRole, UserStatus } from "../types";

const router = Router();

// ─── GET /users ───────────────────────────────────────────────────────────────
//
// List all users. Admin only.
// Query params: ?role=retailer|wholesaler|delivery_partner|admin
//               ?status=active|suspended|pending_approval

router.get(
  "/",
  verifyFirebaseToken,
  requireRole("admin"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { role, status } = req.query as {
        role?: UserRole;
        status?: UserStatus;
      };

      let query: FirebaseFirestore.Query = adminDb().collection("users");

      if (role) query = query.where("role", "==", role);
      if (status) query = query.where("status", "==", status);

      const snapshot = await query.orderBy("createdAt", "desc").get();
      const users = snapshot.docs.map((doc) => doc.data());

      res.status(200).json({ users, count: users.length });
    } catch (err) {
      console.error("[GET /users]", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

// ─── GET /users/:uid ──────────────────────────────────────────────────────────
//
// Get a single user's profile.
// Admin can fetch any user. Non-admin can only fetch their own doc.

router.get(
  "/:uid",
  verifyFirebaseToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { uid: targetUid } = req.params;
      const { uid: callerUid, role: callerRole } = req.user!;

      // Non-admin can only read their own profile
      if (callerRole !== "admin" && callerUid !== targetUid) {
        res.status(403).json({ error: "Forbidden", message: "Cannot read another user's profile." });
        return;
      }

      const doc = await adminDb().collection("users").doc(targetUid).get();

      if (!doc.exists) {
        res.status(404).json({ error: "Not Found", message: "User not found." });
        return;
      }

      res.status(200).json({ user: doc.data() });
    } catch (err) {
      console.error("[GET /users/:uid]", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

// ─── POST /users ──────────────────────────────────────────────────────────────
//
// Admin provisions a new wholesaler or delivery_partner account.
// Retailer accounts are created via Firebase Auth self-signup + POST /auth/register.
// Admin accounts are seeded via the seed:admin script — no UI creation path.
//
// Body: {
//   email: string (required — used for Firebase Auth + password reset link),
//   phone: string (required — schema.md §1),
//   name:  string (required),
//   role:  "wholesaler" | "delivery_partner",
// }

router.post(
  "/",
  verifyFirebaseToken,
  requireRole("admin"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, phone, name, role } = req.body as {
        email?: string;
        phone?: string;
        name?: string;
        role?: UserRole;
      };

      // Validate
      if (!email || !phone || !name || !role) {
        res.status(400).json({
          error: "Bad Request",
          message: "email, phone, name, and role are required.",
        });
        return;
      }

      // Only admin can provision wholesaler or delivery_partner
      if (role !== "wholesaler" && role !== "delivery_partner") {
        res.status(400).json({
          error: "Bad Request",
          message: "role must be 'wholesaler' or 'delivery_partner'. " +
            "Retailers self-register. Admin accounts are seeded.",
        });
        return;
      }

      const status: UserStatus = "active";

      // 1. Create Firebase Auth user with a random temporary password.
      //    The user will reset it via the link sent by CredentialMailer.
      const tempPassword = uuidv4(); // random UUID — user never uses this directly
      const authUser = await adminAuth().createUser({
        email,
        password: tempPassword,
        displayName: name,
        emailVerified: false,
      });

      const uid = authUser.uid;

      try {
        // 2. Set custom claims immediately (server-side only — rules.md §1)
        await adminAuth().setCustomUserClaims(uid, { role, status });

        // 3. Generate a password reset link — this IS the credential dispatch.
        //    Until the user clicks this link, they cannot log in.
        const passwordResetLink = await adminAuth().generatePasswordResetLink(email);

        // 4. Create Firestore users/{uid} document (schema.md §1)
        const now = FieldValue.serverTimestamp();
        await adminDb().collection("users").doc(uid).set({
          uid,
          role,
          status,
          name,
          phone,
          email,
          createdBy: req.user!.uid, // audit: which admin provisioned this
          createdAt: now,
          updatedAt: now,
        });

        // 5. Send credentials via CredentialMailer (stub — vendor TBD)
        await credentialMailer.send({
          to: { name, email, phone },
          type: "account_created",
          passwordResetLink,
        });

        res.status(201).json({ uid, email, name, role, status });
      } catch (innerErr) {
        // If anything after createUser() fails, clean up the orphaned Auth user
        // to keep Auth and Firestore in sync.
        console.error("[POST /users] Rolling back Auth user creation:", innerErr);
        await adminAuth().deleteUser(uid).catch((e) =>
          console.error("[POST /users] Rollback failed:", e)
        );
        throw innerErr;
      }
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "auth/email-already-exists") {
        res.status(409).json({
          error: "Conflict",
          message: "An account with this email already exists.",
        });
        return;
      }
      console.error("[POST /users]", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

// ─── PATCH /users/:uid ────────────────────────────────────────────────────────
//
// Update mutable profile fields (name, phone, email).
// Role and status changes go through /auth/set-role, /auth/suspend, /auth/reactivate.
// Admin can update any user. Non-admin can update only their own profile.

router.patch(
  "/:uid",
  verifyFirebaseToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { uid: targetUid } = req.params;
      const { uid: callerUid, role: callerRole } = req.user!;

      // Non-admin can only update their own profile
      if (callerRole !== "admin" && callerUid !== targetUid) {
        res.status(403).json({
          error: "Forbidden",
          message: "Cannot update another user's profile.",
        });
        return;
      }

      const { name, phone, email } = req.body as {
        name?: string;
        phone?: string;
        email?: string;
      };

      // Build update payload — only include fields that were provided
      const updates: Record<string, unknown> = {
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (name !== undefined) updates.name = name;
      if (phone !== undefined) updates.phone = phone;
      if (email !== undefined) updates.email = email;

      if (Object.keys(updates).length === 1) {
        // Only updatedAt — nothing meaningful to update
        res.status(400).json({
          error: "Bad Request",
          message: "Provide at least one of: name, phone, email.",
        });
        return;
      }

      // Verify user doc exists before updating
      const docRef = adminDb().collection("users").doc(targetUid);
      const doc = await docRef.get();
      if (!doc.exists) {
        res.status(404).json({ error: "Not Found", message: "User not found." });
        return;
      }

      // Firestore update
      await docRef.update(updates);

      // Sync email update to Firebase Auth if provided
      if (email) {
        await adminAuth().updateUser(targetUid, { email }).catch((e) =>
          console.warn("[PATCH /users/:uid] Auth email sync failed:", e)
        );
      }

      const updated = await docRef.get();
      res.status(200).json({ user: updated.data() });
    } catch (err) {
      console.error("[PATCH /users/:uid]", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

// ─── Address Management (Phase 3) ─────────────────────────────────────────────

/**
 * GET /users/:uid/addresses
 * Get user's delivery addresses
 */
router.get(
  "/:uid/addresses",
  verifyFirebaseToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { uid: targetUid } = req.params;
      const { uid: callerUid, role: callerRole } = req.user!;

      // Non-admin can only read their own addresses
      if (callerRole !== "admin" && callerUid !== targetUid) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const doc = await adminDb().collection("users").doc(targetUid).get();

      if (!doc.exists) {
        res.status(404).json({ error: "Not Found" });
        return;
      }

      const addresses = doc.data()?.deliveryAddresses || [];
      res.status(200).json({ addresses });
    } catch (err) {
      console.error("[GET /users/:uid/addresses]", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

/**
 * POST /users/:uid/addresses
 * Add a new delivery address
 */
router.post(
  "/:uid/addresses",
  verifyFirebaseToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { uid: targetUid } = req.params;
      const { uid: callerUid, role: callerRole } = req.user!;

      // Non-admin can only add to their own addresses
      if (callerRole !== "admin" && callerUid !== targetUid) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const address = req.body;

      // Validate required fields
      const required = ['line1', 'city', 'state', 'pincode', 'phone'];
      for (const field of required) {
        if (!address[field]) {
          res.status(400).json({
            error: "Bad Request",
            message: `${field} is required`,
          });
          return;
        }
      }

      const docRef = adminDb().collection("users").doc(targetUid);
      const doc = await docRef.get();

      if (!doc.exists) {
        res.status(404).json({ error: "Not Found" });
        return;
      }

      const addresses = doc.data()?.deliveryAddresses || [];
      
      const newAddress = {
        id: `addr_${Date.now()}`,
        ...address,
        isDefault: addresses.length === 0, // First address is default
        createdAt: new Date(),
      };

      addresses.push(newAddress);

      await docRef.update({
        deliveryAddresses: addresses,
        updatedAt: FieldValue.serverTimestamp(),
      });

      res.status(201).json({ address: newAddress });
    } catch (err) {
      console.error("[POST /users/:uid/addresses]", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

/**
 * PATCH /users/:uid/addresses/:addressId
 * Update an existing delivery address
 */
router.patch(
  "/:uid/addresses/:addressId",
  verifyFirebaseToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { uid: targetUid, addressId } = req.params;
      const { uid: callerUid, role: callerRole } = req.user!;

      if (callerRole !== "admin" && callerUid !== targetUid) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const docRef = adminDb().collection("users").doc(targetUid);
      const doc = await docRef.get();

      if (!doc.exists) {
        res.status(404).json({ error: "Not Found" });
        return;
      }

      const addresses = doc.data()?.deliveryAddresses || [];
      const addressIndex = addresses.findIndex((a: any) => a.id === addressId);

      if (addressIndex === -1) {
        res.status(404).json({ error: "Address not found" });
        return;
      }

      // Update address fields
      addresses[addressIndex] = {
        ...addresses[addressIndex],
        ...req.body,
        id: addressId, // Preserve ID
        updatedAt: new Date(),
      };

      await docRef.update({
        deliveryAddresses: addresses,
        updatedAt: FieldValue.serverTimestamp(),
      });

      res.status(200).json({ address: addresses[addressIndex] });
    } catch (err) {
      console.error("[PATCH /users/:uid/addresses/:addressId]", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

/**
 * DELETE /users/:uid/addresses/:addressId
 * Delete a delivery address
 */
router.delete(
  "/:uid/addresses/:addressId",
  verifyFirebaseToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { uid: targetUid, addressId } = req.params;
      const { uid: callerUid, role: callerRole } = req.user!;

      if (callerRole !== "admin" && callerUid !== targetUid) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const docRef = adminDb().collection("users").doc(targetUid);
      const doc = await docRef.get();

      if (!doc.exists) {
        res.status(404).json({ error: "Not Found" });
        return;
      }

      let addresses = doc.data()?.deliveryAddresses || [];
      const addressIndex = addresses.findIndex((a: any) => a.id === addressId);

      if (addressIndex === -1) {
        res.status(404).json({ error: "Address not found" });
        return;
      }

      const wasDefault = addresses[addressIndex].isDefault;
      addresses = addresses.filter((_: any, i: number) => i !== addressIndex);

      // If deleted address was default, make first remaining address default
      if (wasDefault && addresses.length > 0) {
        addresses[0].isDefault = true;
      }

      await docRef.update({
        deliveryAddresses: addresses,
        updatedAt: FieldValue.serverTimestamp(),
      });

      res.status(200).json({ message: "Address deleted" });
    } catch (err) {
      console.error("[DELETE /users/:uid/addresses/:addressId]", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

/**
 * PUT /users/:uid/addresses/:addressId/set-default
 * Set an address as default
 */
router.put(
  "/:uid/addresses/:addressId/set-default",
  verifyFirebaseToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { uid: targetUid, addressId } = req.params;
      const { uid: callerUid, role: callerRole } = req.user!;

      if (callerRole !== "admin" && callerUid !== targetUid) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const docRef = adminDb().collection("users").doc(targetUid);
      const doc = await docRef.get();

      if (!doc.exists) {
        res.status(404).json({ error: "Not Found" });
        return;
      }

      const addresses = doc.data()?.deliveryAddresses || [];
      const addressIndex = addresses.findIndex((a: any) => a.id === addressId);

      if (addressIndex === -1) {
        res.status(404).json({ error: "Address not found" });
        return;
      }

      // Set all addresses to not default
      addresses.forEach((a: any) => { a.isDefault = false; });
      
      // Set target address as default
      addresses[addressIndex].isDefault = true;

      await docRef.update({
        deliveryAddresses: addresses,
        updatedAt: FieldValue.serverTimestamp(),
      });

      res.status(200).json({ address: addresses[addressIndex] });
    } catch (err) {
      console.error("[PUT /users/:uid/addresses/:addressId/set-default]", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
