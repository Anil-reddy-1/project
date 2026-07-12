# Technical Specification Document
## B2B Wholesale Marketplace — Web-Only Implementation (Next.js + Express + Firebase)

**Version:** 1.0
**Status:** Draft — Pre-Build
**Scope:** Fully web-based platform. No native mobile apps. All four roles (Retailer, Wholesaler, Delivery Partner, Admin) operate through responsive web interfaces, including the Delivery Partner (mobile-web optimized, not a native app).

---

## 1. Stack Overview & Role of Each Piece

| Layer | Technology | Role |
|---|---|---|
| Frontend | **Next.js** (App Router) | All 4 role-based web UIs, SSR/CSR hybrid, route-based auth guarding |
| Animation | **Framer Motion** | Micro-interactions, page transitions, status-change animations, live map marker motion |
| Backend API | **Express.js** | Business logic layer — order state machine, OTP generation/validation, assignment logic, Razorpay webhook handling, ledger computation |
| Database | **Firebase Firestore** | Primary data store — users, shops, items, orders, ledgers |
| Real-time Layer | **Firebase Realtime Database (RTDB)** | High-frequency writes: live delivery partner GPS location, active order presence |
| Auth | **Firebase Authentication** | Identity layer for all roles, with custom claims for RBAC |
| File Storage | **Firebase Storage** | Shop photos, verification images |
| Push Notifications | **Firebase Cloud Messaging (FCM)** — Web Push | Order status alerts, assignment alerts, debt reminders |
| Payments | **Razorpay** (via Express server) | Prepaid order checkout + webhook confirmation |
| Hosting | Next.js on **Vercel** (or Firebase Hosting), Express on **Cloud Run / Render / Railway** | Split deployment: frontend and backend independently scalable |

### 1.1 Why This Split (Next.js + Express, not Next.js API routes alone)
Next.js API routes could technically host simple CRUD, but this system has a non-trivial **stateful order engine** (state machine transitions, geospatial assignment, OTP lifecycle, ledger reconciliation) that benefits from being isolated in a dedicated Express service:
- Keeps business logic decoupled from the frontend deploy cycle.
- Allows independent scaling of the order/dispatch engine under load spikes (e.g., peak ordering hours) separate from page-serving traffic.
- Makes the Express layer the **single source of truth for all writes** — Next.js frontend never writes directly to Firestore for sensitive state; it always goes through Express, which validates transitions before committing.

**Firestore Direct-Read Exception:** Frontend clients *are* allowed to subscribe directly to Firestore/RTDB for **read-only real-time listeners** (order status, live location) — this avoids proxying every real-time update through Express and keeps the UI reactive at low latency. All **writes** go through Express.

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js Frontend                          │
│  /retailer   /wholesaler   /delivery   /admin   (route groups)   │
│  - SSR pages + client components                                │
│  - Firebase SDK: Auth + direct Firestore/RTDB READ listeners     │
│  - Framer Motion: transitions, live status animations            │
└───────────────┬───────────────────────────────┬─────────────────┘
                │ REST (writes/actions)          │ Realtime reads
                ▼                                 ▼
┌─────────────────────────────┐      ┌─────────────────────────────┐
│        Express API           │      │  Firestore / RTDB           │
│  - Auth middleware (verify   │◄────►│  - users, shops, items      │
│    Firebase ID token)        │      │  - orders, ledgers          │
│  - Order state machine       │      │  - live_locations (RTDB)    │
│  - Geo-assignment engine     │      └─────────────────────────────┘
│  - OTP generate/verify       │
│  - Razorpay webhook handler  │      ┌─────────────────────────────┐
│  - Ledger/debt engine        │◄────►│  Razorpay API                │
│  - FCM trigger dispatch      │      └─────────────────────────────┘
└───────────────────────────────┘
```

---

## 3. Authentication & Authorization

### 3.1 Firebase Auth Setup
- **Retailer:** Standard self-service sign-up via Firebase Auth (phone OTP or email/password).
- **Wholesaler:** Account created by Admin via Firebase Admin SDK (`createUser`) from the Express backend — credentials issued out-of-band (SMS/email), OR self-registration form that creates a **disabled** Firebase Auth user pending Admin approval (Admin approval flips `disabled: false` + sets custom claim).
- **Delivery Partner:** Always Admin-provisioned. No public registration route exists in the frontend for this role at all — the only way a Delivery Partner account is created is through the Admin dashboard calling Express → Firebase Admin SDK.
- **Admin:** Seeded directly in Firebase Auth via a one-time setup script; no UI-based creation path.

### 3.2 Role Assignment (Custom Claims)
Every Firebase Auth user gets a **custom claim** set server-side (Express, using Admin SDK — never client-side):
```json
{ "role": "retailer" | "wholesaler" | "delivery_partner" | "admin", "status": "active" | "suspended" }
```
- Next.js middleware reads the decoded ID token (via a session cookie or `Authorization` header) and redirects based on `role` claim to gate route groups (`/wholesaler/*` inaccessible to a `retailer`-claimed token, etc.)
- Express re-validates the claim on every request via middleware — **frontend route gating is UX only, not the security boundary.**

### 3.3 Session Handling
- Next.js uses Firebase Auth's client SDK to obtain an ID token, exchanged for an **httpOnly session cookie** via a Next.js route handler calling Firebase Admin `createSessionCookie`.
- All Express calls carry the Firebase ID token in the `Authorization: Bearer <token>` header; Express verifies via Admin SDK on each request (short-lived token, no server session state needed on the Express side — stateless verification).

---

## 4. Data Model (Firestore Collections)

```
users/{uid}
  - role, name, phone, email, status, shopId? (wholesaler), 
    exclusiveShopIds? (delivery_partner), createdBy (admin uid if provisioned)

shops/{shopId}
  - ownerUid, name, address, geopoint, geohash, category, 
    operatingHours, verificationStatus, moqThreshold

items/{shopId}/products/{itemId}
  - name, price, stockQty, unit, isAvailable, updatedAt

orders/{orderId}
  - retailerUid, shopId, items[{itemId, qty, price}], totalValue,
    paymentMethod ("prepaid" | "cod"), paymentStatus,
    state ("PLACED"|"APPROVED"|"REJECTED"|"PACKED"|"READY_FOR_PICKUP"
           |"ASSIGNED"|"PICKED_UP"|"ON_THE_WAY"|"DELIVERED"
           |"CANCELLED"|"DISPUTED"|"PAYMENT_SETTLED"),
  - assignedPartnerUid, pickupOtpHash, dropOtpHash, otpExpiresAt,
    stateHistory[{state, timestamp, actorUid}]   // audit trail

ledger_entries/{entryId}
  - orderId, partnerUid, wholesalerUid, amount, 
    status ("PENDING_CONFIRMATION"|"CONFIRMED"|"ESCALATED"),
  - collectedAt, confirmedAt, escalatedAt

disputes/{disputeId}
  - orderId, raisedByUid, reason, status, resolutionNotes, resolvedByUid

delivery_partners_meta/{uid}
  - isExclusive, linkedShopIds[], isOnline, currentGeohash, 
    activeOrderIds[], rating, acceptanceRate
```

**RTDB (separate, for high-frequency writes):**
```
live_locations/{partnerUid}: { lat, lng, geohash, updatedAt }
```
RTDB is used here instead of Firestore for location pings because RTDB has lower write overhead and is better suited to frequent (every few seconds) location updates without hitting Firestore's per-document write-rate practical limits and cost profile.

---

## 5. Geo-Based Delivery Assignment (No PostGIS — Firebase Constraint)

Since Firestore has no native geospatial radius query, the system uses **geohashing** via the `geofire-common` library:
1. Each shop and each online delivery partner's location is stored with a computed **geohash**.
2. On order READY_FOR_PICKUP, Express computes a bounding set of geohash ranges around the shop's coordinates (`geohashQueryBounds`).
3. Express queries `delivery_partners_meta` (filtered first by eligibility — exclusive-to-this-shop partners, else open-pool) within those geohash ranges, then does a client-side (server-side, in Express) exact-distance filter using haversine distance on the returned candidates.
4. Candidates are sorted by distance; assignment notification (FCM) is sent to the nearest, with a countdown SLA timer (see §6).
5. If declined/timeout, next-nearest candidate is notified.

This achieves the same practical outcome as a PostGIS `ST_DWithin` + `ORDER BY ST_Distance` query, at Firestore-compatible cost, with a small accuracy/perf trade-off acceptable at this scale.

---

## 6. Order State Machine — Implementation

- Implemented as a **pure function + validator** in Express: given `(currentState, action, actorRole)`, returns next state or throws `InvalidTransitionError`.
- Every transition is written via a **Firestore transaction** (`runTransaction`) to guarantee atomicity — prevents race conditions like double-approval or double-assignment.
- Every transition appends an entry to `stateHistory[]` on the order doc — this **is** the audit trail (§9).
- Inventory decrement happens **inside the same transaction** as the PLACED→APPROVED transition, reading and writing `items/{shopId}/products/{itemId}.stockQty` atomically to avoid overselling under concurrent approvals.
- SLA timers (assignment timeout, COD reconciliation window) are implemented via **Cloud Tasks** (Google Cloud) scheduled from Express, or a simple polling Cloud Function on a cron schedule (`onSchedule`) checking for stale states — either is viable; Cloud Tasks is preferred for precise per-order timers, cron polling is simpler to build first.

---

## 7. OTP Flow — Implementation

- **Pickup OTP:** generated by Express when order reaches READY_FOR_PICKUP; a 6-digit numeric OTP is hashed (bcrypt) and stored on the order doc (`pickupOtpHash`), with `otpExpiresAt`. Plaintext OTP is pushed via FCM to the delivery partner's client and shown on the wholesaler's dashboard for cross-verification.
- **Verification:** wholesaler-side UI ("confirm handoff") posts the OTP to Express `/orders/:id/verify-pickup`, which compares hash and transitions state to PICKED_UP.
- **Drop OTP:** generated at the PICKED_UP transition, sent to retailer via FCM (and shown in their order tracking screen).
- **Verification:** delivery partner enters retailer's OTP into their web UI at doorstep → Express `/orders/:id/verify-drop` → transitions to DELIVERED.
- OTPs are single-use and expire after a configurable window (default suggestion: 15 minutes) — expiry triggers a regenerate option, not an automatic order failure.

---

## 8. Payments & COD Ledger

### 8.1 Prepaid (Razorpay)
- Next.js frontend initiates Razorpay Checkout (client-side SDK) using an order created server-side by Express (`razorpay.orders.create`).
- Razorpay sends a **webhook** to a dedicated Express endpoint (`/webhooks/razorpay`) on payment success/failure.
- Express verifies the webhook signature, then transitions the order from a `PAYMENT_PENDING` pseudo-state into `PLACED` only on confirmed success — order is never visible to the wholesaler until payment clears.

### 8.2 COD Debt Ledger
- On DELIVERED + COD, delivery partner marks "cash collected" → Express creates a `ledger_entries` doc with `status: PENDING_CONFIRMATION`.
- Wholesaler confirms receipt → Express updates `status: CONFIRMED`, `confirmedAt`.
- A scheduled job (Cloud Function/Cloud Tasks) checks entries past the configured SLA window still `PENDING_CONFIRMATION` → flips to `ESCALATED` and notifies Admin.
- Wholesaler dashboard and Delivery Partner dashboard both read aggregate ledger state via a Firestore query filtered by `partnerUid`/`wholesalerUid`.

---

## 9. Audit Trail
- `stateHistory[]` array on each order doc is the primary audit record — every actor-driven transition appends `{state, timestamp, actorUid}`.
- Ledger and dispute collections are similarly append-log-oriented, never destructively overwritten.
- Admin dashboard queries these directly from Firestore for the audit view — no separate audit database needed at this scale.

---

## 10. Real-Time Tracking (Frontend Behavior)

- Retailer/Wholesaler order tracking pages subscribe directly to the Firestore order document (`onSnapshot`) for state changes — near-instant UI updates without polling.
- Live delivery partner location is subscribed directly from **RTDB** (`onValue` listener) scoped to the assigned partner's UID, active only while order is in ASSIGNED/PICKED_UP/ON_THE_WAY states.
- **Framer Motion** is used to animate:
  - The order status timeline (step transitions animate in as `stateHistory` updates arrive)
  - The live map marker (smooth `x/y` interpolation between location pings rather than a jarring snap)
  - Card/list transitions in the wholesaler's incoming-orders queue (new order arrives → slide/fade in)
  - Assignment countdown timer UI for delivery partners (pulse/urgency animation as SLA nears expiry)

---

## 11. Notifications

- **Push:** FCM Web Push (via a registered service worker in the Next.js app) for all role-targeted alerts (approval, assignment, OTP delivery, debt escalation).
- **SMS (optional fallback):** For critical alerts (OTP, order confirmation) where push delivery can't be guaranteed (browser closed) — via a third-party SMS gateway (e.g., MSG91/Twilio) called from Express. This is a fallback channel, not the primary one, given the no-native-app web context.
- All notification dispatch is centralized in Express (a `NotificationService` module) so every state transition has one place that decides what to send and to whom.

---

## 12. Frontend Architecture (Next.js)

### 12.1 Route Structure (App Router)
```
/app
  /(retailer)/...
  /(wholesaler)/...
  /(delivery)/...
  /(admin)/...
  /api/session/route.ts     // exchanges Firebase ID token for session cookie
  /middleware.ts             // reads session cookie, checks role claim, redirects
```
Each role group is a separate route segment with its own layout, guarded by middleware reading the decoded session cookie's `role` claim.

### 12.2 Rendering Strategy
- Shop browsing, catalog pages: SSR/ISR for SEO-friendly, fast initial load (retailers may discover shops via search).
- Dashboards (order queues, live tracking, admin panels): client components with real-time Firestore/RTDB listeners — no server rendering benefit here since data is inherently live.

### 12.3 Framer Motion Usage Patterns
- Page-level transitions between role dashboards (`AnimatePresence` on route change).
- Order card state animations (color/icon morph on state change).
- Modal/drawer transitions for order detail views, dispute forms, OTP entry.
- Micro-feedback on actions (approve/reject buttons, confirm-cash button) — scale/opacity feedback confirming the action registered before the async call resolves.

---

## 13. Express API Surface (Representative Endpoints)

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/session` | Exchange Firebase ID token for session cookie |
| POST | `/admin/users` | Admin creates wholesaler/delivery partner account |
| PATCH | `/admin/users/:uid/status` | Suspend/reactivate account |
| POST | `/orders` | Retailer places order (validates MOQ, initiates Razorpay if prepaid) |
| PATCH | `/orders/:id/approve` | Wholesaler approves (inventory decrement, transaction) |
| PATCH | `/orders/:id/reject` | Wholesaler rejects with reason |
| PATCH | `/orders/:id/pack` | Wholesaler marks packed → ready for pickup (triggers assignment) |
| POST | `/orders/:id/assign` | Internal — geo-assignment engine trigger |
| POST | `/orders/:id/accept-assignment` | Delivery partner accepts |
| POST | `/orders/:id/verify-pickup` | Wholesaler verifies pickup OTP |
| POST | `/orders/:id/verify-drop` | Delivery partner verifies drop OTP |
| POST | `/orders/:id/collect-cash` | Delivery partner marks COD collected |
| POST | `/orders/:id/confirm-cash` | Wholesaler confirms COD receipt |
| POST | `/webhooks/razorpay` | Razorpay payment webhook |
| POST | `/disputes` | Raise a dispute |
| PATCH | `/disputes/:id/resolve` | Admin resolves dispute |
| GET | `/admin/audit/orders/:id` | Full state history for an order |

---

## 14. Security Rules (Firestore, High-Level)

- `orders/{orderId}`: readable by `retailerUid`, `shop.ownerUid`, `assignedPartnerUid`, and any `admin` claim — writable **only via Admin SDK from Express** (client-side writes to orders are disabled entirely in security rules; all mutations are server-authoritative).
- `shops/{shopId}` and `items`: publicly readable (for browsing); writable only by the owning wholesaler's `ownerUid` match or Admin.
- `users/{uid}`: a user can read their own doc; only Admin (via Express/Admin SDK) can write role/status fields.
- `live_locations` (RTDB): writable only by the partner themself (matching auth uid), readable by anyone with an active assignment referencing that partner.

---

## 15. Deployment & Environments

| Component | Environment |
|---|---|
| Next.js | Vercel (preview deploys per PR, production on merge to main) |
| Express | Cloud Run (containerized, autoscaling) or Render |
| Firebase | Single Firebase project with `dev`/`staging`/`prod` separation via multiple projects or environment-prefixed collections |
| Secrets | Razorpay keys, FCM server key, SMS gateway keys — stored in Cloud Run/Vercel environment secrets, never client-exposed |

---

## 16. Open Technical Decisions
1. Cloud Tasks vs. cron-based Cloud Function polling for SLA timers — recommend starting with cron polling for build speed, migrating to Cloud Tasks if precision becomes an issue.
2. SMS gateway vendor selection (Twilio vs. MSG91 vs. others) — pending cost/geography evaluation.
3. Whether Delivery Partner web UI needs a lightweight PWA wrapper (installable, offline-tolerant) given it's used in-motion on mobile browsers — recommended given the field-use context, even though it remains "web-based, not an app."
4. Geohash precision level trade-off (search radius accuracy vs. query cost) — needs tuning once real shop density data is available.
