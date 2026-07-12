# implementation-plan.md — Build Plan
## B2B Wholesale Marketplace, Order Management & Delivery Dispatch Platform

**Owner:** Product & Engineering
**Status:** Draft — Pre-Build
**Reads alongside:** PRD.md, requirements.md, design-doc.md, app-flow.md, tech-spec.md, schema.md, rules.md
**Purpose:** Sequence the build so each phase only depends on what's already shipped, surface the decisions that must be made *before* a phase starts (not discovered mid-phase), and give every phase a concrete "done" bar tied back to the PRD's success metrics.

---

## 0. Sequencing Logic (why this order)

This system has one real dependency spine: **you cannot dispatch a delivery for an order that can't yet be placed, approved, or paid for.** So the build follows the order's own lifecycle, not the four personas in parallel:

```
Identity & roles → Catalog → Order placement/payment → Approval & inventory →
Delivery assignment → OTP handoffs → COD ledger → Disputes → Admin oversight/config → Hardening
```

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

**Goal:** All four onboarding paths work end to end, exactly as specified in PRD.md §2.1 / tech-spec.md §3.

- Retailer self-signup (phone OTP or email/password via Firebase Auth).
- Wholesaler: (a) Admin-provisioned creation flow, (b) self-registration form creating a disabled account pending Admin approval.
- Delivery partner: Admin-provisioned only — confirm the frontend genuinely has zero public registration route for this role, not just a hidden one.
- Admin: Users tab — approve/reject wholesaler self-registrations, create wholesaler/delivery-partner accounts, suspend/reactivate any account.
- Custom claims (`role`, `status`) set server-side on every account creation/status change.
- Forced password reset on first login for admin-provisioned accounts.

**Decisions required before this phase starts:** none blocking. Confirm SMS/email delivery vendor for credential dispatch (tech-spec.md §16 lists this as unresolved — Twilio vs. MSG91 vs. other) since Phase 1 is the first phase that actually sends credentials.

**Exit criteria:** all four roles can reach their respective dashboard home via their real onboarding path; role-gated routes correctly block cross-role access (verified server-side, not just hidden in the UI).

---

## Phase 2 — Shop & Catalog Management

**Goal:** Wholesalers can stand up a real, browsable shop.

- Shop profile CRUD (name, address, geolocation, geohash computation, category, operating hours, MOQ threshold).
- Item CRUD (name, price, stock qty, unit, availability toggle).
- Retailer-facing shop discovery: search/filter by category, distance, rating; shop profile page showing catalog, price, stock, MOQ threshold upfront.

**Decisions required before this phase starts:**
- `shops.operatingHours` structure (schema.md §2/§10 — not finalized).
- `shops.verificationStatus` value set and what "verified" actually requires (schema.md §2/§10).
- Whether MOQ is purely shop-order-total (current documented decision, rules.md §3) — confirm this is locked before building the checkout gate in Phase 3, since it's referenced there.

**Exit criteria:** a retailer can find a shop, view real stock/price/MOQ, and this data is the same data the wholesaler is managing — no mock data anywhere by end of this phase.

---

## Phase 3 — Order Placement & Payment (PLACED)

**Goal:** A retailer can build a single-shop cart and successfully create a real order, prepaid or COD.

- Single-shop-scoped cart with the "start new order? current cart will be cleared" confirmation modal (app-flow.md §1.2).
- Shop-order MOQ enforcement, client-side gate **and** server-side re-validation in Express (rules.md §3 — never trust client-only).
- Prepaid path: Razorpay order creation (Express) → Checkout modal (frontend) → webhook confirmation (Express) → order enters `PLACED` only on confirmed success.
- COD path: order enters `PLACED` directly.
- Order confirmation screen + initial order-tracking screen shell (status timeline can render just "Placed" for now — full timeline comes with later phases as states become reachable).

**Decisions required before this phase starts:** none new beyond Phase 2's carryover. Confirm Razorpay account/keys are provisioned (staging + prod) before building the payment path, not discovered mid-sprint.

**Exit criteria:** a real order document exists in Firestore with correct schema (schema.md §4), correct `paymentStatus`, and a `stateHistory` entry for `PLACED` with the real `actorUid`.

---

## Phase 4 — Wholesaler Approval & Inventory Lock

**Goal:** The approval gate that the entire trust model depends on (PRD.md §3.2's "why we don't decrement at PLACED").

- Wholesaler incoming-orders queue (PLACED orders for their shop only), with new-order animate-in.
- Approve action: atomic transaction — state → `APPROVED` **and** inventory decrement in the same write (rules.md §2 — this pairing must never be split into two writes).
- Reject action: reason selector (stock unavailable / MOQ unmet / suspicious / other) → state → `REJECTED`, retailer notified.
- Retailer-side: cancel/edit order, only while state ∈ {PLACED, APPROVED, PACKED} (rules.md §2).
- Mark Packed → Mark Ready for Pickup actions, generating the pickup OTP on the `READY_FOR_PICKUP` transition.

**Decisions required before this phase starts:**
- Finalize `rejectionReason` enum values (schema.md §10).
- Confirm whether retailer cancellation is genuinely allowed through APPROVED (rules.md §2 documents it as allowed, but flags it as worth re-confirming, per app-flow.md §7 open question #3) — this phase is where that decision becomes real, not theoretical.

**Exit criteria:** an order can travel PLACED → APPROVED (with a real inventory decrement visible in Firestore) → PACKED → READY_FOR_PICKUP, entirely through wholesaler action, with a correct `stateHistory` at every step. No delivery partner exists in the system yet — that's fine, this phase ends at `READY_FOR_PICKUP` with a generated (unused) pickup OTP.

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
