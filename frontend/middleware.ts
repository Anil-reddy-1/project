/**
 * Next.js Middleware — Role-based route gating.
 * Derived from: tech-spec.md §3.2, rules.md §1
 *
 * IMPORTANT (rules.md §1):
 * Frontend route/middleware gating by role is UX ONLY — it is never
 * the security boundary. Express re-validates the claim on every request.
 *
 * This middleware reads the session cookie, verifies it via Firebase Admin,
 * and redirects users to their correct role-based route group.
 *
 * Auth bug fixes applied:
 *   A4 — JWT `exp` claim is now checked; expired session cookies are treated
 *         as unauthenticated and redirect to login.
 *   A6 — Documented that /retailer/signup is in PUBLIC_PATHS; authenticated
 *         users hitting it are redirected to their dashboard (by design).
 */

import { NextRequest, NextResponse } from "next/server";
import type { UserRole } from "@/types";

/** Session cookie name — must match lib/auth/session.ts */
const SESSION_COOKIE_NAME = "__session";

/**
 * Protected route prefixes for each role.
 * Maps to Next.js App Router route groups (tech-spec.md §12.1).
 */
const ROLE_ROUTES: Record<UserRole, string> = {
  retailer: "/retailer",
  wholesaler: "/wholesaler",
  delivery_partner: "/delivery",
  admin: "/admin",
};

/**
 * Routes that don't require authentication.
 *
 * NOTE (A6): /retailer/signup is a public path so unauthenticated visitors can
 * access the registration form. However, authenticated users who navigate to
 * /retailer/signup will be redirected to their role dashboard (see the
 * "authenticated user on public path" block below). This is intentional —
 * a logged-in user should not see the signup form.
 */
const PUBLIC_PATHS = ["/", "/api/session", "/retailer/signup", "/wholesaler/signup", "/no-role", "/pending-approval"];

/**
 * Check if a path is public (no auth required).
 */
function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/**
 * Determine which role a protected path belongs to.
 * Returns null if the path doesn't match any role prefix.
 */
function getPathRole(pathname: string): UserRole | null {
  for (const [role, prefix] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(prefix)) {
      return role as UserRole;
    }
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for session cookie
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  // Unauthenticated: allow public paths, redirect everything else to login
  if (!sessionCookie) {
    if (isPublicPath(pathname)) return NextResponse.next();
    return NextResponse.redirect(new URL("/", request.url));
  }

  /**
   * NOTE: Full session cookie verification via Firebase Admin SDK
   * requires dynamic imports that are heavy for middleware.
   *
   * In production, this would verify the session cookie and extract claims.
   * For now, we decode the JWT payload without verification for route gating
   * (remember: this is UX only, not the security boundary — rules.md §1).
   *
   * The actual security boundary is Express, which re-validates the
   * Firebase ID token on every API request.
   *
   * FIX A4: We now check the `exp` claim to ensure the session cookie hasn't
   * expired. An expired cookie is treated as unauthenticated.
   */
  try {
    // Decode JWT payload (base64url encoded, second segment)
    const parts = sessionCookie.split(".");
    if (parts.length !== 3) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8"),
    );

    // FIX A4: Check JWT expiration.
    // `exp` is in seconds since Unix epoch. If the token is expired,
    // treat the user as unauthenticated and redirect to login.
    // A 30-second buffer accounts for clock skew between client and server.
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now - 30) {
      // Expired session — clear the cookie and redirect to login
      const response = NextResponse.redirect(new URL("/", request.url));
      response.cookies.set(SESSION_COOKIE_NAME, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
        path: "/",
      });
      return response;
    }

    const userRole = payload.role as UserRole | undefined;
    const userStatus = payload.status as string | undefined;

    // No role claim — user exists in Firebase Auth but /auth/register hasn't
    // completed yet (or failed midway). Redirect to a static explanatory page.
    // IMPORTANT: /no-role must be in PUBLIC_PATHS so this redirect never loops.
    if (!userRole) {
      if (pathname === "/no-role") return NextResponse.next();
      return NextResponse.redirect(new URL("/no-role", request.url));
    }

    // Suspended accounts — redirect to login with a message
    if (userStatus === "suspended") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Pending approval — redirect to a dedicated waiting page
    // These users have a role claim but are not yet active
    if (userStatus === "pending_approval") {
      if (pathname === "/pending-approval") return NextResponse.next();
      return NextResponse.redirect(new URL("/pending-approval", request.url));
    }

    const correctPrefix = ROLE_ROUTES[userRole];

    // Authenticated user hitting a public path (e.g. login page "/"): send
    // them to their dashboard so they don't see the login screen again.
    if (isPublicPath(pathname)) {
      return NextResponse.redirect(new URL(correctPrefix, request.url));
    }

    // Check if user is accessing the correct role's routes
    const pathRole = getPathRole(pathname);
    if (pathRole && pathRole !== userRole) {
      // User is trying to access a different role's routes — redirect to their own
      return NextResponse.redirect(new URL(correctPrefix, request.url));
    }

    return NextResponse.next();
  } catch {
    // Invalid session cookie — redirect to login
    return NextResponse.redirect(new URL("/", request.url));
  }
}


/**
 * Middleware matcher config.
 * Runs on all routes except static files and Next.js internals.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public files (images, fonts, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)",
  ],
};
