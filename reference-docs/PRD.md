# Product Requirements Document (PRD)
## B2B Wholesale Marketplace, Order Management & Delivery Dispatch Platform

**Version:** 1.0
**Status:** Draft — Pre-Build
**Owner:** Product & Engineering
**Last Updated:** July 2026

---

## 1. Executive Summary

This platform is a B2B wholesale marketplace connecting **Retailers** (buyers) with **Wholesalers/Shop Owners** (sellers), fulfilled through a dedicated **Delivery Partner** network, and governed by an **Admin** control layer. The model mirrors the operational shape of food-delivery platforms (e.g., Zomato/Swiggy) but applied to wholesale trade — orders are placed per-shop, go through a seller approval gate before fulfillment, and are dispatched via geolocation-based delivery assignment.

The system is deliberately architected to require **no machine learning models** — all logic is rule-based: state machines, geospatial radius queries, workflow engines, and standard CRUD/microservices. This keeps the system deterministic, auditable, and fast to build.

### 1.1 Problem Statement
Wholesale trade between retailers and wholesalers today is largely informal — phone/WhatsApp orders, no inventory visibility, no delivery accountability, and no digital payment reconciliation for cash transactions. This creates friction, disputes, and lost sales for wholesalers, and unreliable fulfillment for retailers.

### 1.2 Solution
A unified platform where:
- Retailers discover shops, browse live inventory, and place orders digitally.
- Wholesalers control approval, packing, and stock exposure — protecting them from overcommitting inventory.
- Delivery is dispatched automatically to the nearest available partner, with a two-sided OTP-verified handoff.
- Cash-on-delivery is tracked as a debt ledger until reconciled, closing the digital-to-cash accountability gap.
- Admin has full audit visibility and dispute resolution control.

### 1.3 Goals
- Digitize and standardize the retailer–wholesaler ordering relationship.
- Provide reliable, trackable last-mile delivery with accountability at both pickup and drop.
- Give wholesalers control over inventory commitment (approval-gated stock lock).
- Provide full financial reconciliation for both prepaid and COD transactions.
- Enable an auditable, disputable, admin-governed marketplace.

### 1.4 Non-Goals (v1)
- No dynamic pricing, demand forecasting, or ML-based recommendation engine.
- No multi-shop cart / cross-shop single checkout.
- No wholesaler-to-wholesaler or retailer-to-retailer transactions.
- No in-app chat (support handled via structured tickets, not free-form chat, in v1).
- No open self-serve onboarding for delivery partners (admin-provisioned only).

---

## 2. Users & Personas

| Persona | Description | Primary Need |
|---|---|---|
| **Retailer** | Small shop/store owner buying stock in bulk from wholesalers | Reliable, transparent bulk ordering with delivery tracking |
| **Wholesaler / Shop Owner** | Bulk goods seller, manages inventory and fulfillment | Control over order approval, inventory accuracy, payment visibility |
| **Delivery Partner** | Individual or shop-linked courier | Clear assignment, efficient routing, fair payment reconciliation |
| **Admin** | Platform operations team | Full visibility, control, and dispute authority across the system |

### 2.1 Authentication Model (Mixed Auth)
| Role | Onboarding Path | Auth Mechanism |
|---|---|---|
| Retailer | Open self-signup | Standard credential/OTP login |
| Wholesaler | Admin-provisioned **or** self-register pending admin approval | Pre-issued credentials — no open signup flow |
| Delivery Partner | Admin-provisioned only | Pre-issued credentials — no signup flow at all |
| Admin | Internal seeding | Secure internal auth (elevated privileges) |

This mixed model exists because wholesalers and delivery partners represent trust-sensitive, revenue-bearing identities that the platform needs to vet before granting access — unlike retailers, who are low-risk demand-side users.

---

## 3. Core Concepts & Domain Model

### 3.1 Order Scope
Orders are **single-shop scoped** (Zomato-style) — a retailer cannot check out a cart spanning multiple wholesalers in one order. Switching shops mid-cart requires clearing or saving the current cart.

### 3.2 Order State Machine
```
PLACED
  → APPROVED → PACKED → READY_FOR_PICKUP → ASSIGNED → PICKED_UP → ON_THE_WAY → DELIVERED → PAYMENT_SETTLED
  → REJECTED (terminal)
PLACED/APPROVED/PACKED → CANCELLED (terminal, pre-pickup only)
DELIVERED → DISPUTED (admin-managed resolution branch)
```

**Key design decision — Inventory Locking:** Stock is decremented only at the **APPROVED** transition, not at PLACED. This intentionally gives the wholesaler a buffer window — they may reject an order if the item is actually out of stock, sourced from elsewhere, or damaged, without the system having falsely reserved inventory.

### 3.3 Payments Model
| Method | Flow |
|---|---|
| **Prepaid** | Razorpay checkout at order placement → webhook confirms payment → order enters PLACED only after payment success |
| **COD** | Order enters PLACED directly. At delivery, delivery partner collects cash → this creates a **debt ledger entry** against the partner → cleared only when the wholesaler confirms "cash received" → if unconfirmed past SLA, auto-escalates to Admin |

### 3.4 Delivery Assignment Model
- **Shop-exclusive partners**: linked to one or more specific shops; receive *only* that shop's orders.
- **Open-pool partners**: eligible for any shop's orders.
- **Assignment logic**: nearest-available-partner-first, via PostGIS radius query, restricted first to eligible partner pool (exclusive-to-shop matches before falling back to open pool, if applicable).
- **Batching**: a partner may hold multiple active orders concurrently if pickup/drop points are geographically clustered; route is optimized across all held orders, not per-order.
- **Timeout handling**: unaccepted assignment reassigns to next-nearest partner after SLA window expires.

### 3.5 OTP Verification (Two-Leg Model)
| Leg | Trigger | Verified By |
|---|---|---|
| **Pickup OTP** | Generated when order reaches READY_FOR_PICKUP / at pickup moment | Wholesaler confirms delivery partner identity at handoff |
| **Drop OTP** | Generated at pickup completion, sent to retailer | Retailer confirms delivery partner at doorstep |

Two independent OTPs close both ends of the custody chain — pickup accountability (was the right partner given the goods) and drop accountability (did the right retailer receive them).

### 3.6 Minimum Order Quantity (MOQ)
MOQ is enforced **per shop-order**, not per line item — consistent with the single-shop cart model. A shop order must meet the shop's configured minimum quantity/value threshold before checkout is allowed.

---

## 4. Functional Requirements by Role

### 4.1 Retailer

**Discovery**
- FR-R1: Browse wholesaler shops with search and filters (category, distance, rating, verification status).
- FR-R2: View shop profile — catalog, per-item stock, price, MOQ threshold.

**Cart & Ordering**
- FR-R3: Add items to a single-shop-scoped cart.
- FR-R4: Select payment method: Prepaid (Razorpay) or COD.
- FR-R5: System blocks checkout if shop-order MOQ threshold isn't met.
- FR-R6: Edit or cancel order only while in PLACED state.
- FR-R7: Upload shop photo + geolocation for reference/verification (own shop profile, used to sharpen delivery drop-pin accuracy).

**Tracking**
- FR-R8: Real-time order status timeline view.
- FR-R9: Live delivery partner location visible from ASSIGNED state onward.
- FR-R10: Enter drop OTP to confirm delivery receipt.
- FR-R11: Order history with reorder shortcut.
- FR-R12: Raise post-delivery disputes (damage, shortage, wrong item) via structured ticket form.

**Notifications**
- FR-R13: Push/SMS alerts on approval/rejection, packed, out-for-delivery, delivered, and any COD-related reminders.

---

### 4.2 Wholesaler / Shop Owner

**Shop & Catalog**
- FR-W1: Manage shop profile (name, geolocation, address, operating hours, category).
- FR-W2: CRUD on items — name, price, stock quantity, unit, MOQ contribution.
- FR-W3: Toggle item availability without deletion.

**Order Handling**
- FR-W4: View incoming PLACED orders queue with full retailer/item detail.
- FR-W5: Approve or Reject with a reason code (stock unavailable, MOQ unmet, suspicious order, etc.).
- FR-W6: On approval, system auto-decrements inventory (see 3.2).
- FR-W7: Mark order Packed → Ready for Pickup, which triggers delivery assignment.
- FR-W8: View filterable order history (date, status, retailer).

**Delivery Coordination**
- FR-W9: View assigned delivery partner details once matched.
- FR-W10: Escalate to Admin if no partner accepts within SLA window.
- FR-W11: Request shop-exclusive delivery partner linkage (subject to Admin approval).

**Payments**
- FR-W12: View payment status per order (Razorpay settled / COD pending / COD collected-unconfirmed / COD confirmed).
- FR-W13: Confirm "cash received" action — clears the delivery partner's debt ledger entry for that order.
- FR-W14: View aggregate outstanding COD debt per delivery partner.

**Support**
- FR-W15: Respond to retailer disputes tied to their own orders.
- FR-W16: View retailer order history for support context.

---

### 4.3 Delivery Partner

**Assignment**
- FR-D1: Receive push notification when an order reaches READY_FOR_PICKUP and partner is eligible.
- FR-D2: Accept/reject assignment within SLA timeout window.
- FR-D3: System enforces shop-exclusivity — exclusive partners see only their linked shop(s)' orders; open-pool partners see any eligible order.
- FR-D4: Accept multiple concurrent orders if pickup/drop points are geographically close (batching).

**Execution**
- FR-D5: View optimized route to pickup shop and drop location for a single order.
- FR-D6: View a combined optimized route across all currently held orders (multi-stop).
- FR-D7: Update order status: Picked Up → On the Way → Delivered.
- FR-D8: Enter/display pickup OTP at wholesaler handoff.
- FR-D9: Enter/collect drop OTP at retailer doorstep to close delivery.

**Payments**
- FR-D10: Mark "cash collected" for COD orders at delivery — creates a debt ledger entry pending wholesaler confirmation.
- FR-D11: View personal earnings and settlement history.
- FR-D12: Receive alert if a debt entry crosses the SLA reconciliation window (auto-escalated to Admin).

**Profile**
- FR-D13: View own shop-exclusivity status and linked shop(s), if any.
- FR-D14: Toggle online/offline availability.

---

### 4.4 Admin

**User & Account Management**
- FR-A1: Create wholesaler accounts and assign credentials directly.
- FR-A2: Approve/reject wholesaler self-registration requests.
- FR-A3: Create delivery partner accounts; configure shop-exclusivity or open-pool status.
- FR-A4: Suspend/deactivate accounts for misuse, fraud signals, or inactivity (auto-flagged after configurable inactivity threshold).

**Monitoring**
- FR-A5: Dashboard: all users, shops, live orders, and order funnel conversion (placed → delivered), with drop-off visibility.
- FR-A6: Payment oversight: Razorpay settlement states and COD debt ledger across all delivery partners.
- FR-A7: Delivery partner performance metrics — acceptance rate, average delivery time, rating.

**Dispute & Risk**
- FR-A8: Central dispute queue aggregating retailer complaints and wholesaler-partner cash mismatches.
- FR-A9: Manual override powers — force-cancel order, reassign delivery partner, force-settle a payment dispute.
- FR-A10: Full timestamped audit trail per order: approvals, pickups, OTP verifications, cash confirmations.
- FR-A11: Misuse pattern flagging — repeated cancellations, failed OTP attempts, delivery partner no-shows.

**Configuration**
- FR-A12: Configure SLA thresholds — assignment timeout, COD debt reconciliation window.
- FR-A13: Manage shop-exclusivity mappings for delivery partners.

---

## 5. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | Nearest-partner assignment query resolves in <2s under normal load |
| **Scalability** | Microservice boundaries allow independent scaling of Order, Delivery, and Payment services |
| **Reliability** | Order state transitions must be atomic and idempotent (no double-approval, no double-assignment) |
| **Auditability** | Every state transition logged immutably with actor, timestamp, and geolocation where relevant |
| **Security** | Role-based access control; wholesaler/delivery credentials never self-serviceable; OTPs time-bound and single-use |
| **Availability** | Delivery tracking and order status must degrade gracefully — cached last-known state if live location temporarily unavailable |
| **Data Privacy** | Retailer and delivery partner phone numbers masked/proxied in cross-role visibility (e.g., via number masking service) |

---

## 6. System Architecture (High-Level)

**Suggested Stack**
- **Frontend:** React (web dashboards for Wholesaler/Admin), Flutter (mobile apps for Retailer/Delivery Partner)
- **Backend:** Microservices — Order Service, Inventory Service, Delivery/Dispatch Service, Payment Service, Notification Service, Admin/Audit Service
- **Database:** PostgreSQL with PostGIS extension for geospatial queries
- **Real-time:** WebSockets for live order tracking and delivery partner location updates
- **Payments:** Razorpay integration (prepaid) + internal ledger system (COD debt tracking)
- **Notifications:** Push (FCM/APNs) + SMS gateway

### 6.1 Why No ML Is Needed
Every core mechanism is deterministic and rule-based:
- Nearest-partner assignment → geospatial radius query + sort by distance (PostGIS `ST_Distance`)
- MOQ enforcement → threshold comparison
- SLA timeout handling → scheduled workflow/timer jobs
- Debt reconciliation → ledger state + threshold-based escalation
- Order state transitions → explicit finite state machine

This keeps the system fully explainable and auditable — a hard requirement for a financial/logistics platform handling cash reconciliation and disputes.

---

## 7. Key Metrics / Success Criteria

| Metric | Target Signal |
|---|---|
| Order approval time (wholesaler) | Median time from PLACED → APPROVED/REJECTED |
| Delivery assignment success rate | % of orders assigned within SLA without escalation |
| COD reconciliation time | Median time from cash-collected → wholesaler-confirmed |
| Dispute rate | % of delivered orders resulting in a dispute |
| Delivery partner acceptance rate | % of assignments accepted vs. timed out |
| Retailer repeat-order rate | % of retailers placing 2+ orders in 30 days |

---

## 8. Open Questions (Pre-Build)

1. **Dual OTP flow** — confirm both pickup-leg and drop-leg OTPs are independently generated and verified (current assumption: yes, two distinct OTPs).
2. **MOQ enforcement** — confirmed as per-shop-order threshold, not per-item (documented in 3.6); confirm threshold is configurable per wholesaler.
3. **SLA durations** — need concrete values for (a) delivery assignment timeout, (b) COD debt reconciliation escalation window.
4. **Shop-exclusive partner release** — should exclusive partners be releasable to the open pool during idle hours (e.g., no orders from their linked shop for X minutes)? Needs a policy decision.

---

## 9. Out of Scope / Future Considerations
- Multi-shop single checkout
- In-app real-time chat between roles
- Dynamic/demand-based pricing
- Wholesaler-to-wholesaler transfer orders
- Delivery partner self-onboarding
- Loyalty/rewards programs

---

## 10. Appendix — Role Summary Quick Reference

| Capability | Retailer | Wholesaler | Delivery Partner | Admin |
|---|:---:|:---:|:---:|:---:|
| Self sign-up | ✅ | ⚠️ (approval-gated) | ❌ | ❌ |
| Browse/order | ✅ | — | — | — |
| Approve/reject orders | — | ✅ | — | ✅ (override) |
| Inventory management | — | ✅ | — | — |
| Delivery assignment | — | — | ✅ (accept) | ✅ (config/override) |
| OTP verification | ✅ (drop) | ✅ (pickup) | ✅ (both legs) | — |
| Payment reconciliation | — | ✅ (COD confirm) | ✅ (COD collect) | ✅ (oversight) |
| Dispute resolution | ✅ (raise) | ✅ (respond) | — | ✅ (resolve) |
| Full audit access | — | — | — | ✅ |
