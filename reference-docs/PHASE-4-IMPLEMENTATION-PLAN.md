# Phase 4: Wholesaler Approval & Inventory Lock

## Implementation Plan

**Version:** 1.0  
**Architecture:** Single Wholesaler, Single Shop  
**Date:** 2026-07-14  
**Status:** 🚧 READY TO START

---

## Executive Summary

Phase 4 implements the critical approval gate that the entire trust model depends on. The wholesaler reviews pending orders and either approves them (locking inventory) or rejects them (with reason). This phase transforms orders from `PENDING_APPROVAL` (created in Phase 3) through to `READY_FOR_PICKUP`.

**Key Constraint:** Inventory is ONLY reduced upon approval - this is the atomic transaction that locks stock.

---

## Phase Objective

Enable wholesalers to:
1. View queue of pending orders (`PENDING_APPROVAL`)
2. Review order details
3. Approve orders (reducing inventory atomically)
4. Reject orders (with reason selection)
5. Mark orders as Packed
6. Mark orders Ready for Pickup (generates pickup OTP)

Enable retailers to:
1. Cancel orders (only while `PENDING_APPROVAL`)
2. Receive approval/rejection notifications
3. View order status updates

---

## Business Flow

```
Order Created (Phase 3)
Status: PENDING_APPROVAL
         ↓
Wholesaler Reviews Order
         ↓
    ┌────────┴────────┐
    │                 │
 APPROVE           REJECT
    │                 │
    ↓                 ↓
Inventory        Reason Selection
Reduced          (stock unavailable,
Atomically        MOQ unmet, etc.)
    │                 │
    ↓                 ↓
Status:          Status: REJECTED
APPROVED              ↓
    ↓            Notify Retailer
Notify Retailer       ↓
    ↓            End of Flow
Mark PACKED
    ↓
Mark READY_FOR_PICKUP
    ↓
Generate Pickup OTP
    ↓
(Phase 5: Delivery Assignment)
```

---

## Scope

### In Scope

**Wholesaler Features:**
- Pending orders queue view
- Order detail view with full information
- Approve order action
- Reject order with reason
- Mark Packed action
- Mark Ready for Pickup action
- Pickup OTP generation
- New order notifications
- Order status badges

**Retailer Features:**
- Cancel order (PENDING_APPROVAL only)
- Receive approval/rejection notifications
- View updated order status
- Rejection reason display

**Backend Services:**
- Order approval service (with atomic inventory lock)
- Order rejection service
- Order packing service
- Ready for pickup service
- OTP generation service
- Inventory update service
- Cancel order service
- Notification service enhancements

**Database:**
- Inventory transaction handling
- State history logging
- OTP storage

### Out of Scope

- Delivery partner assignment (Phase 5)
- Delivery execution (Phase 6)
- COD reconciliation (Phase 7)
- Multi-shop logic (single shop only)

---

## State Transitions

### Order States (Phase 4)

```
PENDING_APPROVAL → APPROVED      (wholesaler action)
PENDING_APPROVAL → REJECTED      (wholesaler action)
PENDING_APPROVAL → CANCELLED     (retailer action)
APPROVED         → PACKED        (wholesaler action)
PACKED           → READY_FOR_PICKUP (wholesaler action)
```

### Inventory Impact

- **PENDING_APPROVAL → APPROVED**: Inventory REDUCED (atomic transaction)
- **PENDING_APPROVAL → REJECTED**: Inventory UNCHANGED
- **PENDING_APPROVAL → CANCELLED**: Inventory UNCHANGED
- **All other transitions**: Inventory already locked

---

## Technical Implementation

### Backend Tasks

#### Task 1: Rejection Reason Enum
**File:** `backend/src/types/index.ts`

```typescript
export type OrderRejectionReason =
  | 'out_of_stock'
  | 'moq_not_met'
  | 'pricing_error'
  | 'suspicious_order'
  | 'wholesaler_unavailable'
  | 'other';
```

#### Task 2: Order Approval Service
**File:** `backend/src/services/order-approval.service.ts`

**Functions:**
- `approveOrder(orderId, wholesalerUid)` - Atomic approval + inventory lock
- `rejectOrder(orderId, wholesalerUid, reason, notes?)` - Rejection with reason
- `markPacked(orderId, wholesalerUid)` - Mark as packed
- `markReadyForPickup(orderId, wholesalerUid)` - Generate OTP and mark ready

**Key Logic:**
- Firestore transaction for inventory decrement
- Validate current state before transition
- Update state history
- Send notifications

#### Task 3: Inventory Service
**File:** `backend/src/services/inventory.service.ts`

**Functions:**
- `lockInventory(shopId, items)` - Reduce stock quantities (transactional)
- `releaseInventory(shopId, items)` - Restore stock (if order cancelled after approval)
- `validateInventory(shopId, items)` - Check if sufficient stock exists

#### Task 4: OTP Generation Service
**File:** `backend/src/services/otp.service.ts`

**Functions:**
- `generatePickupOTP(orderId)` - Generate 6-digit OTP
- `validatePickupOTP(orderId, otp)` - Verify OTP
- `getPickupOTP(orderId)` - Retrieve stored OTP

#### Task 5: Order State Routes
**File:** `backend/src/routes/orders.routes.ts`

**New Endpoints:**
```
POST /orders/:orderId/approve        (wholesaler only)
POST /orders/:orderId/reject         (wholesaler only)
POST /orders/:orderId/pack           (wholesaler only)
POST /orders/:orderId/ready-pickup   (wholesaler only)
POST /orders/:orderId/cancel         (retailer only, PENDING_APPROVAL)
```

#### Task 6: Notification Enhancements
**File:** `backend/src/services/notification.service.ts`

**New Functions:**
- `sendOrderApprovedNotification(order, retailer)`
- `sendOrderRejectedNotification(order, retailer, reason)`
- `sendOrderPackedNotification(order, retailer)`
- `sendReadyForPickupNotification(order, retailer, otp)`

### Frontend Tasks

#### Task 7: Wholesaler Orders Queue
**File:** `frontend/app/(wholesaler)/wholesaler/orders/page.tsx`

**Updates:**
- Enable approve/reject actions (currently disabled)
- Add filters: All | Pending | Approved | Packed | Ready
- Show order count badges
- Add action buttons per order
- Real-time order updates

#### Task 8: Order Detail View
**File:** `frontend/app/(wholesaler)/wholesaler/orders/[orderId]/page.tsx`

**Features:**
- Full order information display
- Product list with quantities
- Customer details
- Payment status
- Current state with timeline
- Action buttons based on current state:
  - PENDING_APPROVAL: Approve / Reject
  - APPROVED: Mark Packed
  - PACKED: Mark Ready for Pickup
- State history timeline

#### Task 9: Approve/Reject Modal
**File:** `frontend/components/wholesaler/orders/ApproveRejectModal.tsx`

**Features:**
- Approve confirmation
- Reject reason dropdown
- Optional notes field
- Inventory warning (if low stock)
- Confirm/Cancel buttons

#### Task 10: Order Status Components
**File:** `frontend/components/wholesaler/orders/OrderStatusBadge.tsx`

**Status Colors:**
- PENDING_APPROVAL: Yellow/Amber
- APPROVED: Green
- REJECTED: Red
- PACKED: Blue
- READY_FOR_PICKUP: Purple

#### Task 11: Retailer Cancel Order
**File:** `frontend/app/(retailer)/retailer/orders/[orderId]/page.tsx`

**Features:**
- Cancel button (only if PENDING_APPROVAL)
- Cancel confirmation modal
- Success message

#### Task 12: Notification Components
**Files:**
- `frontend/components/ui/Toast.tsx` - Toast notifications
- `frontend/components/ui/NotificationBell.tsx` - Notification indicator

### State Management

#### Task 13: Order Actions Hook
**File:** `frontend/hooks/useOrderActions.ts`

**Functions:**
- `approveOrder(orderId)` - Call approve endpoint
- `rejectOrder(orderId, reason, notes)` - Call reject endpoint
- `markPacked(orderId)` - Call pack endpoint
- `markReadyForPickup(orderId)` - Call ready endpoint
- `cancelOrder(orderId)` - Call cancel endpoint

---

## Database Changes

### Schema Updates

#### Orders Collection
**New Fields:**
```typescript
{
  rejectionReason?: OrderRejectionReason;
  rejectionNotes?: string;
  pickupOTP?: string;
  pickupOTPGeneratedAt?: Timestamp;
  packedAt?: Timestamp;
  readyForPickupAt?: Timestamp;
}
```

#### Items/Products Collection
**Fields to Update:**
```typescript
{
  stockQty: number;  // Decremented on approval
  reservedQty: number;  // Optional: track reserved stock
}
```

### Firestore Transactions

**Approval Transaction:**
```typescript
await db.runTransaction(async (transaction) => {
  // 1. Read order
  // 2. Validate state = PENDING_APPROVAL
  // 3. Read product stock
  // 4. Validate sufficient stock
  // 5. Update order state → APPROVED
  // 6. Decrement product stock
  // 7. Add state history entry
  // All or nothing
});
```

---

## Validation Rules

### Approve Order
- ✅ Order exists
- ✅ Current state is `PENDING_APPROVAL`
- ✅ Wholesaler is owner of THE shop
- ✅ Sufficient inventory exists
- ✅ Payment is valid (not failed)

### Reject Order
- ✅ Order exists
- ✅ Current state is `PENDING_APPROVAL`
- ✅ Wholesaler is owner of THE shop
- ✅ Rejection reason is valid enum value

### Mark Packed
- ✅ Order exists
- ✅ Current state is `APPROVED`
- ✅ Wholesaler is owner of THE shop

### Mark Ready for Pickup
- ✅ Order exists
- ✅ Current state is `PACKED`
- ✅ Wholesaler is owner of THE shop
- ✅ OTP generated successfully

### Cancel Order (Retailer)
- ✅ Order exists
- ✅ Current state is `PENDING_APPROVAL`
- ✅ Retailer is order owner

---

## Notifications

### Order Approved
**To:** Retailer  
**Channel:** Email + In-app  
**Content:**
- Order approved
- Expected packing time
- Next steps

### Order Rejected
**To:** Retailer  
**Channel:** Email + In-app  
**Content:**
- Order rejected
- Rejection reason
- Suggested actions

### Order Packed
**To:** Retailer  
**Channel:** In-app  
**Content:**
- Order packed
- Ready for pickup soon

### Ready for Pickup
**To:** Retailer  
**Channel:** SMS + In-app  
**Content:**
- Order ready
- Pickup OTP
- Pickup instructions

### Order Cancelled
**To:** Wholesaler  
**Channel:** In-app  
**Content:**
- Order cancelled by retailer
- Order details

---

## Error Handling

### Insufficient Inventory
**Action:** Show error to wholesaler  
**Message:** "Insufficient stock for [product name]. Current: X, Required: Y"  
**Recovery:** Reject order or adjust inventory

### Transaction Failure
**Action:** Retry transaction  
**Max Retries:** 3  
**Fallback:** Show error, log for manual review

### State Mismatch
**Action:** Reload order details  
**Message:** "Order state has changed. Please refresh."

---

## Security

### Authorization
- All actions require authentication
- Wholesaler actions: verify `role === 'wholesaler'`
- Retailer cancel: verify `uid === order.retailerUid`
- Admin can override any action

### Inventory Protection
- Use Firestore transactions
- Validate stock before commit
- Log all inventory changes
- Prevent negative stock

---

## Testing Checklist

### Backend Tests
- [ ] Approve order with sufficient inventory
- [ ] Approve order with insufficient inventory (should fail)
- [ ] Approve already approved order (should fail)
- [ ] Reject order with valid reason
- [ ] Reject already rejected order (should fail)
- [ ] Mark packed from APPROVED state
- [ ] Mark packed from PENDING_APPROVAL state (should fail)
- [ ] Generate pickup OTP
- [ ] Cancel order while PENDING_APPROVAL
- [ ] Cancel order after APPROVED (should fail per current rules)
- [ ] Concurrent approval attempts (transaction safety)
- [ ] Inventory decrement correctness
- [ ] State history logging

### Frontend Tests
- [ ] Wholesaler can view pending orders
- [ ] Approve button appears only for PENDING_APPROVAL
- [ ] Reject modal shows reason dropdown
- [ ] Rejection notes are optional
- [ ] Pack button appears only for APPROVED
- [ ] Ready button appears only for PACKED
- [ ] Retailer can cancel PENDING_APPROVAL orders
- [ ] Cancel button hidden for APPROVED orders
- [ ] Notifications display correctly
- [ ] Order status updates in real-time
- [ ] OTP displays on ready for pickup

### Integration Tests
- [ ] End-to-end: Order → Approve → Pack → Ready
- [ ] End-to-end: Order → Reject
- [ ] End-to-end: Order → Cancel (retailer)
- [ ] Inventory correctly decremented after approval
- [ ] Notifications sent to correct recipients
- [ ] State history accurate

---

## Decisions Required

### 1. Rejection Reasons (MUST DECIDE)
**Options:**
- Out of Stock
- MOQ Not Met
- Pricing Error
- Suspicious Order
- Wholesaler Unavailable
- Other

**Decision:** ✅ Use above list (can extend later)

### 2. Retailer Cancel After Approval
**Question:** Allow retailer to cancel after APPROVED state?

**Current Rules (rules.md):** Allowed but flagged for confirmation

**Options:**
A. Allow cancel through APPROVED (with inventory release)
B. Block cancel after APPROVED (final sale)

**Recommendation:** Start with Option B (simpler, less inventory complexity)

**Decision:** ⏳ REQUIRED BEFORE IMPLEMENTATION

### 3. OTP Format
**Options:**
A. 6-digit numeric (123456)
B. 4-digit numeric (1234)
C. Alphanumeric (AB12CD)

**Recommendation:** 6-digit numeric (balance security/usability)

**Decision:** ✅ Use 6-digit numeric

### 4. OTP Expiry
**Question:** How long is OTP valid?

**Options:**
A. No expiry (valid until order picked up)
B. 24 hours
C. 48 hours

**Recommendation:** No expiry (OTP only used once, order state protects)

**Decision:** ✅ No expiry, single-use

---

## Exit Criteria

Phase 4 is complete when:

1. ✅ Wholesaler can approve pending orders
2. ✅ Inventory is atomically decremented on approval
3. ✅ Wholesaler can reject orders with reason
4. ✅ Retailer can cancel PENDING_APPROVAL orders
5. ✅ Order can progress: APPROVED → PACKED → READY_FOR_PICKUP
6. ✅ Pickup OTP is generated correctly
7. ✅ All state transitions logged in state history
8. ✅ Notifications sent for all actions
9. ✅ Frontend displays correct action buttons per state
10. ✅ All validation rules enforced
11. ✅ Firestore transactions protect inventory
12. ✅ Tests pass

**Test Order:** An order exists in `READY_FOR_PICKUP` state with:
- Valid pickup OTP
- Inventory decremented in products collection
- Complete state history from PENDING_APPROVAL → READY_FOR_PICKUP
- All actors recorded correctly

---

## Dependencies

**Requires Complete:**
- Phase 3 (Order creation and PENDING_APPROVAL state)

**Enables:**
- Phase 5 (Delivery Assignment)
- Phase 6 (OTP Handoffs & Delivery Execution)

---

## Timeline Estimate

**Duration:** 2-3 weeks

**Breakdown:**
- Backend services: 4-5 days
- Frontend components: 5-6 days
- Integration & testing: 3-4 days

---

## Next Phase

After Phase 4 completion:
**Phase 5:** Delivery Assignment Engine
- Assign orders to delivery partners
- Geohash-based partner selection
- SLA countdown timers
- Assignment accept/decline flow

---

**Document Version:** 1.0  
**Created:** 2026-07-14  
**Status:** Ready for Implementation
