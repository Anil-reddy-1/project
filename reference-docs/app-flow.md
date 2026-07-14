# App Flow Document
## Single-Shop B2B Wholesale Order Management Platform — Screen-by-Screen User Flows

**Version:** 2.0  
**Architecture:** Single Wholesaler, Single Shop (NOT Marketplace)  
**Status:** Updated for Single-Shop Model  
**Scope:** Web-only (Next.js), all 4 roles. Describes navigation paths, screens, states, and edge cases per user journey.

---

## ⚠️ CRITICAL ARCHITECTURAL CONTEXT

**This is NOT a marketplace.** This is a single-business wholesale platform with:
- **ONE Admin**
- **ONE Wholesaler** (the business owner)
- **ONE Shop** (the wholesale business)
- **Multiple Retailers** (customers)
- **Multiple Delivery Partners**

All retailers order from the same shop. There is no shop discovery, wholesaler registration, or multi-tenant logic.

---

## 1. Retailer Flow

### 1.1 Onboarding
```
Landing Page
  → Sign Up (phone/email) → Firebase OTP/email verification
  → Basic Profile Setup (name, business name, address, geolocation)
  → Optional: Upload shop photo for verification/reference
  → Home / Product Catalog (direct access to THE shop's products)
```
**Edge cases:** unverified phone → blocked from placing first order until verified. Incomplete profile → banner prompt on Home, non-blocking.

**REMOVED:** Shop discovery, shop search, shop selection (single shop only)

### 1.2 ~~Shop Discovery~~ → Product Browsing → Ordering
```
Home / Product Catalog (THE shop's inventory)
  → Browse/Search Products (category, price, availability)
  → Product Detail Page (price, stock, MOQ, description)
  → Add items to Cart
      → [No multi-shop cart conflicts - only one shop exists]
  → Cart Review Screen
      → MOQ check: if under threshold, checkout button disabled + inline message
          showing how much more is needed to unlock checkout
  → Checkout Screen
      → Select Delivery Address
      → Select Payment Method: PhonePe (Prepaid) | COD
          → PhonePe: PhonePe Checkout redirect → Success/Failure
              → Failure: return to Checkout Screen, retry option
              → Success: → Order Confirmation Screen
          → COD: → Order Confirmation Screen directly
  → Order Confirmation Screen (state: PENDING_APPROVAL)
      → CTA: "Track Order" / "Continue Shopping"
```

**CHANGED:** 
- Removed shop discovery/selection flow
- Direct product catalog access
- PhonePe instead of Razorpay
- Initial state is PENDING_APPROVAL (awaiting wholesaler approval)

### 1.3 Order Tracking
```
Order Tracking Screen (per order)
  - Status Timeline (animated step progression):
      Pending Approval → Approved → Packed → Picked Up → On the Way → Delivered
      OR
      Pending Approval → Rejected (with reason)
  - If REJECTED: timeline halts, reason shown, CTA "Contact Support" or "Place New Order"
  - If APPROVED onward: Timeline progresses through fulfillment stages
  - If ASSIGNED onward: Live Map with delivery partner location + ETA
  - If PICKED_UP onward: "Enter OTP" prompt appears (drop OTP) once partner is near/at drop
      → Retailer shares OTP verbally to delivery partner, OR
      → Retailer enters OTP shown to delivery partner (implementation choice — recommend
        OTP is shown on retailer's screen, spoken/shown to partner, not typed by retailer)
  - Post DELIVERED: "Rate & Report Issue" CTA appears
```

**CHANGED:** Added PENDING_APPROVAL as first state (awaiting wholesaler approval)

### 1.4 Order History & Disputes
```
Order History Tab
  → List of past orders (filter by status/date)
  → Tap order → Order Detail Screen
      → "Reorder" CTA (pre-fills cart with same items, subject to current stock)
      → "Raise Dispute" CTA (only visible for DELIVERED orders within a dispute window)
          → Dispute Form (reason category, description, optional photo upload)
          → Submission Confirmation → Dispute Status visible in "My Disputes" tab
```

**CHANGED:** Removed "Browse other shops" (only one shop exists)

### 1.5 Notifications → Deep Links
```
Push Notification received (order approved / out for delivery / delivered / etc.)
  → Tap → Deep link directly to that Order Tracking Screen
```

---

## 2. Wholesaler / Shop Owner Flow

### 2.1 Onboarding

**⚠️ SINGLE WHOLESALER ONLY:** There is exactly ONE wholesaler account in the system.

```
[Admin Provisioned — ONLY PATH]
Admin creates THE wholesaler account via seed script
  → Wholesaler receives credentials (SMS/email)
  → First Login → Forced Password Reset → Shop Profile Setup
      (shop name, address+geolocation, category, operating hours, MOQ threshold)
  → Dashboard Home
```

**REMOVED:** 
- Self-registration flow (no wholesaler onboarding)
- Pending approval state
- Multiple wholesaler support

**NOTE:** The wholesaler account is created once during system setup, not through a registration flow.

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
Dashboard Home → Incoming Orders Tab (badge count of PENDING_APPROVAL orders)
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

**CHANGED:** Initial state is PENDING_APPROVAL instead of PLACED

### 2.4 Payment Reconciliation
```
Dashboard Home → Payments Tab
  → Two views: "Prepaid Orders" (PhonePe settled, read-only) and "COD Orders"
  → COD Orders List: shows status per order — Pending Collection / Collected-Unconfirmed / Confirmed
  → Tap "Collected-Unconfirmed" order → "Confirm Cash Received" CTA
      → Confirmation Modal → Confirm → ledger entry cleared, partner debt reduced
  → Outstanding Debt Summary panel (per delivery partner, aggregate pending amounts)
```

**CHANGED:** PhonePe instead of Razorpay

### 2.5 Support & History
```
Dashboard Home → Orders History Tab (filterable)
  → Disputes Tab → List of disputes tied to THE shop's orders
      → Tap dispute → Respond Form → Submit response → status updates
```

**CHANGED:** Simplified to "THE shop" (single shop only)

---

## 3. Delivery Partner Flow

### 3.1 Onboarding
```
Admin creates account → Partner receives credentials (SMS/email)
  → First Login → Forced Password Reset → Profile Confirmation
      (view own exclusivity status: "Exclusive to THE Shop" or "Open Pool")
  → Toggle "Go Online" → Home / Assignment Screen
```
**Edge case:** partner cannot toggle online if account status is suspended — shown a static "Account Suspended, contact Admin" screen.

**CHANGED:** Simplified exclusivity to "THE Shop" (only one shop exists)

### 3.2 Assignment → Acceptance
```
Home / Assignment Screen (idle, online)
  → Push Notification: "New order ready for pickup — [distance]"
      → Tap → Assignment Detail Screen
          - Pickup location (THE shop), drop location, estimated distance/time
          - Countdown timer (SLA window) — animated urgency indicator as it nears zero
      → Accept → state: ASSIGNED, order added to "My Active Orders"
      → Decline / Timeout → assignment passes to next-nearest partner,
          screen returns to idle Home
  → [If multiple orders nearby] → can accept a second order while first is still
      in pickup stage → both appear in "My Active Orders" with combined route view
```

**CHANGED:** Removed shop name from notification (only one shop exists)

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
      - Summary cards: Active Orders, Open Disputes, Escalated COD Debts,
        System Health Metrics
```

**REMOVED:** "Pending Wholesaler Approvals" (no wholesaler self-registration)

### 4.2 User & Account Management
```
Dashboard Home → Users Tab
  → Sub-tabs: Retailers | Wholesaler | Delivery Partners
  → Wholesaler Sub-tab (READ-ONLY)
      → Shows THE single wholesaler account
      → View profile details
      → "Reset Password" / "Suspend Account" options (admin override)
      → NOTE: No "Create Wholesaler" button (only one wholesaler exists)
  → Delivery Partners Sub-tab
      → "Create Delivery Partner" CTA → Form (details + exclusivity config:
          "Open Pool" or "Exclusive to THE Shop")
  → Any user row → Detail Panel → "Suspend Account" / "Reactivate" toggle
  → Inactivity Flags: auto-flagged accounts surfaced in a filtered view
```

**REMOVED:** 
- Wholesaler approval workflow
- Multiple wholesaler creation
- Shop picker (only one shop exists)

**CHANGED:** Wholesaler tab now read-only view of THE single wholesaler

### 4.3 Monitoring
```
Dashboard Home → Live Operations Tab
  → Real-time order funnel view (Pending Approval → Approved → Delivered counts, drop-off %)
  → Map overview of active deliveries in progress
  → Payments Tab
      → PhonePe settlement log
      → COD Ledger overview across all partners and THE wholesaler
          → Filter by status: Pending / Confirmed / Escalated
```

**CHANGED:** 
- PhonePe instead of Razorpay
- "THE wholesaler" (single wholesaler only)
- Added PENDING_APPROVAL to order funnel

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
  → Delivery Partner Management: view/edit which partners are exclusive to THE shop
  → Shop Configuration: edit THE shop's details (name, address, MOQ, operating hours)
  → Payment Gateway: PhonePe merchant configuration
```

**REMOVED:** Shop-Exclusivity Mapping (only one shop exists)  
**CHANGED:** Simplified to "THE shop" configuration

---

## 5. Cross-Role Flow — Full Order Lifecycle (Composite View)

```
RETAILER: Browse Products → Cart → Checkout (PhonePe/COD) → [PENDING_APPROVAL]
                                                                    │
WHOLESALER: Incoming Orders Queue → Approve/Reject                  │
   Approve → [APPROVED, stock decremented] → Pack → [PACKED]
   → Mark Ready → [READY_FOR_PICKUP] → Pickup OTP generated
                                                                    │
SYSTEM: Geo-assignment engine → notifies nearest eligible partner
                                                                    │
DELIVERY PARTNER: Accepts → [ASSIGNED] → Navigate to THE shop
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

**CHANGED:** 
- Initial state is PENDING_APPROVAL (awaiting wholesaler approval)
- PhonePe instead of Razorpay
- Simplified to "THE shop"

---

## 6. Notification-Triggered Flows (Summary Table)

| Trigger Event | Notified Role(s) | Deep Link Destination |
|---|---|---|
| Order placed (PENDING_APPROVAL) | Wholesaler | Incoming Orders Queue |
| Order approved/rejected | Retailer | Order Tracking Screen |
| Ready for pickup / assignment offer | Delivery Partner | Assignment Detail Screen |
| No partner accepted (SLA breach) | Wholesaler, Admin | Order Detail / Admin Live Ops |
| Order picked up | Retailer | Order Tracking Screen |
| Order delivered | Retailer, Wholesaler | Order Tracking / Payments Tab |
| COD debt SLA breach | Admin, Wholesaler | Admin Payments Tab / Wholesaler Payments Tab |
| Dispute raised | Wholesaler, Admin | Disputes Tab |
| Dispute resolved | Retailer, Wholesaler | Order Detail / My Disputes |
| Payment failed (PhonePe) | Retailer | Payment Retry Page |
| Payment successful (PhonePe) | Retailer, Wholesaler | Order Confirmation / Orders Queue |

**ADDED:** PhonePe payment notifications  
**CHANGED:** Initial order state is PENDING_APPROVAL

---

## 7. Edge Case & Error State Summary

| Scenario | Flow Handling |
|---|---|
| Retailer places order, wholesaler never responds | SLA timer triggers admin alert; admin can manually approve/reject or contact wholesaler |
| No delivery partner available nearby | Wholesaler sees "no partner assigned" banner + manual Admin escalation path |
| OTP expires before use | Regenerate option surfaced to the role that owns that OTP leg (wholesaler for pickup, retailer for drop) |
| Retailer attempts cancel after APPROVED | Blocked — cancellation only allowed in PENDING_APPROVAL state; must go through dispute/support flow after approval |
| Delivery partner goes offline mid-delivery | Active order remains assigned to them; Admin can manually reassign via override if needed |
| Wholesaler never confirms COD cash | Auto-escalates to Admin after configured SLA window |
| Multiple shop/wholesaler creation attempted | Backend validation blocks creation; Firestore rules enforce single shop/wholesaler constraint |

**ADDED:** Validation against multiple shop/wholesaler creation

---

## 8. Open Flow Questions & Architecture Notes

### Resolved Architecture Questions:
1. ✅ **Single vs Multiple Shops:** RESOLVED - System operates with exactly ONE shop
2. ✅ **Wholesaler Onboarding:** RESOLVED - Admin-provisioned only, no self-registration
3. ✅ **Shop Discovery:** RESOLVED - Removed (direct catalog access)
4. ✅ **Payment Gateway:** RESOLVED - PhonePe Business (not Razorpay)

### Implementation Questions:
1. Should there be an approval-stage SLA timer (auto-escalate to Admin if wholesaler doesn't respond to a PENDING_APPROVAL order within X minutes)?
2. For drop OTP — confirmed flow is "retailer shows OTP, partner enters it." Confirm this direction (vs. partner showing a confirmation code to retailer).
3. Retailers can cancel orders only in PENDING_APPROVAL state. Should there be a time limit (e.g., 5 minutes after placement)?

### Phase Dependencies:
- **Phase 3:** Order placement, PhonePe integration, PENDING_APPROVAL state
- **Phase 3.9:** UI/UX enhancement (no business logic changes)
- **Phase 4:** Wholesaler approval workflow, inventory locking, delivery assignment
