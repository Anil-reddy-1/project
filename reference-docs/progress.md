# Project Progress — B2B Wholesale Marketplace
## Order Management & Delivery Dispatch Platform

**Last Updated:** 2026-07-12T14:35 IST
**Status:** Phase 2 Complete — Phase 3 (Order Placement & Payment) is next
**Overall Build Progress:** ~45% (Phase 0-2 complete)

> This file is the authoritative progress log for all agents working on this project.
> Update it at the end of every session. Read it before starting any session.
> Cross-reference with `implementation-plan.md` for the full sequencing rationale.

---

## Quick State Summary

| Phase | Name | Status | Notes |
|---|---|---|---|
| **Phase 0** | Foundations | COMPLETE | All scaffolding in place |
| **Phase 1** | Identity, Roles & Onboarding | COMPLETE | Authentication and role-gating fully built |
| **Phase 2** | Shop & Catalog Management | COMPLETE | Backend (shops+items CRUD, geo queries), Wholesaler (setup wizard, catalog MGMT), Retailer (shop discovery, shop detail) |
| **Phase 3** | Order Placement & Payment | Not Started | Routes stubbed, logic not built |
| **Phase 4** | Wholesaler Approval & Inventory Lock | Not Started | Routes stubbed only |
| **Phase 5** | Delivery Assignment Engine | Not Started | — |
| **Phase 6** | OTP Handoffs & Delivery Execution | Not Started | — |
| **Phase 7** | COD Ledger & Payment Settlement | Not Started | — |
| **Phase 8** | Disputes & Support | Not Started | — |
| **Phase 9** | Admin Oversight, Config & Analytics | Not Started | — |
| **Phase 10** | Hardening & Launch Readiness | Not Started | — |

---

## Phase 0 — COMPLETE

All foundational scaffolding required for Phase 1 to write into is in place.

### Backend (e:\Project\backend\)

**Stack:** Node.js + Express + TypeScript
**Key packages:** express, firebase-admin, helmet, morgan, cors, multer, cloudinary, razorpay, geofire-common, uuid, bcryptjs

| File | Status | Description |
|---|---|---|
| src/index.ts | Done | Express entry point. Startup order: env > Firebase Admin > middleware > routes > error handler > server |
| src/config/env.ts | Done | Env var loading and validation. Throws on missing required vars. |
| src/config/firebase.ts | Done | Firebase Admin SDK initialization (lazy). |
| src/config/cloudinary.ts | Done | Cloudinary client config. |
| src/middleware/auth.ts | Done | verifyFirebaseToken middleware — verifies Firebase ID token on every protected request. |
| src/middleware/requireRole.ts | Done | requireRole(...roles) middleware — RBAC gate, after token verification. |
| src/middleware/error.ts | Done | Global Express error handler (must be last in the chain). |
| src/middleware/multer.ts | Done | Multer config for file upload handling (memory storage). |
| src/types/index.ts | Done | Shared TypeScript types (UserRole, UserStatus, etc.). |
| src/services/upload.service.ts | Done | Cloudinary upload helper. |
| src/services/notification.service.ts | Done | Notification dispatch helper (FCM / SMS stub). |
| src/routes/index.ts | Done | Route registry — mounts all sub-routers. |
| src/routes/upload.routes.ts | Done | File upload route to Cloudinary. LIVE. |
| src/routes/auth.routes.ts | STUBBED | Phase 1 stubs: /auth/set-role, /auth/suspend, /auth/reactivate. All return 501. |
| src/routes/users.routes.ts | STUBBED | Phase 1 stubs: user CRUD. Returns 501. |
| src/routes/shops.routes.ts | STUBBED | Phase 2 stubs: full shop + item CRUD. All return 501. |
| src/routes/orders.routes.ts | STUBBED | Phase 3-8 stubs: full order lifecycle state machine. All return 501. |

**Health check live:** GET /health returns { status: "ok", timestamp } (unauthenticated).

### Frontend (e:\Project\frontend\)

**Stack:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4
**Key packages:** firebase (client SDK), firebase-admin, framer-motion, geofire-common, bcryptjs

| File | Status | Description |
|---|---|---|
| app/layout.tsx | Done | Root layout. Google Fonts (Inter, Fraunces, IBM Plex Mono). AuthProvider wraps tree. Metadata and viewport set. |
| app/globals.css | Done | Global CSS with design tokens (colors, typography scale). |
| app/page.tsx | Done | Unauthenticated landing/login shell. Static placeholder only — Phase 1 adds real login form. |
| app/not-found.tsx | Done | 404 page. |
| app/(admin)/layout.tsx | Done | Admin route group layout shell. Nav added in Phase 1. |
| app/(retailer)/layout.tsx | Done | Retailer route group layout shell. |
| app/(wholesaler)/layout.tsx | Done | Wholesaler route group layout shell. |
| app/(delivery)/layout.tsx | Done | Delivery partner route group layout shell. |
| middleware.ts | Done | Role-based route gating. Reads session cookie, decodes JWT claims, redirects to correct role prefix or login. UX-only (not security boundary — Express re-validates on every API call). |
| providers/auth-provider.tsx | Done | Firebase Auth context. Listens to auth state, extracts role/status claims, exchanges ID token for session cookie, exposes useAuth() hook. |
| lib/firebase/client.ts | Done | Firebase client SDK initialization (browser-safe, lazy). |
| lib/firebase/admin.ts | Done | Firebase Admin SDK for Next.js server-side use (session cookie verification). |
| lib/firebase/config.ts | Done | Firebase project config (reads from env). |
| lib/auth/session.ts | Done | Session cookie helpers: createSession(idToken), clearSession(). |
| lib/api/client.ts | Done | Typed API client wrapper for calling the Express backend. |
| lib/constants/ | Done | Shared constants. |
| hooks/index.ts | Done | Custom hooks barrel (hooks not yet built — Phase 1+). |
| components/ui/index.ts | Done | UI component barrel (components not yet built — Phase 1+). |
| types/user.ts | Done | UserRole, UserStatus, AuthClaims, User types. |
| types/shop.ts | Done | Shop, VerificationStatus, OperatingHours, DayHours, DayOfWeek types. |
| types/item.ts | Done | Item type. |
| types/order.ts | Done | Order, OrderState, OrderItem, PaymentMethod, PaymentStatus, RejectionReason, StateHistoryEntry types. |
| types/ledger.ts | Done | LedgerEntry, LedgerStatus types. |
| types/dispute.ts | Done | Dispute, DisputeReason, DisputeStatus, DisputeResolutionAction types. |
| types/delivery-partner.ts | Done | DeliveryPartnerMeta type. |
| types/live-location.ts | Done | LiveLocation type. |

**Important:** The four role-scoped route groups (/admin, /retailer, /wholesaler, /delivery) contain ONLY layout shells — no pages inside them yet. Every page implementation starts in Phase 1.

### Infrastructure / Config

| Item | Status | Notes |
|---|---|---|
| frontend/.env.local | Present | Firebase client config + backend URL |
| frontend/.env.local.example | Present | Template for new developers |
| backend/.env | Present | Firebase Admin credentials, Cloudinary, CORS, port |
| backend/.env.example | Present | Template for new developers |
| Firebase project setup | VERIFY | .env files present — verify Firebase project is actually provisioned before Phase 1 |
| Firestore security rules | VERIFY | Not visible in repo — confirm live in Firebase console per tech-spec.md §14 |
| Admin account seed | VERIFY | No seed script visible in repo — needed before Phase 1 login flow can be tested |
| CI/CD pipelines | VERIFY | Not visible in repo — implementation-plan.md §0 calls for Vercel preview + Cloud Run/Render |

---

## Phase 1 — COMPLETE

**What needs to be built (implementation-plan.md §1):**

- [x] Retailer self-signup (email/password via Firebase Auth)
- [x] Wholesaler self-registration form (creates disabled account pending Admin approval)
- [x] Admin-provisioned wholesaler account creation flow (Endpoint done, UI done)
- [x] Admin-provisioned delivery partner account creation (Endpoint done, UI done)
- [x] Admin Users tab: approve/reject wholesaler self-registrations, create accounts
- [x] Admin Users tab: list, suspend, and reactivate accounts
- [x] POST /auth/register and /auth/set-role implementation (set custom claims server-side)
- `[x]` POST /auth/suspend implementation
- `[x]` POST /auth/reactivate implementation
- `[x]` Users route implementations (GET, POST, PATCH)
- `[x]` Forced password reset on first login (via CredentialMailer temp password link)
- `[x]` Login page UI (completely redesigned with dark/glassmorphism theme)
- `[x]` Role-specific dashboard home screens (redesigned with role badges and correct logout flows)

**Exit criteria:** All four roles reach their respective dashboard via their real onboarding path; role-gated routes block cross-role access server-side.

**Decision required before starting Phase 1:**
- `[x]` SMS/email vendor for credential dispatch — Twilio vs. MSG91 vs. other (Resolved: Using CredentialMailer stub).

---

## Decisions Outstanding (Consolidated)

These must be answered BEFORE the phase that names them. Do not build past a phase boundary with unresolved decisions.

| # | Decision | Needed By | Status |
|---|---|---|---|
| 1 | SMS/email vendor for credential dispatch | Phase 1 | RESOLVED — CredentialMailer stub; real vendor chosen before Phase 10 |
| 2 | operatingHours structure, verificationStatus value set | Phase 2 | RESOLVED — `{ days, open, close }` object; `pending/verified/rejected` |
| 3 | Razorpay account/keys provisioned (staging + prod) | Phase 3 | UNRESOLVED |
| 4 | rejectionReason enum values; retailer-cancel-through-APPROVED confirmation | Phase 4 | UNRESOLVED |
| 5 | Assignment SLA timeout value; geohash precision; mapping/routing API vendor | Phase 5 | UNRESOLVED |
| 6 | OTP expiry field structure (one field vs. two); final OTP duration | Phase 6 | UNRESOLVED |
| 7 | COD reconciliation SLA window | Phase 7 | UNRESOLVED |
| 8 | dispute.reason enum; dispute.status enum; dispute-raising window length | Phase 8 | UNRESOLVED |
| 9 | Account inactivity threshold; misuse-pattern thresholds | Phase 9 | UNRESOLVED |

---

## Architecture Context (for new agents)

| Concern | Decision | Where documented |
|---|---|---|
| State machine | Every order transition is a named POST action endpoint, never a PATCH to state | orders.routes.ts, rules.md §2 |
| RBAC | verifyFirebaseToken then requireRole() on every protected Express route; middleware.ts for UX-only gating in Next.js | middleware/auth.ts, middleware/requireRole.ts |
| Inventory lock | Inventory decrements ONLY at APPROVED, never at PLACED | implementation-plan.md §4, rules.md §2 |
| Delivery pool | Exclusive-to-shop partners checked BEFORE open pool; never reversed | rules.md §8 |
| Audit trail | Every state transition writes a stateHistory entry — architectural, not optional | rules.md §1, schema.md |
| Live location | Firestore (live_locations), NOT RTDB — decision made 2026-07-11: RTDB removed | lib/firebase/client.ts, types/live-location.ts |
| Geospatial | geofire-common (geohash-based) for server-side proximity queries | implementation-plan.md §5 |
| File uploads | Cloudinary via upload.routes.ts + upload.service.ts; Multer (memory) on Express | Backend services |
| Session auth | ID token exchanged for session cookie via Next.js API route; cookie decoded in middleware.ts | lib/auth/session.ts, providers/auth-provider.tsx |
| TypeScript | Full domain type model already in frontend/types/ (User, Shop, Item, Order, Ledger, Dispute, DeliveryPartner, LiveLocation) | types/ |

---

## What Agents Should Do Next

**Immediate next task: Phase 2 — Shop & Catalog Management**

Before writing any code:
1. Ensure the implementation plan for Phase 2 is generated and approved.
2. Resolve Phase 2 open decisions: `shops.operatingHours` structure and `shops.verificationStatus` value set.
3. Review `schema.md` §2 and §10.
3. Confirm SMS/email vendor decision with the user before writing any credential-sending code.
4. Verify Firebase project is provisioned and Firestore security rules from tech-spec.md §14 are live.
5. Verify an Admin account has been seeded (or build the seed script as the first task).

**Suggested implementation order within Phase 1:**
1. Admin account seed script (one-time) -> DONE
2. POST /auth/set-role, /suspend, /reactivate Express implementations -> DONE
3. User routes (create, list, get, update) with role scoping -> DONE
4. Login page UI (replaces placeholder at app/page.tsx) -> DONE
5. Retailer self-signup flow -> DONE
6. Wholesaler self-registration + Admin approval flow
7. Admin-provisioned wholesaler + delivery partner creation
8. Role-specific dashboard home screens (empty but navigable) -> DONE
9. Verify: all four roles reach correct dashboard; cross-role blocking confirmed

---

## File Map

```
e:\Project\
├── backend\
│   ├── src\
│   │   ├── index.ts                    <- Express entry point
│   │   ├── config\
│   │   │   ├── env.ts                  <- Env var validation
│   │   │   ├── firebase.ts             <- Firebase Admin init
│   │   │   └── cloudinary.ts           <- Cloudinary config
│   │   ├── middleware\
│   │   │   ├── auth.ts                 <- verifyFirebaseToken
│   │   │   ├── requireRole.ts          <- RBAC gate
│   │   │   ├── error.ts                <- Global error handler
│   │   │   └── multer.ts               <- File upload config
│   │   ├── routes\
│   │   │   ├── index.ts                <- Route registry
│   │   │   ├── auth.routes.ts          <- STUBBED (Phase 1)
│   │   │   ├── users.routes.ts         <- STUBBED (Phase 1)
│   │   │   ├── shops.routes.ts         <- STUBBED (Phase 2)
│   │   │   ├── orders.routes.ts        <- STUBBED (Phase 3-8)
│   │   │   └── upload.routes.ts        <- LIVE
│   │   ├── services\
│   │   │   ├── upload.service.ts
│   │   │   └── notification.service.ts <- stub
│   │   └── types\index.ts
│   ├── .env                            <- git-ignored
│   └── package.json
│
├── frontend\
│   ├── app\
│   │   ├── layout.tsx                  <- Root layout (fonts + AuthProvider)
│   │   ├── page.tsx                    <- Login placeholder (Phase 1 replaces)
│   │   ├── globals.css                 <- Design tokens
│   │   ├── not-found.tsx
│   │   ├── (admin)\layout.tsx          <- Shell only, no pages yet
│   │   ├── (retailer)\layout.tsx       <- Shell only, no pages yet
│   │   ├── (wholesaler)\layout.tsx     <- Shell only, no pages yet
│   │   └── (delivery)\layout.tsx       <- Shell only, no pages yet
│   ├── middleware.ts                   <- Role-gated route protection (UX only)
│   ├── providers\auth-provider.tsx     <- Firebase Auth context + useAuth()
│   ├── lib\
│   │   ├── api\client.ts               <- Express API client
│   │   ├── auth\session.ts             <- Session cookie helpers
│   │   ├── firebase\
│   │   │   ├── client.ts, admin.ts, config.ts
│   │   └── constants\
│   ├── types\                          <- Full domain type model (all entities typed)
│   │   ├── user.ts, shop.ts, item.ts, order.ts
│   │   ├── ledger.ts, dispute.ts
│   │   ├── delivery-partner.ts, live-location.ts
│   │   └── index.ts
│   ├── hooks\index.ts                  <- hooks barrel (empty)
│   ├── components\ui\index.ts          <- UI component barrel (empty)
│   ├── .env.local                      <- git-ignored
│   └── package.json
│
└── reference-docs\
    ├── PRD.md                          <- Product requirements
    ├── tech-spec.md                    <- Technical specification
    ├── schema.md                       <- Firestore schema
    ├── app-flow.md                     <- User flows and screen specs
    ├── design-doc.md                   <- Design system and UI guidelines
    ├── ui-design-reference.md          <- Detailed UI reference
    ├── rules.md                        <- Engineering rules (MUST READ)
    ├── implementation-plan.md          <- Phase-by-phase build plan
    └── progress.md                     <- THIS FILE
```
