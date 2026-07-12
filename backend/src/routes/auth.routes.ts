/**
 * Auth routes — custom claim management + retailer self-registration.
 * Derived from: tech-spec.md §3.1, §3.2, rules.md §1, schema.md §1
 *
 * Phase 1 implementations:
 *   POST /auth/register   — Retailer self-signup (public, after Firebase Auth sign-in)
 *   POST /auth/set-role   — Admin sets role + status on any account
 *   POST /auth/suspend    — Admin suspends an account
 *   POST /auth/reactivate — Admin reactivates a suspended account
 *
 * Audit trail for user/account events:
 *   schema.md §1 defines `updatedAt` and `createdBy` as the account-level
 *   audit fields. User events write updatedAt + createdBy (for provisioned accounts).
 *   Order-level audit uses stateHistory[] (Phase 3+, not applicable here).
 */

import { Router, type Request, type Response } from "express";
import { FieldValue } from "firebase-admin/firestore";
import { verifyFirebaseToken, verifyFirebaseTokenNoRole } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import { adminAuth, adminDb } from "../config/firebase";
import type { UserRole, UserStatus } from "../types";

const router = Router();

// ─── POST /auth/register ──────────────────────────────────────────────────────
//
// Retailer self-signup.
// Called AFTER the retailer has created a Firebase Auth account (email/password
// or phone) on the frontend. This route sets the role claim and creates the
// Firestore user document.
//
// Security:
//   - Requires valid Firebase ID token (verifyFirebaseToken) so we know the UID.
//   - Only sets role = "retailer". Any attempt to self-assign another role is rejected.
//   - Rejects if the user already has a role claim (prevents privilege re-assignment).

router.post(
  "/register",
  verifyFirebaseTokenNoRole, // fresh signup: no role claim yet, so verifyFirebaseToken would always 403
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { uid, role: existingRole } = req.user!;
      const { name, phone, email, requestedRole } = req.body as {
        name?: string;
        phone?: string;
        email?: string;
        requestedRole?: string;
      };

      // Reject if already has a role — not a fresh registration
      if (existingRole) {
        res.status(409).json({
          error: "Conflict",
          message: "Account already has a role assigned.",
        });
        return;
      }

      if (!name || !phone) {
        res.status(400).json({
          error: "Bad Request",
          message: "name and phone are required.",
        });
        return;
      }

      // Validate requestedRole — only retailer and wholesaler are allowed for self-signup.
      // Delivery partners and admins are always provisioned by admin (tech-spec.md §3.1).
      const allowedSelfSignupRoles = ["retailer", "wholesaler"];
      const role: UserRole = (requestedRole === "wholesaler") ? "wholesaler" : "retailer";

      if (requestedRole && !allowedSelfSignupRoles.includes(requestedRole)) {
        res.status(400).json({
          error: "Bad Request",
          message: "Only 'retailer' or 'wholesaler' self-signup is allowed.",
        });
        return;
      }

      // Wholesaler self-signups start in pending_approval and their Firebase Auth
      // account is disabled so they cannot log in until an Admin approves them.
      const status: UserStatus = role === "wholesaler" ? "pending_approval" : "active";

      if (role === "wholesaler") {
        await adminAuth().updateUser(uid, { disabled: true });
      }

      // Set custom claims server-side (never client-side — rules.md §1)
      await adminAuth().setCustomUserClaims(uid, { role, status });

      // Create Firestore users/{uid} document (schema.md §1)
      const now = FieldValue.serverTimestamp();
      await adminDb().collection("users").doc(uid).set({
        uid,
        role,
        status,
        name,
        phone,
        email: email ?? null,
        createdAt: now,
        updatedAt: now,
      });

      res.status(201).json({ uid, role, status });
    } catch (err) {
      console.error("[POST /auth/register]", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);


// ─── POST /auth/set-role ─────────────────────────────────────────────────────
//
// Admin sets custom role + status claims on an existing Firebase Auth user.
// Also updates the Firestore users/{uid} document.
//
// Body: { uid: string, role: UserRole, status: UserStatus }

router.post(
  "/set-role",
  verifyFirebaseToken,
  requireRole("admin"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { uid: targetUid, role, status } = req.body as {
        uid?: string;
        role?: UserRole;
        status?: UserStatus;
      };

      if (!targetUid || !role || !status) {
        res.status(400).json({
          error: "Bad Request",
          message: "uid, role, and status are required.",
        });
        return;
      }

      const VALID_ROLES: UserRole[] = [
        "retailer",
        "wholesaler",
        "delivery_partner",
        "admin",
      ];
      const VALID_STATUSES: UserStatus[] = ["active", "suspended", "pending_approval"];

      if (!VALID_ROLES.includes(role)) {
        res.status(400).json({ error: "Bad Request", message: `Invalid role: ${role}` });
        return;
      }
      if (!VALID_STATUSES.includes(status)) {
        res.status(400).json({ error: "Bad Request", message: `Invalid status: ${status}` });
        return;
      }

      // Verify the target user exists in Firebase Auth
      await adminAuth().getUser(targetUid);

      // Set custom claims
      await adminAuth().setCustomUserClaims(targetUid, { role, status });

      // Update Firestore doc (audit: updatedAt tracks when this changed)
      await adminDb().collection("users").doc(targetUid).update({
        role,
        status,
        updatedAt: FieldValue.serverTimestamp(),
      });

      res.status(200).json({ uid: targetUid, role, status });
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "auth/user-not-found") {
        res.status(404).json({ error: "Not Found", message: "User not found." });
        return;
      }
      console.error("[POST /auth/set-role]", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

// ─── POST /auth/suspend ───────────────────────────────────────────────────────
//
// Admin suspends a user account.
// Sets status = "suspended" in both the Firebase custom claim and Firestore doc.
// Also disables the Firebase Auth user so active sessions are invalidated.
//
// Body: { uid: string }

router.post(
  "/suspend",
  verifyFirebaseToken,
  requireRole("admin"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { uid: targetUid } = req.body as { uid?: string };

      if (!targetUid) {
        res.status(400).json({ error: "Bad Request", message: "uid is required." });
        return;
      }

      // Prevent self-suspension
      if (targetUid === req.user!.uid) {
        res.status(400).json({
          error: "Bad Request",
          message: "Admin cannot suspend their own account.",
        });
        return;
      }

      // Get current claims to preserve role
      const user = await adminAuth().getUser(targetUid);
      const currentRole = (user.customClaims?.role as UserRole) ?? "retailer";

      // Disable the Auth user (invalidates active tokens on next refresh)
      await adminAuth().updateUser(targetUid, { disabled: true });

      // Update custom claims
      await adminAuth().setCustomUserClaims(targetUid, {
        role: currentRole,
        status: "suspended",
      });

      // Update Firestore doc
      await adminDb().collection("users").doc(targetUid).update({
        status: "suspended",
        updatedAt: FieldValue.serverTimestamp(),
      });

      res.status(200).json({ uid: targetUid, status: "suspended" });
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "auth/user-not-found") {
        res.status(404).json({ error: "Not Found", message: "User not found." });
        return;
      }
      console.error("[POST /auth/suspend]", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

// ─── POST /auth/reactivate ────────────────────────────────────────────────────
//
// Admin reactivates a suspended account.
// Sets status = "active", re-enables Firebase Auth user.
//
// Body: { uid: string }

router.post(
  "/reactivate",
  verifyFirebaseToken,
  requireRole("admin"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { uid: targetUid } = req.body as { uid?: string };

      if (!targetUid) {
        res.status(400).json({ error: "Bad Request", message: "uid is required." });
        return;
      }

      const user = await adminAuth().getUser(targetUid);
      const currentRole = (user.customClaims?.role as UserRole) ?? "retailer";

      // Re-enable the Firebase Auth user
      await adminAuth().updateUser(targetUid, { disabled: false });

      // Update custom claims
      await adminAuth().setCustomUserClaims(targetUid, {
        role: currentRole,
        status: "active",
      });

      // Update Firestore doc
      await adminDb().collection("users").doc(targetUid).update({
        status: "active",
        updatedAt: FieldValue.serverTimestamp(),
      });

      res.status(200).json({ uid: targetUid, status: "active" });
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "auth/user-not-found") {
        res.status(404).json({ error: "Not Found", message: "User not found." });
        return;
      }
      console.error("[POST /auth/reactivate]", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

// ─── POST /auth/approve ──────────────────────────────────────────────────────
//
// Admin approves a pending wholesaler self-registration.
// - Re-enables the Firebase Auth account (was disabled on self-signup)
// - Updates custom claims: status → "active"
// - Updates Firestore users/{uid} document
//
// Body: { uid: string }

router.post(
  "/approve",
  verifyFirebaseToken,
  requireRole("admin"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { uid: targetUid } = req.body as { uid?: string };

      if (!targetUid) {
        res.status(400).json({ error: "Bad Request", message: "uid is required." });
        return;
      }

      const firebaseUser = await adminAuth().getUser(targetUid);
      const currentRole = (firebaseUser.customClaims?.role as UserRole) ?? "wholesaler";
      const currentStatus = firebaseUser.customClaims?.status as UserStatus;

      // Only pending_approval accounts can be approved
      if (currentStatus !== "pending_approval") {
        res.status(400).json({
          error: "Bad Request",
          message: `Account status is '${currentStatus}', not 'pending_approval'. Only pending accounts can be approved.`,
        });
        return;
      }

      // Re-enable Firebase Auth account so the user can log in
      await adminAuth().updateUser(targetUid, { disabled: false });

      // Update custom claims: status → active
      await adminAuth().setCustomUserClaims(targetUid, {
        role: currentRole,
        status: "active",
      });

      // Update Firestore document
      await adminDb().collection("users").doc(targetUid).update({
        status: "active",
        updatedAt: FieldValue.serverTimestamp(),
      });

      res.status(200).json({ uid: targetUid, role: currentRole, status: "active" });
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "auth/user-not-found") {
        res.status(404).json({ error: "Not Found", message: "User not found." });
        return;
      }
      console.error("[POST /auth/approve]", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

// ─── POST /auth/reject ───────────────────────────────────────────────────────
//
// Admin rejects a pending wholesaler self-registration.
// - Deletes the Firebase Auth account
// - Deletes the Firestore users/{uid} document
// This frees up the email so the user can apply again later.
//
// Body: { uid: string }

router.post(
  "/reject",
  verifyFirebaseToken,
  requireRole("admin"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { uid: targetUid } = req.body as { uid?: string };

      if (!targetUid) {
        res.status(400).json({ error: "Bad Request", message: "uid is required." });
        return;
      }

      const firebaseUser = await adminAuth().getUser(targetUid);
      const currentStatus = firebaseUser.customClaims?.status as UserStatus;

      // Only pending_approval accounts can be rejected (deleted)
      if (currentStatus !== "pending_approval") {
        res.status(400).json({
          error: "Bad Request",
          message: `Account status is '${currentStatus}', not 'pending_approval'. Only pending accounts can be rejected.`,
        });
        return;
      }

      // Delete Firebase Auth account
      await adminAuth().deleteUser(targetUid);

      // Delete Firestore document
      await adminDb().collection("users").doc(targetUid).delete();

      res.status(200).json({ uid: targetUid, message: "User rejected and deleted." });
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "auth/user-not-found") {
        res.status(404).json({ error: "Not Found", message: "User not found." });
        return;
      }
      console.error("[POST /auth/reject]", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

export default router;
