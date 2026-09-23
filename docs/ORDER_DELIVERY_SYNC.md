# Order-Delivery Status Synchronization

## Overview
This document describes how order status and delivery status are synchronized in the system to maintain data consistency and provide accurate tracking information to all users.

## Status Flow Diagram

```
Order Creation
     ↓
Order: confirmed
     ↓
Delivery: pending (auto-created by trigger)
     ↓
Admin assigns partner
     ↓
Delivery: assigned ←→ Order: assigned
     ↓
Partner accepts
     ↓
Delivery: accepted (no order sync)
     ↓
Partner starts delivery
     ↓
Delivery: in_transit (no order sync)
     ↓
Partner completes
     ↓
Delivery: delivered ←→ Order: delivered
     ↓
Admin marks complete
     ↓
Order: completed
```

## Synchronization Strategy

### Synchronized States
The system synchronizes at **two critical milestones**:

1. **Assignment** - When admin assigns delivery to partner
   - Delivery Status: `assigned`
   - Order Status: `assigned`
   - Rationale: Customer needs to know their order has been assigned

2. **Delivery Completion** - When partner completes delivery
   - Delivery Status: `delivered`
   - Order Status: `delivered`
   - Rationale: Customer needs to know their order has been delivered

### Non-Synchronized States
The following delivery states are **partner-specific** and do NOT trigger order status updates:

- **accepted** - Partner internal workflow state
- **in_transit** - Partner internal workflow state

**Rationale**: These are operational states for the delivery partner. From the customer's perspective, the order is still "assigned" to a partner until it's actually delivered.

## Implementation Details

### Database Transactions
All status synchronization operations are performed within database transactions to ensure consistency:

```javascript
// Example from assignDelivery()
await client.query('BEGIN');
try {
  // Update delivery status
  const updatedDelivery = await deliveryModel.assignDeliveryPartner(...);
  
  // Sync order status
  await client.query(
    `UPDATE orders SET order_status = 'assigned' WHERE id = $1`,
    [delivery.orderId]
  );
  
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
}
```

### Implementation Files
The synchronization logic is implemented in:
- `backend/src/services/deliveryService.js`
  - `assignDelivery()` - Syncs to 'assigned'
  - `completeDelivery()` - Syncs to 'delivered'
  - `updateDeliveryStatus()` - Generic sync handler

## Status Validation

### Allowed Delivery Status Transitions
```javascript
{
  'pending': ['assigned', 'failed'],
  'assigned': ['accepted', 'pending', 'failed'],
  'accepted': ['in_transit', 'failed'],
  'in_transit': ['delivered', 'failed'],
  'delivered': [], // Final state
  'failed': ['assigned'] // Can reassign
}
```

### Order Status Values
- `pending` - Order created, awaiting confirmation
- `confirmed` - Order confirmed, stock deducted
- `assigned` - Delivery partner assigned
- `delivered` - Delivery completed
- `completed` - Order finalized (admin action)
- `cancelled` - Order cancelled

## Error Handling

### Transaction Rollback
If any synchronization step fails, the entire transaction is rolled back:
- Delivery status is NOT updated
- Order status is NOT updated
- Status history is NOT created
- Error is thrown to caller

### Permission Validation
- Only admins can assign deliveries
- Only assigned partners can update their deliveries
- Status transitions are validated before sync

## Audit Trail

### Status History Tracking
Every status change is recorded in `delivery_status_history`:
```sql
INSERT INTO delivery_status_history (
  delivery_id,
  status,
  changed_by,
  notes,
  created_at
) VALUES (?, ?, ?, ?, NOW());
```

### Order Updates
Order `updated_at` timestamp is updated on every sync:
```sql
UPDATE orders 
SET order_status = ?, updated_at = CURRENT_TIMESTAMP 
WHERE id = ?;
```

## Testing Scenarios

### Scenario 1: Happy Path
1. Order created → `confirmed`
2. Delivery created → `pending`
3. Admin assigns → delivery: `assigned`, order: `assigned`
4. Partner accepts → delivery: `accepted`, order: `assigned` (no change)
5. Partner starts → delivery: `in_transit`, order: `assigned` (no change)
6. Partner completes → delivery: `delivered`, order: `delivered`
7. Admin finalizes → order: `completed`

### Scenario 2: Delivery Failure
1. Delivery in transit → `in_transit`
2. Admin marks failed → delivery: `failed`, order: `assigned` (stays assigned)
3. Admin reassigns → delivery: `assigned`, order: `assigned`

### Scenario 3: Transaction Failure
1. Admin assigns delivery
2. Database error during order update
3. Transaction rolls back
4. Delivery status remains `pending`
5. Order status remains `confirmed`

## Future Enhancements

### Potential Additions
1. **Partial Sync** - Add order substatus for in_transit visibility
2. **Event-Driven Sync** - Emit events for external systems
3. **Async Sync** - Queue-based sync for high-volume scenarios
4. **Sync Verification** - Periodic job to detect/fix sync drift

### Monitoring Recommendations
1. Track sync failures in logs
2. Alert on transaction rollbacks
3. Monitor order/delivery status mismatches
4. Create dashboard for sync health

## API References

### Delivery Status Update
```
POST /api/v1/deliveries/:id/assign
POST /api/v1/deliveries/:id/accept
POST /api/v1/deliveries/:id/start
POST /api/v1/deliveries/:id/complete
```

### Order Status Update
```
PATCH /api/v1/orders/:id/status
```

## Conclusion
The order-delivery synchronization strategy balances customer visibility needs with operational flexibility. By syncing only major milestones (assignment and delivery), we provide clear customer-facing status while allowing delivery partners to track internal workflow states independently.
