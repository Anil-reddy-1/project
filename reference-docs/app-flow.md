# App Flow Document
## B2B Wholesale Marketplace — Screen-by-Screen User Flows

**Version:** 1.0
**Status:** Draft — Pre-Build
**Scope:** Web-only (Next.js), all 4 roles. Describes navigation paths, screens, states, and edge cases per user journey.

---

## 1. Retailer Flow

### 1.1 Onboarding
```
Landing Page
  → Sign Up (phone/email) → Firebase OTP/email verification
  → Basic Profile Setup (name, business name, address, geolocation)
  → Optional: Upload shop photo for verification/reference
  → Home / Shop Discovery Feed
```
**Edge cases:** unverified phone → blocked from placing first order until verified. Incomplete profile → banner prompt on Home, non-blocking.

### 1.2 Shop Discovery → Ordering
```
Home / Discovery Feed
  → Search/Filter Shops (category, distance, rating)
  → Shop Profile Page (catalog, prices, stock, MOQ threshold shown upfront)
  → Add items to Cart (single-shop scoped)
      → [If retailer already has items from a different shop in cart]
          → Modal: "Start new order? Current cart will be cleared" → Confirm/Cancel
  → Cart Review Screen
      → MOQ check: if under threshold, checkout button disabled + inline message
          showing how much more is needed to unlock checkout
  → Checkout Screen
      → Select Payment Method: Prepaid (Razorpay) | COD
          → Prepaid: Razorpay Checkout modal → Success/Failure
              → Failure: return to Checkout Screen, retry option
              → Success: → Order Confirmation Screen
          → COD: → Order Confirmation Screen directly
  → Order Confirmation Screen (state: PLACED)
      → CTA: "Track Order" / "Continue Browsing"
```

### 1.3 Order Tracking
```
Order Tracking Screen (per order)
  - Status Timeline (animated step progression):
      Placed → Approved → Packed → Picked Up → On the Way → Delivered
  - If REJECTED: timeline halts, reason shown, CTA "Reorder" or "Browse other shops"
  - If ASSIGNED onward: Live Map with delivery partner location + ETA
  - If PICKED_UP onward: "Enter OTP" prompt appears (drop OTP) once partner is near/at drop
      → Retailer shares OTP verbally to delivery partner, OR
      → Retailer enters OTP shown to delivery partner (implementation choice — recommend
        OTP is shown on retailer's screen, spoken/shown to partner, not typed by retailer)
  - Post DELIVERED: "Rate & Report Issue" CTA appears
```

### 1.4 Order History & Disputes
```
Order History Tab
  → List of past orders (filter by status/date)
  → Tap order → Order Detail Screen
      → "Reorder" CTA (pre-fills cart with same shop + items, subject to current stock)
      → "Raise Dispute" CTA (only visible for DELIVERED orders within a dispute window)
          → Dispute Form (reason category, description, optional photo upload)
          → Submission Confirmation → Dispute Status visible in "My Disputes" tab
```

### 1.5 Notifications → Deep Links
```
Push Notification received (order approved / out for delivery / delivered / etc.)
  → Tap → Deep link directly to that Order Tracking Screen
```

---

## 2. Wholesaler / Shop Owner Flow

### 2.1 Onboarding
```
[Path A — Admin Provisioned]
Admin creates account → Wholesaler receives credentials (SMS/email)
  → First Login → Forced Password Reset → Shop Profile Setup Wizard
      (shop name, address+geolocation, category, operating hours, MOQ threshold)
  → Dashboard Home

[Path B — Self-Registration Pending Approval]
Self-Registration Form (shop + owner details)
  → Submission Confirmation: "Pending Admin Approval"
  → [Blocked state] → Login attempts show "Account Pending Approval" screen
  → Admin approves → Email/SMS notification → First Login → Dashboard Home
```

### 2.2 Catalog Management
```
Dashboard Home
  → Catalog Tab
      → Item List (with stock/price/availability toggle inline)
      → "Add Item" → Item Form (name, price, stock qty, unit, MOQ contribution)
      → Edit/Delete existing item
      → Toggle "Out of Stock" switch (item hidden from retailer browsing, not deleted)
```

### 2.3 Incoming Orders → Fulfillment
```
Dashboard Home → Incoming Orders Tab (badge count of PLACED orders)
  → Order Queue List (new orders animate in at top — Framer Motion slide/fade)
  → Tap order → Order Detail Screen
      → Approve → [Inventory auto-decremented] → state: APPROVED
          → CTA changes to "Mark as Packed"
      → Reject → Reason Selector (stock unavailable / MOQ unmet / other + note)
          → state: REJECTED → Retailer notified
  → After Approve: "Mark as Packed" → state: PACKED
  → "Mark Ready for Pickup" → state: READY_FOR_PICKUP
      → Triggers delivery assignment engine (background, no wholesaler action needed)
      → System generates Pickup OTP → shown on this screen for wholesaler reference
  → [If no partner accepts within SLA]
      → Banner: "No delivery partner assigned yet" + "Escalate to Admin" CTA
  → Delivery Partner Arrives → Wholesaler enters/confirms Pickup OTP on this screen
      → state: PICKED_UP (handoff confirmed)
```

### 2.4 Payment Reconciliation
```
Dashboard Home → Payments Tab
  → Two views: "Prepaid Orders" (Razorpay settled, read-only) and "COD Orders"
  → COD Orders List: shows status per order — Pending Collection / Collected-Unconfirmed / Confirmed
  → Tap "Collected-Unconfirmed" order → "Confirm Cash Received" CTA
      → Confirmation Modal → Confirm → ledger entry cleared, partner debt reduced
  → Outstanding Debt Summary panel (per delivery partner, aggregate pending amounts)
```

### 2.5 Support & History
```
Dashboard Home → Orders History Tab (filterable)
  → Disputes Tab → List of disputes tied to this shop's orders
      → Tap dispute → Respond Form → Submit response → status updates
```

---

## 3. Delivery Partner Flow

### 3.1 Onboarding
```
Admin creates account → Partner receives credentials (SMS/email)
  → First Login → Forced Password Reset → Profile Confirmation
      (view own exclusivity status: "Exclusive to [Shop Name]" or "Open Pool")
  → Toggle "Go Online" → Home / Assignment Screen
```
**Edge case:** partner cannot toggle online if account status is suspended — shown a static "Account Suspended, contact Admin" screen.

### 3.2 Assignment → Acceptance
```
Home / Assignment Screen (idle, online)
  → Push Notification: "New order near you — [Shop Name], [distance]"
      → Tap → Assignment Detail Screen
          - Pickup location, drop location, estimated distance/time
          - Countdown timer (SLA window) — animated urgency indicator as it nears zero
      → Accept → state: ASSIGNED, order added to "My Active Orders"
      → Decline / Timeout → assignment passes to next-nearest partner,
          screen returns to idle Home
  → [If multiple orders nearby] → can accept a second order while first is still
      in pickup stage → both appear in "My Active Orders" with combined route view
```

### 3.3 Pickup → Delivery Execution
```
My Active Orders List
  → Tap order → Order Execution Screen
      → "Navigate to Pickup" → Map view with route (single or multi-stop if batched)
      → At shop: "Confirm Pickup" → Enter/Display Pickup OTP
          → Wholesaler verifies on their screen → state: PICKED_UP
      → "Navigate to Drop" → Map view updates to drop-location route
      → At retailer: "Confirm Delivery" → Enter Drop OTP (shown to partner by retailer)
          → Verified → state: ON_THE_WAY → DELIVERED
      → [If COD] → "Mark Cash Collected" CTA appears immediately after delivery confirm
          → Confirm amount → ledger entry created (Pending Confirmation)
      → Order moves from "Active" to "Completed" list
```

### 3.4 Earnings & Debt
```
Home → Earnings Tab
  → Completed order list with per-order payout
  → "Outstanding Cash to Settle" panel — shows COD amounts pending wholesaler confirmation
      → [If any entry crosses SLA window] → flagged red, "Escalated to Admin" label
```

### 3.5 Going Offline
```
Home → Toggle "Go Offline"
  → [If active orders in progress] → Warning modal: "You have active deliveries,
      go offline only after completing them" — soft warning, not hard block
  → Offline state → no new assignment notifications received
```

---

## 4. Admin Flow

### 4.1 Login → Dashboard Home
```
Secure Login (internal)
  → Dashboard Home
      - Summary cards: Active Orders, Pending Wholesaler Approvals (self-reg),
        Open Disputes, Escalated COD Debts
```

### 4.2 User & Account Management
```
Dashboard Home → Users Tab
  → Sub-tabs: Retailers | Wholesalers | Delivery Partners
  → Wholesalers Sub-tab
      → "Pending Self-Registrations" list → Tap → Review Detail → Approve/Reject
      → "Create Wholesaler" CTA → Form (owner details, shop basics) → Creates
          Firebase Auth user + shop doc → credentials dispatched
  → Delivery Partners Sub-tab
      → "Create Delivery Partner" CTA → Form (details + exclusivity config:
          "Open Pool" or "Exclusive to Shop(s)" — shop picker)
  → Any user row → Detail Panel → "Suspend Account" / "Reactivate" toggle
  → Inactivity Flags: auto-flagged accounts surfaced in a filtered view
```

### 4.3 Monitoring
```
Dashboard Home → Live Operations Tab
  → Real-time order funnel view (Placed → Approved → Delivered counts, drop-off %)
  → Map overview of active deliveries in progress
  → Payments Tab
      → Razorpay settlement log
      → COD Ledger overview across all partners/wholesalers
          → Filter by status: Pending / Confirmed / Escalated
```

### 4.4 Disputes & Overrides
```
Dashboard Home → Disputes Tab
  → Dispute Queue (new items highlighted)
  → Tap dispute → Detail Screen
      - Full order audit trail (state history, OTP verification timestamps,
        cash confirmation timestamps)
      → Resolution Actions: "Force Cancel Order" / "Force Settle Payment" /
          "Reassign Delivery Partner" / "Close — No Action" (each with required
          resolution notes field)
  → Resolution submitted → status updates, relevant parties notified
```

### 4.5 Configuration
```
Dashboard Home → Settings Tab
  → SLA Configuration: Assignment timeout (minutes), COD reconciliation window (hours/days)
  → Shop-Exclusivity Mapping Manager: bulk view/edit of which partners are linked to
      which shops
```

---

## 5. Cross-Role Flow — Full Order Lifecycle (Composite View)

```
RETAILER: Browse → Cart → Checkout (Prepaid/COD) → [PLACED]
                                                        │
WHOLESALER: Incoming Orders Queue → Approve/Reject      │
   Approve → [APPROVED, stock decremented] → Pack → [PACKED]
   → Mark Ready → [READY_FOR_PICKUP] → Pickup OTP generated
                                                        │
SYSTEM: Geo-assignment engine → notifies nearest eligible partner
                                                        │
DELIVERY PARTNER: Accepts → [ASSIGNED] → Navigate to shop
   → Confirm Pickup (OTP verified by wholesaler) → [PICKED_UP]
   → Navigate to retailer → [ON_THE_WAY]
   → Confirm Delivery (OTP verified, entered by partner) → [DELIVERED]
   → [If COD] Mark Cash Collected → ledger entry (Pending)
                                                        │
WHOLESALER: Confirm Cash Received → ledger (Confirmed) → [PAYMENT_SETTLED]
                                                        │
RETAILER: Rate & optionally Raise Dispute
                                                        │
ADMIN: Monitors entire chain via audit trail; intervenes only on escalation/dispute
```

---

## 6. Notification-Triggered Flows (Summary Table)

| Trigger Event | Notified Role(s) | Deep Link Destination |
|---|---|---|
| Order placed | Wholesaler | Incoming Orders Queue |
| Order approved/rejected | Retailer | Order Tracking Screen |
| Ready for pickup / assignment offer | Delivery Partner | Assignment Detail Screen |
| No partner accepted (SLA breach) | Wholesaler, Admin | Order Detail / Admin Live Ops |
| Order picked up | Retailer | Order Tracking Screen |
| Order delivered | Retailer, Wholesaler | Order Tracking / Payments Tab |
| COD debt SLA breach | Admin, Wholesaler | Admin Payments Tab / Wholesaler Payments Tab |
| Dispute raised | Wholesaler, Admin | Disputes Tab |
| Dispute resolved | Retailer, Wholesaler | Order Detail / My Disputes |

---

## 7. Edge Case & Error State Summary

| Scenario | Flow Handling |
|---|---|
| Retailer places order, wholesaler never responds | SLA timer on Express side (future enhancement — currently no auto-timeout defined for approval; recommend adding one) |
| No delivery partner available nearby | Wholesaler sees "no partner assigned" banner + manual Admin escalation path |
| OTP expires before use | Regenerate option surfaced to the role that owns that OTP leg (wholesaler for pickup, retailer for drop) |
| Retailer cancels after APPROVED | Blocked — cancellation only allowed pre-approval per current state machine; must go through dispute/support flow instead |
| Delivery partner goes offline mid-delivery | Active order remains assigned to them; Admin can manually reassign via override if needed |
| Wholesaler never confirms COD cash | Auto-escalates to Admin after configured SLA window |

---

## 8. Open Flow Questions
1. Should there be an approval-stage SLA timer (auto-escalate to Admin if wholesaler doesn't respond to a PLACED order within X minutes)? Not currently defined.
2. For drop OTP — confirmed flow is "retailer shows OTP, partner enters it." Confirm this direction (vs. partner showing a confirmation code to retailer).
3. Should retailers be able to cancel an APPROVED (but not yet packed) order, or is dispute/support the only route once approved?
