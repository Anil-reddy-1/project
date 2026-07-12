/**
 * Firebase token verification middleware.
 * Derived from: tech-spec.md §3.2, §3.3, rules.md §1
 *
 * Verifies the Firebase ID token from the Authorization header on every request.
 * Attaches the decoded user (uid, role, status) to req.user.
 *
 * IMPORTANT (rules.md §1):
 * This is the actual security boundary — not Next.js middleware.
 * Every Express route that handles sensitive state is protected by this.
 */

import type { Request, Response, NextFunction } from "express";
import { adminAuth } from "../config/firebase";
import type { UserRole, UserStatus } from "../types";

/** Extends Express Request with authenticated user context */
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        role: UserRole | undefined;
        status: UserStatus;
        email?: string;
      };
    }
  }
}

/**
 * verifyFirebaseToken — Express middleware
 *
 * Reads the `Authorization: Bearer <idToken>` header, verifies it via
 * Firebase Admin SDK, and attaches decoded claims to `req.user`.
 *
 * Responds 401 if the token is missing, expired, or invalid.
 * Responds 403 if the account is suspended.
 */
export async function verifyFirebaseToken(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized", message: "Missing Bearer token" });
    return;
  }

  const idToken = authHeader.slice(7); // strip "Bearer "

  try {
    const decoded = await adminAuth().verifyIdToken(idToken, true);

    const role = decoded.role as UserRole | undefined;
    const status = decoded.status as UserStatus | undefined;

    if (!role) {
      res.status(403).json({
        error: "Forbidden",
        message: "Account has no role assigned. Contact admin.",
      });
      return;
    }

    if (status === "suspended") {
      res.status(403).json({
        error: "Forbidden",
        message: "Account is suspended.",
      });
      return;
    }

    req.user = {
      uid: decoded.uid,
      role,
      status: status ?? "active",
      email: decoded.email,
    };

    next();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Token verification failed";
    res.status(401).json({ error: "Unauthorized", message });
  }
}

/**
 * verifyFirebaseTokenNoRole — Express middleware
 *
 * Same as verifyFirebaseToken but does NOT reject roleless tokens.
 * Use ONLY on routes that are intentionally open to brand-new accounts
 * that have no role claim yet (e.g. POST /auth/register).
 *
 * After this middleware runs, req.user.role may be undefined.
 * The route handler is responsible for checking or ignoring the role.
 */
export async function verifyFirebaseTokenNoRole(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized", message: "Missing Bearer token" });
    return;
  }

  const idToken = authHeader.slice(7);

  try {
    const decoded = await adminAuth().verifyIdToken(idToken, true);

    // NOTE: role is intentionally allowed to be undefined here.
    // Suspended accounts are still blocked — a suspended user cannot re-register.
    const status = decoded.status as UserStatus | undefined;
    if (status === "suspended") {
      res.status(403).json({
        error: "Forbidden",
        message: "Account is suspended.",
      });
      return;
    }

    req.user = {
      uid: decoded.uid,
      role: (decoded.role as UserRole | undefined),
      status: status ?? "active",
      email: decoded.email,
    };

    next();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Token verification failed";
    res.status(401).json({ error: "Unauthorized", message });
  }
}
