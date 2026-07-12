/**
 * Session API route handler.
 * Derived from: tech-spec.md §3.3
 *
 * POST: Exchange Firebase ID token for an httpOnly session cookie.
 * DELETE: Clear the session cookie (logout).
 *
 * This route uses Firebase Admin SDK to create/verify session cookies.
 * Session cookies are httpOnly for security — not accessible via JS.
 *
 * Firebase Admin is dynamically imported to prevent build-time evaluation
 * when environment variables are not yet configured.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_MAX_AGE,
} from "@/lib/auth/session";

/**
 * POST /api/session
 * Exchange a Firebase ID token for a session cookie.
 */
export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid ID token" },
        { status: 400 },
      );
    }

    // Dynamic import to prevent build-time Firebase Admin initialization
    const { adminAuth } = await import("@/lib/firebase/admin");
    const auth = adminAuth();

    // Create a session cookie using Firebase Admin SDK
    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: SESSION_COOKIE_MAX_AGE * 1000, // milliseconds
    });

    // Set the session cookie as httpOnly
    const response = NextResponse.json({ status: "success" });
    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_COOKIE_MAX_AGE,
      path: "/",
    });

    return response;
  } catch (error: any) {
    if (error.code === "auth/recent-login-required") {
      // User has been logged in for a while. We can't mint a new session cookie
      // without them re-authenticating. For client-side apps, this is okay as
      // they already have an active client session. We just ignore it.
      return NextResponse.json({ status: "skipped", reason: "recent-login-required" });
    }
    console.error("Session creation error:", error);
    return NextResponse.json(
      { error: "Failed to create session", details: error.message },
      { status: 401 },
    );
  }
}

/**
 * DELETE /api/session
 * Clear the session cookie (logout).
 */
export async function DELETE() {
  const response = NextResponse.json({ status: "success" });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
