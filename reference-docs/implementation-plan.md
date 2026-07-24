# implementation-plan.md — Build Plan
## Single-Shop B2B Wholesale Order Management & Delivery Platform

**Owner:** Product & Engineering  
**Version:** 2.0  
**Architecture:** Single Wholesaler, Single Shop (NOT Marketplace)  
**Status:** Updated for Single-Shop Model  
**Reads alongside:** PRD.md, requirements.md, design-doc.md, app-flow.md, tech-spec.md, schema.md, rules.md  
**Purpose:** Sequence the build so each phase only depends on what's already shipped, surface the decisions that must be made *before* a phase starts (not discovered mid-phase), and give every phase a concrete "done" bar tied back to the PRD's success metrics.

---

## ⚠️ CRITICAL ARCHITECTURAL UPDATE

**This system is NO LONGER a marketplace.** Architecture changed to:
- **ONE Admin**
- **ONE Wholesaler** (fixed business owner)
- **ONE Shop** (the wholesale business)
- **Multiple Retailers** (customers)
- **Multiple Delivery Partners**

**REMOVED FEATURES:**
- Shop discovery/search
- Wholesaler registration/onboarding
- Shop verification workflow
- Multi-tenant architecture

**Phase 2 requires refactoring** to remove marketplace features before continuing to Phase 3.

---

## 0. Sequencing Logic (why this order)

This system has one real dependency spine: **you cannot dispatch a delivery for an order that can't yet be placed, approved, or paid for.** So the build follows the order's own lifecycle:

```
Identity & roles → Single Shop Setup → Catalog → Order placement/payment (PENDING_APPROVAL) → 
Approval & inventory → Delivery assignment → OTP handoffs → COD ledger → Disputes → 
Admin oversight/config → Hardening
```

**Key Change:** Orders now enter **PENDING_APPROVAL** state (not PLACED) and await wholesaler action before inventory locking.

Building Admin-heavy features (disputes, overrides, analytics) before the order engine exists would mean building screens with nothing real to show. Building delivery assignment before the approval gate exists would mean dispatching orders that were never actually confirmed. Each phase below unlocks the next; nothing is built ahead of what it depends on.

**Cross-cutting, present in every phase (not a separate phase):** audit logging (`stateHistory` writes), RBAC enforcement, notification dispatch. These are architectural spine, not features — see rules.md §1 and §10.

---

## Phase 0 — Foundations (pre-feature)

**Goal:** Nothing user-facing yet. The scaffolding every later phase writes into.

- Firebase project setup (dev/staging/prod separation), Firestore + RTDB provisioned.
- Next.js app shell with the four route groups (`/retailer`, `/wholesaler`, `/delivery`, `/admin`) and middleware stub for role-gating.
- Express service scaffold, deployed empty, wired to Firebase Admin SDK.
- Firestore security rules from tech-spec.md §14 in place (client writes to `orders`/`users.role`/`users.status` blocked from day one, not bolted on later).
- Admin account seeded via one-time script.
- CI/CD: preview deploys on Vercel, Cloud Run/Render pipeline for Express.

**Decisions required before this phase starts:** none — this phase has no open questions attached to it.

**Exit criteria:** an admin can log in to an empty dashboard; a retailer can sign up and land on an empty home screen; no business logic yet.

---

## Phase 1 — Identity, Roles & Onboarding

**Status:** ✅ COMPLETE

**Goal:** All onboarding paths work end to end.

- ✅ Retailer self-signup (phone OTP or email/password via Firebase Auth)
- ✅ Admin-provisioned wholesaler/delivery-partner creation
- ✅ Custom claims (`role`, `status`) set server-side
- ✅ Role-gated routes with middleware

**REMOVED in v2.0:**
- ❌ Wholesaler self-registration (no wholesaler onboarding)
- ❌ Pending approval workflow for wholesalers

**Exit criteria:** All four roles can reach their respective dashboard home via their real onboarding path; role-gated routes correctly block cross-role access.

---

## Phase 2 — Single Shop Setup & Catalog Management

**Status:** ⚠️ NEEDS REFACTORING (built as marketplace, must convert to single-shop)

**Original Goal (Marketplace):** Wholesalers can stand up multiple discoverable shops.

**New Goal (Single-Shop):** THE single shop is configured, and its catalog can be managed.

**What Was Built (Phase 2):**
- ✅ Shop profile CRUD
- ✅ Item CRUD
- ✅ Retailer shop discovery/search ← **MUST REMOVE**
- ✅ Shop verification workflow ← **MUST REMOVE**
- ✅ Wholesaler registration ← **MUST REMOVE**

**Phase 2.5 — Migration to Single-Shop Model (REQUIRED):**

### Backend Changes:
1. Add backend validation:
   - Prevent creation of multiple shops
   - Prevent creation of multiple wholesaler users
   - Enforce single-shop constraints in Firestore rules

2. Create helper functions (backend/src/utils/snapshot.ts):
   - `getSingleShopId()` - retrieve THE shop ID
   - `getSingleWholesalerId()` - retrieve THE wholesaler UID

3. Update order service:
   - Auto-assign `shopId` via `getSingleShopId()`
   - Auto-assign `wholesalerId` via `getSingleWholesalerId()`
   - Remove shop selection logic

### Frontend Changes:
1. **REMOVE:**
   - `frontend/app/(retailer)/retailer/shops/page.tsx` (shop discovery)
   - `frontend/app/(wholesaler)/wholesaler/signup/page.tsx` (wholesaler signup)
   - Shop search/filter components
   - Shop selection during cart/checkout

2. **CREATE:**
   - `frontend/app/(retailer)/retailer/catalog/page.tsx` (direct catalog access)
   - Updated retailer navigation (Home → Catalog, no shop discovery)

3. **UPDATE:**
   - Admin dashboard: Remove wholesaler approval tab
   - Admin dashboard: Single shop management (not multi-shop)
   - Cart logic: Remove multi-shop cart clearing modal

### Database:
1. Create seed script (`backend/scripts/setup-single-shop.ts`):
   - Creates THE admin account
   - Creates THE wholesaler account
   - Creates THE shop document
   - Links wholesaler to shop
   - Idempotent (can run multiple times safely)

**Exit criteria for Phase 2.5:**
- Only one shop exists and can exist
- Only one wholesaler exists and can exist
- Retailer directly browses THE shop's catalog (no discovery)
- All orders automatically assigned to THE shop and THE wholesaler
- Seed script successfully initializes system
- Phase 2 marketplace features fully removed

**Decisions required before Phase 2.5 starts:**
- Confirm shop details for seed script (name, address, category, MOQ)
- Confirm wholesaler account details (email, phone, initial password)

---

## Phase 3 — Order Placement & Payment (PENDING_APPROVAL)

**Status:** 🚧 IN PROGRESS (66% complete - backend done, frontend UI remaining)

**Goal:** A retailer can build a cart and successfully create a real order with PhonePe payment or COD, entering **PENDING_APPROVAL** state.

**Key Changes from Marketplace Version:**
- Orders automatically assigned to THE single shop (no shop selection)
- Orders automatically assigned to THE single wholesaler
- Initial state is **PENDING_APPROVAL** (not PLACED)
- PhonePe Business gateway (NOT Razorpay)
- Inventory validation only (NOT reduced until Phase 4 approval)

### Completed (Backend):
- ✅ Delivery address management (CRUD + default address)
- ✅ PhonePe payment integration (initiation, verification, webhooks)
- ✅ Order creation service with validation
- ✅ Payment status tracking
- ✅ COD support
- ✅ Email notifications (Brevo integration)
- ✅ Cart validation (MOQ, stock, pricing)
- ✅ Order snapshot creation
- ✅ Audit trail logging
- ✅ Security: signature verification, idempotency
- ✅ Helper functions for single-shop assignment

### Remaining (Frontend):
- ⏳ Checkout page UI
- ⏳ Payment flow pages (processing, success, failure)
- ⏳ Order history and detail pages
- ⏳ Address management UI
- ⏳ Loading/error state handling
- ⏳ Wholesaler: pending orders view

### Features:
- Single-shop cart (no multi-shop logic)
- Shop-order MOQ enforcement (client + server validation)
- PhonePe payment path:
  - Order creation (Express) → PhonePe checkout → webhook confirmation → PENDING_APPROVAL
- COD path: Order → PENDING_APPROVAL directly
- Order confirmation screen
- Order tracking screen (initial state: PENDING_APPROVAL)

**Decisions required before Phase 3 completes:**
- ✅ PhonePe merchant account configured (sandbox + prod)
- ⏳ Delivery charges calculation method (flat rate vs distance-based)
- ⏳ GST/tax configuration (if applicable)

**Exit criteria:**
- A real order document exists in Firestore with:
  - Correct schema (schema.md §4)
  - State: **PENDING_APPROVAL**
  - Auto-assigned `shopId` from `getSingleShopId()`
  - Auto-assigned `wholesalerId` from `getSingleWholesalerId()`
  - Correct `paymentStatus`
  - `stateHistory` entry for `PENDING_APPROVAL` with real `actorUid`
- Inventory validated but NOT reduced
- Wholesaler receives notification of new order
- Retailer can view order in history with "Awaiting Approval" status

---

## Phase 3.9 — UI/UX Enhancement (Premium E-commerce Experience)

**Status:** 📋 PLANNED (starts after Phase 3 completes)

**Goal:** Transform retailer-facing UI into a premium Flipkart/Amazon-quality e-commerce experience WITHOUT changing any business logic or backend APIs.

**Scope:**
- Pure frontend redesign
- No backend changes
- No business logic changes
- No API contract changes
- No database schema changes

**Features:**
- Premium product catalog with advanced filtering
- Enhanced product detail pages
- Smooth animations and transitions
- Professional checkout flow
- Improved order tracking visualization
- Mobile-responsive design
- Loading states and skeleton screens
- Empty states with CTAs
- Error handling with recovery options
- Consistent design system
- Performance optimizations

**Exit criteria:**
- All Phase 3 functionality preserved
- Production-ready UI/UX quality
- Mobile and desktop responsive
- Accessibility compliant (WCAG 2.1 AA target)
- Performance optimized (Lighthouse score >90)
- User testing feedback incorporated

---

## Phase 4 — Wholesaler Approval & Inventory Lock

**Status:** ✅ COMPLETE

**Goal:** The approval gate that the entire trust model depends on. Wholesaler reviews and approves/rejects pending orders.

**Key Change:** Orders start in **PENDING_APPROVAL** (from Phase 3), not PLACED.

### Features:
- Wholesaler incoming-orders queue (PENDING_APPROVAL orders only)
- New order notifications with animation
- Approve action: atomic transaction
  - State → **APPROVED**
  - Inventory decrement (rules.md §2 — must be atomic)
  - Notification to retailer
- Reject action:
  - Reason selector (stock unavailable / MOQ unmet / suspicious / other)
  - State → **REJECTED**
  - Notification to retailer
  - Inventory remains unchanged
- Retailer-side: Cancel order (only while PENDING_APPROVAL)
- Mark Packed → Mark Ready for Pickup actions
- Pickup OTP generation on READY_FOR_PICKUP transition

**Single-Shop Simplifications:**
- No shop filtering (only one shop)
- All orders are for THE shop
- Queue shows all pending orders (no shop-scoped views needed)

**Decisions required before this phase starts:**
- Finalize `rejectionReason` enum values (schema.md §10).
- Confirm whether retailer cancellation is genuinely allowed through APPROVED (rules.md §2 documents it as allowed, but flags it as worth re-confirming, per app-flow.md §7 open question #3) — this phase is where that decision becomes real, not theoretical.

**Exit criteria (met):** an order can travel PENDING_APPROVAL → APPROVED (with a real inventory decrement visible in Firestore) → PACKED → READY_FOR_PICKUP, entirely through wholesaler action, with a correct `stateHistory` at every step. Pickup OTP generated successfully.

---

## Phase 5 — Delivery Assignment Engine

**Goal:** The nearest-eligible-partner dispatch logic — the one piece of this system with genuine algorithmic complexity.

- `delivery_partners_meta` + RTDB `live_locations` live, partner online/offline toggle.
- Geohash-bounded eligibility query (`geofire-common`) → exclusive-to-shop pool checked first, open-pool as fallback (rules.md §8 — never reverse this order).
- Haversine server-side distance sort on candidates.
- Assignment push notification with SLA countdown; accept → `ASSIGNED`; decline/timeout → reassign to next-nearest.
- Pool-exhausted state: "no partner assigned" banner to wholesaler + manual Admin escalation link (not an auto-cancel).
- Batching support: partner can hold multiple active orders if clustered; combined route view.

**Decisions required before this phase starts:**
- Assignment SLA timeout value — must be a real configured number by this phase, even if provisional (rules.md §12 flags this as unresolved; Phase 5 cannot ship a countdown timer with no duration).
- Geohash precision level (tech-spec.md §16 — needs real shop density data or a reasonable default to start).
- Mapping/routing API vendor for route optimization (Google Maps vs. Mapbox — not named definitively in tech-spec.md).

**Exit criteria:** a READY_FOR_PICKUP order reliably reaches an online, eligible partner, respects exclusivity rules, and correctly reassigns on decline/timeout. Test this with more than one eligible partner in the pool to confirm nearest-first sorting, not just single-partner happy path.

---

## Phase 6 — OTP Handoffs & Delivery Execution

**Goal:** Both custody legs (pickup, drop) close correctly, and the retailer's live tracking becomes real.

- Delivery partner execution screens: navigate to pickup, confirm pickup (wholesaler verifies OTP → `PICKED_UP`), navigate to drop, confirm delivery (partner enters retailer's OTP → `DELIVERED`).
- Retailer tracking screen: full threaded status timeline now has real states to render; live map from `ASSIGNED` onward via RTDB subscription.
- OTP expiry + regenerate flow, owned by the correct role per leg (rules.md §7).

**Decisions required before this phase starts:**
- Confirm OTP expiry field structure — one shared `otpExpiresAt` or two separate fields (schema.md §4 flags this ambiguity; it must be resolved before writing the OTP generation code, not patched after).
- Confirm final OTP default expiry duration (15 min is a "suggestion" per tech-spec.md §7, not a locked value).

**Exit criteria:** a full order can travel READY_FOR_PICKUP → ASSIGNED → PICKED_UP → ON_THE_WAY → DELIVERED with both OTP legs verified by the correct actor, live map visible to the retailer throughout, and a complete `stateHistory`.

---

## Phase 7 — COD Ledger & Payment Settlement

**Goal:** Cash accountability closes the loop the PRD calls out as the core problem statement (PRD.md §1.1).

- Delivery partner: "Mark Cash Collected" at DELIVERED → `ledger_entries` doc, `PENDING_CONFIRMATION`.
- Wholesaler: Payments tab, COD list, "Confirm Cash Received" → `CONFIRMED`, order → `PAYMENT_SETTLED`.
- Scheduled job (cron polling to start, per tech-spec.md §16's own recommendation — don't over-build Cloud Tasks precision on day one) checking SLA breaches → `ESCALATED`, Admin notified.
- Prepaid orders: confirm they reach `PAYMENT_SETTLED` immediately at DELIVERED with no ledger entry involved at all — don't let COD logic leak into the prepaid path.

**Decisions required before this phase starts:**
- COD reconciliation SLA window — real number needed before the scheduled job can be written (rules.md §12).

**Exit criteria:** a COD order and a prepaid order both correctly reach `PAYMENT_SETTLED`, via genuinely different mechanisms; an intentionally-unconfirmed COD entry correctly escalates to Admin after the SLA window in a test environment.

---

## Phase 8 — Disputes & Support

**Goal:** Post-delivery recourse, for both damage/shortage complaints and cash mismatches.

- Retailer: raise dispute (DELIVERED+ orders only), structured form (reason, description, optional photo).
- Wholesaler: respond to disputes tied to their own shop.
- Admin: central dispute queue, resolution actions (force-cancel, force-settle, reassign partner, close-no-action), mandatory resolution notes.

**Decisions required before this phase starts:**
- `dispute.reason` and `dispute.status` enum values (schema.md §10).
- Dispute-raising window length (how long after DELIVERED can a retailer still raise one) — not specified anywhere in source docs; needs a real answer before the "only visible within a dispute window" UI rule can be built (app-flow.md §1.4).

**Exit criteria:** a dispute can be raised, responded to, and resolved by Admin with all three roles seeing correctly updated status, and the resolution actually mutates the underlying order/ledger state where applicable (e.g., force-settle really does write `PAYMENT_SETTLED`).

---

## Phase 9 — Admin Oversight, Config & Analytics

**Goal:** Everything Admin needs to run the platform day-to-day, now that there's real data flowing through every other phase to observe.

- Live Operations: order funnel (Placed → Delivered conversion, drop-off %), map overview of active deliveries.
- Payments oversight: Razorpay settlement log, COD ledger overview with status filters.
- Delivery partner performance metrics (acceptance rate, avg delivery time, rating).
- Misuse/inactivity flagging (repeated cancellations, failed OTP attempts, no-shows, inactivity threshold).
- Settings: SLA configuration UI (assignment timeout, COD reconciliation window — the values Phases 5 and 7 needed provisional numbers for now become genuinely admin-configurable), shop-exclusivity mapping manager.

**Decisions required before this phase starts:**
- Account inactivity threshold value (rules.md §10/§12).
- Exact "misuse pattern" thresholds (e.g., what counts as "repeated" cancellations) — not quantified anywhere in source docs.

**Exit criteria:** every SLA value that was hardcoded provisionally in earlier phases is now read from live Admin configuration, not a constant in code.

---

## Phase 10 — Hardening & Launch Readiness

**Goal:** Make it trustworthy under real load and real users, not just functionally complete.

- Load-test the assignment engine specifically (NFR: nearest-partner query <2s under normal load, PRD.md §5).
- Concurrency test the approval transaction (no double-approval, no double inventory decrement, PRD.md §5).
- Full accessibility pass against design-doc.md §7 (WCAG AA, reduced-motion, 360px viewport, colorblind-safe status pills).
- Notification reliability pass: push + SMS fallback genuinely fires at every transition in Notification-Triggered Flows table (app-flow.md §6).
- Number-masking/proxy service for cross-role phone visibility (PRD.md §5 Data Privacy — currently unimplemented in any earlier phase; don't ship without it).
- Security rules audit against schema.md/tech-spec.md §14 — confirm no client write path was accidentally left open during earlier phases.

**Exit criteria:** every NFR in PRD.md §5 has a corresponding test result, not just a design intention.

---

## Risk Register

| Risk | Phase(s) affected | Mitigation |
|---|---|---|
| Firestore write-rate limits on high-frequency location pings | 5, 6 | RTDB is already the documented mitigation (tech-spec.md §4) — don't let live location data drift into Firestore under time pressure |
| Double-approval / double-assignment race conditions | 4, 5 | Every transition must be a Firestore transaction, not a read-then-write pair — enforce in code review, not just in this doc |
| SLA values hardcoded early and never migrated to config | 5, 7, 9 | Treat every provisional SLA number from Phase 5/7 as tech debt with an explicit ticket to move it into Phase 9's config UI |
| Geohash accuracy trade-off vs. PostGIS-equivalent precision | 5 | Acceptable per tech-spec.md §5 at current scale; revisit if shop density grows |
| Dispute/rejection/status enum values invented ad hoc by different engineers | 4, 8 | Lock these in schema.md before Phase 4 and Phase 8 start, not during |

---

## Decisions Needed Before Any Further Build (consolidated)

Pulling every "decisions required" line above into one punch list, in the order you'll hit them:

1. SMS/email vendor for credential dispatch — needed by Phase 1.
2. `operatingHours` structure, `verificationStatus` values — needed by Phase 2.
3. Razorpay account/keys provisioned — needed by Phase 3.
4. `rejectionReason` enum, retailer-cancel-through-APPROVED confirmation — needed by Phase 4.
5. Assignment SLA timeout value, geohash precision, mapping/routing API vendor — needed by Phase 5.
6. OTP expiry field structure + final duration — needed by Phase 6.
7. COD reconciliation SLA window — needed by Phase 7.
8. `dispute.reason`/`dispute.status` enums, dispute-raising window length — needed by Phase 8.
9. Account inactivity threshold, misuse-pattern thresholds — needed by Phase 9.

None of these block starting Phase 0 or Phase 1's core scaffolding — but each must be answered before the phase that names it, not discovered mid-sprint.

---

## Success Metrics Mapping (ties back to PRD §7)

| PRD Metric | First Phase It's Measurable |
|---|---|
| Order approval time (PLACED → APPROVED/REJECTED) | Phase 4 |
| Delivery assignment success rate (within SLA, no escalation) | Phase 5 |
| COD reconciliation time (collected → confirmed) | Phase 7 |
| Dispute rate (% of delivered orders disputed) | Phase 8 |
| Delivery partner acceptance rate | Phase 5 (raw data), Phase 9 (surfaced) |
| Retailer repeat-order rate | Phase 3 (raw data), Phase 9 (surfaced) |
