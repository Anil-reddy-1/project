# rules.md — Canonical Business Rules & Logic
## B2B Wholesale Marketplace, Order Management & Delivery Dispatch Platform

**Purpose of this file:** This is the single source of truth for *behavior* — state transitions, permissions, and business logic — matching schema.md's data model. Derived strictly from PRD.md, requirements.md, tech-spec.md, and app-flow.md. Any logic not written here should not be assumed; add it here first, then implement it.

---

## 1. Roles & Auth (fixed, do not alter without explicit instruction)

| Role | Onboarding | Auth |
|---|---|---|
| `retailer` | Open self-signup | Standard Firebase Auth (phone OTP or email/password) |
| `wholesaler` | Admin-provisioned **or** self-register pending approval | Pre-issued credentials, no open signup; self-reg creates a **disabled** Firebase Auth user until Admin approves |
| `delivery_partner` | Admin-provisioned **only** — no public registration route exists anywhere in the frontend | Pre-issued credentials |
| `admin` | Seeded via one-time setup script | Internal auth, no UI creation path |

- Role is stored as a Firebase custom claim, set **server-side only** (Express + Admin SDK), never client-side.
- Frontend route/middleware gating by role is **UX only** — it is never the security boundary. Express re-validates the claim on every request.
- All writes to `orders`, `users.role`, `users.status` go through Express → Admin SDK. Client-side Firestore writes to these are disabled at the security-rules level.
- Firestore/RTDB direct client reads are allowed for real-time listeners (order status, live location) — reads only, never writes.

---

## 2. Order State Machine (authoritative)

```
PLACED
  → APPROVED (wholesaler) → PACKED (wholesaler) → READY_FOR_PICKUP (wholesaler)
    → ASSIGNED (system, on partner accept) → PICKED_UP (system, on pickup OTP verify)
      → ON_THE_WAY (delivery partner) → DELIVERED (system, on drop OTP verify)
        → PAYMENT_SETTLED (system: immediate for prepaid; on wholesaler cash confirm for COD)
  → REJECTED (wholesaler) — terminal
PLACED / APPROVED / PACKED → CANCELLED (retailer, pre-pickup only) — terminal
DELIVERED → DISPUTED (retailer raises; admin manages resolution) — non-terminal, resolves back via admin action
```

**Hard rules:**
- Every transition must be validated as `(currentState, action, actorRole) → nextState`; invalid combinations throw, never silently no-op.
- Every transition is atomic (single Firestore transaction) and appends one entry to `orders.stateHistory`. No transition should ever be written without a corresponding `stateHistory` entry — that array is the entire audit trail.
- **Inventory decrement happens exactly once, at PLACED → APPROVED**, inside the same transaction as the state write. Never decrement at PLACED. Never decrement again at any later state.
- **Retailer cancellation is only permitted while state ∈ {PLACED, APPROVED, PACKED}.** Once `READY_FOR_PICKUP` or later, cancellation is blocked; the only route is a post-delivery dispute (see §6). Do not implement a cancel action reachable from `READY_FOR_PICKUP` onward.
- **Order edits** (retailer changing items/qty) are only permitted while state == `PLACED`.
- Prepaid orders never enter `PLACED` until the Razorpay webhook confirms payment success — before that they sit in a `PAYMENT_PENDING` pseudo-state that is not part of the `state` enum and is not wholesaler-visible.
- No approval-stage SLA timer currently exists (open question, not yet resolved) — do not invent an auto-escalation-on-approval-delay behavior unless explicitly instructed.

---

## 3. MOQ (Minimum Order Quantity)

- MOQ is enforced **per shop-order as a whole**, not per line item. This is the confirmed decision in PRD.md §3.6, overriding the "confirm which" ambiguity left open in requirements.md.
- Threshold (`shops.moqThreshold`) is configurable per wholesaler/shop.
- Checkout is blocked client-side and must also be re-validated server-side (Express) before creating the order — never trust a client-side-only MOQ check.
- UI must show how much more is needed to unlock checkout, not just a blocked button (app-flow.md §1.2).

---

## 4. Cart Rules

- Cart is single-shop scoped. Adding an item from a different shop while items from another shop exist in cart must prompt: "Start new order? Current cart will be cleared" (Confirm/Cancel) — never silently merge or silently clear.
- No multi-shop checkout exists anywhere in this system (explicit non-goal, PRD.md §1.4).

---

## 5. Payments

### 5.1 Prepaid (Razorpay)
- Flow: Express creates a Razorpay order → frontend opens Razorpay Checkout → Razorpay sends webhook to Express → Express verifies webhook signature → only on confirmed success does the order transition into `PLACED`.
- The order must not be visible to the wholesaler before payment clears.
- Failure returns the retailer to the Checkout screen with a retry option; it does not create a dead order record in `PLACED`.

### 5.2 COD (Cash on Delivery)
- Order enters `PLACED` directly — no payment gate.
- At `DELIVERED`, delivery partner marks "cash collected" → creates a `ledger_entries` doc with `status: PENDING_CONFIRMATION`.
- Wholesaler confirms "cash received" → `status: CONFIRMED`, `confirmedAt` set → this is what triggers `PAYMENT_SETTLED` on the order.
- A scheduled job checks `PENDING_CONFIRMATION` entries against the configured SLA window; past it, flips to `ESCALATED` and notifies Admin. **The SLA window duration itself is an open configuration value, not yet numerically defined** — do not hardcode a number (e.g. "24 hours") without confirming with the user; treat it as `Admin`-configurable per FR-A12.
- Amounts are never rounded in any ledger/payment-facing display or computation.

---

## 6. Disputes

- Retailers may raise a dispute only for orders in `DELIVERED` (or later) state, within a dispute window (window length not specified in source docs — do not invent a number).
- Dispute reasons: damage, shortage, wrong item, or other (exact enum not finalized — see schema.md §10).
- Wholesaler can respond to disputes tied to their own shop's orders only.
- Admin resolution actions: Force Cancel Order, Force Settle Payment, Reassign Delivery Partner, Close — No Action. Every resolution requires a notes field — never allow a resolution to be submitted without notes.
- Resolving a dispute notifies the relevant parties (retailer + wholesaler at minimum).

---

## 7. OTP (Two-Leg Model)

| Leg | Generated At | Verified By | Verification Action |
|---|---|---|---|
| Pickup OTP | `READY_FOR_PICKUP` transition | Wholesaler | Wholesaler confirms delivery partner's OTP at handoff → transitions order to `PICKED_UP` |
| Drop OTP | `PICKED_UP` transition (i.e., once pickup is confirmed) | Delivery partner | Retailer's OTP is shown on the retailer's screen; retailer shows/speaks it to the partner; **partner enters it** → transitions order to `DELIVERED` |

- These are two independent, single-use OTPs — never share one OTP across both legs.
- OTPs are hashed (bcrypt) at rest; plaintext is only ever transmitted via push/SMS or shown in-app to the party who owns that leg.
- Default expiry window: 15 minutes (tech-spec.md §7 — stated as a "default suggestion," treat as configurable, not hardcoded as final).
- Expiry triggers a regenerate option for the role that owns that leg — never an automatic order failure.
- Drop OTP direction is explicitly: retailer shows/speaks it, partner enters it (app-flow.md §1.3, confirmed direction) — do not implement the reverse (partner showing a code to retailer) without explicit instruction, since this was listed as an open question and the docs state a recommended/confirmed direction.

---

## 8. Delivery Assignment

- Eligibility pool is checked in this order: **shop-exclusive partners linked to this shop first**, then **open-pool partners** as fallback — never query open-pool before exhausting exclusive-to-shop matches, if any exist and are online.
- Within an eligible pool, sort candidates by distance (nearest first). No PostGIS available in this stack — assignment uses geohash bounding-box query (`geofire-common`) + server-side haversine distance filter on candidates, not a native radius query.
- Assignment notification sent to nearest candidate only, with an SLA countdown timer.
- On decline or timeout, reassign to next-nearest candidate — repeat until accepted or pool exhausted (pool-exhausted behavior: surfaces "no partner assigned" banner to wholesaler + manual Admin escalation option; this is NOT an automatic order failure or cancellation).
- **Batching:** a partner may hold multiple concurrent active orders if pickup/drop points are geographically clustered. Route is optimized across all held orders, not computed per-order once a partner has more than one active order.
- Whether an exclusive partner can ever be released to the open pool during idle hours is an **open policy question, not decided** — do not implement automatic release logic without explicit confirmation.

---

## 9. Delivery Partner Availability

- Partner toggles online/offline manually.
- Going offline with active orders in progress shows a **soft warning**, not a hard block ("you have active deliveries..."). Never prevent the offline toggle outright.
- A suspended account cannot toggle online at all — shown a static "Account Suspended, contact Admin" screen instead of the assignment/home screen.
- If a partner goes offline mid-delivery, their active order stays assigned to them; only Admin can manually reassign via override.

---

## 10. Admin Overrides & Audit

- Admin override actions: force-cancel an order, reassign a delivery partner, force-settle a payment dispute — all available regardless of the order's current state restrictions that apply to other roles.
- Every state transition, OTP verification, and cash confirmation must be timestamped and attributed to an `actorUid` in `stateHistory` / ledger records — this is the audit trail; there is no separate audit database.
- Admin can suspend/deactivate any account; accounts are also auto-flagged after a configurable inactivity threshold (exact threshold not specified — Admin-configurable, do not hardcode).
- Admin configures, at minimum: assignment timeout SLA, COD debt reconciliation SLA window. Treat both as configuration values read at runtime, never hardcoded constants in business logic.

---

## 11. Permissions Matrix (action-level)

| Action | Retailer | Wholesaler | Delivery Partner | Admin |
|---|:---:|:---:|:---:|:---:|
| Place order | ✅ | — | — | — |
| Edit/cancel order (PLACED/APPROVED/PACKED only) | ✅ | — | — | ✅ (force-cancel, any state) |
| Approve/Reject order | — | ✅ (own shop only) | — | ✅ (override) |
| Mark Packed / Ready for Pickup | — | ✅ (own shop only) | — | — |
| Accept/decline assignment | — | — | ✅ (own offers only) | — |
| Verify pickup OTP | — | ✅ (own shop only) | — | — |
| Verify drop OTP (enters it) | — | — | ✅ | — |
| Mark cash collected | — | — | ✅ (own deliveries only) | — |
| Confirm cash received | — | ✅ (own shop only) | — | — |
| Raise dispute | ✅ (own orders, DELIVERED+) | — | — | — |
| Respond to dispute | — | ✅ (own shop's orders only) | — | ✅ |
| Resolve dispute | — | — | — | ✅ |
| Create wholesaler/partner accounts | — | — | — | ✅ |
| Suspend/reactivate accounts | — | — | — | ✅ |
| Configure SLA thresholds | — | — | — | ✅ |

---

## 12. Open Questions — Do Not Silently Resolve

These are explicitly unresolved in the source docs. If an implementation decision touches one of these, stop and ask rather than assuming an answer:

1. Approval-stage SLA timer — does a PLACED order auto-escalate to Admin if the wholesaler doesn't respond within X minutes? Not currently defined.
2. Exact numeric SLA values — delivery assignment timeout, COD debt reconciliation window, account inactivity threshold, dispute-raising window. All are "Admin-configurable" in concept but have no confirmed default numbers.
3. Can a shop-exclusive delivery partner ever be released to the open pool during idle hours? No policy decided.
4. Retailer cancellation of an APPROVED-but-not-yet-packed order — current rule allows it (§2), but source docs flag this as still worth confirming.
5. Exact enum/value sets flagged in schema.md §10 (`operatingHours`, `verificationStatus`, `rejectionReason`, `dispute.status`, `dispute.reason`).
