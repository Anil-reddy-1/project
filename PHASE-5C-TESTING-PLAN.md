# Phase 5C E2E Testing Plan

**Tester Role:** Experienced QA Engineer  
**Test Date:** 2026-07-26  
**Test Environment:** Development (localhost)  
**Status:** 🟡 IN PROGRESS

---

## Pre-Test Setup Checklist

### Required Configuration

#### 1. Firebase Indexes Deployment
```bash
# Deploy all 26 Firestore indexes (13 existing + 13 new)
firebase deploy --only firestore:indexes
```
**Status:** ⏳ PENDING  
**Expected Time:** 5-15 minutes  
**Verification:** Check Firebase Console → Firestore → Indexes

#### 2. FCM VAPID Key Configuration
**Steps:**
1. Open Firebase Console → Project Settings
2. Navigate to Cloud Messaging tab
3. Scroll to Web Push certificates
4. Click "Generate key pair"
5. Copy the key pair value
6. Add to `frontend/.env.local`:
   ```bash
   NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key_here
   ```

**Status:** ⏳ PENDING  
**Required For:** FCM push notifications testing

#### 3. Google Maps API Key (Optional)
**Steps:**
1. Go to Google Cloud Console
2. Enable Maps JavaScript API and Directions API
3. Create API key with restrictions
4. Add to `backend/.env`:
   ```bash
   GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

**Status:** ⏳ OPTIONAL  
**Impact:** Without this, route optimization uses fallback algorithms (still functional)


#### 4. Server Startup
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

**Backend URL:** http://localhost:3001  
**Frontend URL:** http://localhost:3000  
**WebSocket URL:** http://localhost:3001 (Socket.io)

**Status:** ⏳ PENDING

---

## Test Suite Overview

| Feature | Test Cases | Priority | Status |
|---------|-----------|----------|--------|
| WebSocket Connection | 5 | HIGH | ⏳ |
| Real-time Location | 4 | HIGH | ⏳ |
| Route Optimization | 6 | HIGH | ⏳ |
| Batch Assignments | 8 | HIGH | ⏳ |
| Dynamic Pricing | 7 | HIGH | ⏳ |
| FCM Notifications | 6 | MEDIUM | ⏳ |
| Live Tracking Dashboard | 5 | MEDIUM | ⏳ |
| **TOTAL** | **41** | - | **0/41** |

---

## Test Suite 1: WebSocket Connection & Infrastructure

### TC-WS-01: Initial Connection
**Priority:** HIGH  
**Steps:**
1. Start backend and frontend servers
2. Login as delivery partner at `/delivery`
3. Open browser DevTools → Console
4. Look for WebSocket connection logs

**Expected:**
- `[WebSocket] Connecting to http://localhost:3001`
- `[WebSocket] Connected`
- ConnectionStatus component shows green "Connected"

**Actual:**  
**Status:** ⏳ NOT TESTED

---

### TC-WS-02: Authentication
**Priority:** HIGH  
**Steps:**
1. Login as delivery partner
2. Check WebSocket handshake in Network tab
3. Verify auth query parameter contains Firebase token

**Expected:**
- WebSocket upgrade request includes `?token=...`
- Server accepts connection (status 101)
- No authentication errors in backend logs

**Actual:**  
**Status:** ⏳ NOT TESTED

---

### TC-WS-03: Auto-Reconnection
**Priority:** HIGH  
**Steps:**
1. Establish WebSocket connection
2. Restart backend server (simulate disconnect)
3. Observe reconnection behavior

**Expected:**
- ConnectionStatus shows "Reconnecting..." with yellow indicator
- Automatic reconnection within 2 seconds
- ConnectionStatus returns to green "Connected"

**Actual:**  
**Status:** ⏳ NOT TESTED

---

### TC-WS-04: Room Subscription
**Priority:** MEDIUM  
**Steps:**
1. Login as delivery partner (User ID: `partner123`)
2. Check backend logs for room joins
3. Verify joined rooms: `user:partner123`, `role:delivery_partner`

**Expected:**
- Backend logs show: "Partner partner123 joined rooms: user:partner123, role:delivery_partner"
- No duplicate room subscriptions

**Actual:**  
**Status:** ⏳ NOT TESTED

---

### TC-WS-05: Disconnection Handling
**Priority:** MEDIUM  
**Steps:**
1. Establish connection
2. Close browser tab
3. Check backend logs

**Expected:**
- Backend logs: "Partner disconnected: partner123"
- Partner status updated to `offline` in Firestore
- Clean disconnection with no errors

**Actual:**  
**Status:** ⏳ NOT TESTED

---

## Test Suite 2: Real-time Location Tracking

### TC-LOC-01: Location Update (Client → Server)
**Priority:** HIGH  
**Steps:**
1. Login as delivery partner
2. Allow location permissions in browser
3. Use browser DevTools or REST client:
   ```bash
   POST http://localhost:3001/api/delivery-assignments/partner/location
   Authorization: Bearer <token>
   Content-Type: application/json
   
   {
     "latitude": 12.9716,
     "longitude": 77.5946,
     "accuracy": 10
   }
   ```

**Expected:**
- API returns 200 with updated partner data
- `lastSeen` timestamp updated in Firestore
- Location coordinates saved to `delivery_partners` collection

**Actual:**  
**Status:** ⏳ NOT TESTED

---

### TC-LOC-02: Location Broadcast (Server → Clients)
**Priority:** HIGH  
**Steps:**
1. Open two browser windows:
   - Window A: Login as delivery partner
   - Window B: Login as wholesaler, navigate to `/wholesaler/live-tracking`
2. In Window A, send location update (use TC-LOC-01 steps)
3. Observe Window B

**Expected:**
- Window B receives `location:partner_update` event
- Live tracking dashboard updates partner location
- No delay > 1 second

**Actual:**  
**Status:** ⏳ NOT TESTED

---

### TC-LOC-03: useRealtimeLocation Hook
**Priority:** HIGH  
**Steps:**
1. Login as wholesaler
2. Navigate to `/wholesaler/live-tracking`
3. Open DevTools Console
4. Check for real-time location subscriptions

**Expected:**
- Hook subscribes to `location:partner_update` event
- Partner locations update in real-time
- No memory leaks (unsubscribe on unmount)

**Actual:**  
**Status:** ⏳ NOT TESTED

---

### TC-LOC-04: Location Accuracy Display
**Priority:** MEDIUM  
**Steps:**
1. Send location with different accuracy values (10m, 50m, 100m)
2. Check live tracking dashboard

**Expected:**
- Accuracy displayed in meters
- Color coding: green (<30m), yellow (30-100m), red (>100m)

**Actual:**  
**Status:** ⏳ NOT TESTED

---

## Test Suite 3: Route Optimization

### TC-ROUTE-01: Nearest Neighbor (2-3 stops)
**Priority:** HIGH  
**Steps:**
1. Create test data with 3 delivery addresses
2. Call route optimization service:
   ```typescript
   const result = await RouteOptimizationService.optimizeRoute([
     { lat: 12.9716, lng: 77.5946 }, // Shop
     { lat: 12.9800, lng: 77.6000 }, // Stop 1
     { lat: 12.9850, lng: 77.5900 }, // Stop 2
     { lat: 12.9900, lng: 77.6100 }  // Stop 3
   ]);
   ```

**Expected:**
- Algorithm: `nearest_neighbor`
- Optimized sequence returned
- Total distance < unoptimized distance
- Duration estimated

**Actual:**  
**Status:** ⏳ NOT TESTED

---

### TC-ROUTE-02: 2-opt Algorithm (4-10 stops)
**Priority:** HIGH  
**Steps:**
1. Create test data with 5 delivery addresses
2. Call route optimization with 5 stops
3. Compare with nearest neighbor result

**Expected:**
- Algorithm: `2-opt`
- Better optimization than nearest neighbor
- Distance reduction: 15-30%
- Execution time < 500ms

**Actual:**  
**Status:** ⏳ NOT TESTED

---

### TC-ROUTE-03: Google Maps Integration (Optional)
**Priority:** MEDIUM  
**Steps:**
1. Configure `GOOGLE_MAPS_API_KEY` in backend/.env
2. Create route with 5 stops
3. Verify Google Maps API is called

**Expected:**
- Algorithm: `google_maps`
- More accurate than 2-opt
- Real road network distances
- API call logged

**Actual:**  
**Status:** ⏳ NOT TESTED (requires API key)

---

### TC-ROUTE-04: Route Caching
**Priority:** MEDIUM  
**Steps:**
1. Optimize route with 5 stops
2. Immediately optimize same route again
3. Check cache hit

**Expected:**
- First call: Cache miss, calculates route
- Second call: Cache hit, returns instantly
- Cache TTL: 5 minutes

**Actual:**  
**Status:** ⏳ NOT TESTED

---

### TC-ROUTE-05: Distance Calculation
**Priority:** HIGH  
**Steps:**
1. Test Haversine distance formula with known coordinates:
   - Bangalore (12.9716, 77.5946) to Mumbai (19.0760, 72.8777)
   - Expected: ~842 km

**Expected:**
- Distance calculation accurate within 1%
- Handles longitude wraparound correctly

**Actual:**  
**Status:** ⏳ NOT TESTED

---

### TC-ROUTE-06: Edge Cases
**Priority:** MEDIUM  
**Steps:**
1. Test with 1 stop (should return as-is)
2. Test with 11+ stops (should reject or truncate)
3. Test with invalid coordinates

**Expected:**
- 1 stop: No optimization, returns input
- 11+ stops: Error or truncated to 10
- Invalid coords: Validation error

**Actual:**  
**Status:** ⏳ NOT TESTED

---

## Test Suite 4: Batch Delivery Assignments

### TC-BATCH-01: Create Batch Assignment
**Priority:** HIGH  
**Prerequisites:** Create 3 orders with `READY_FOR_PICKUP` status  
**Steps:**
1. Login as admin/wholesaler
2. Call batch assignment API:
   ```bash
   POST http://localhost:3001/api/delivery-assignments/batch/assign
   Authorization: Bearer <token>
   Content-Type: application/json
   
   {
     "orderIds": ["order1", "order2", "order3"],
     "method": "auto"
   }
   ```

**Expected:**
- HTTP 201 Created
- Batch ID format: `BATCH-20260726-0001`
- Assignment status: `pending`
- Route optimized automatically
- Pricing calculated with batch discount
- SLA timer started (60s)

**Actual:**  
**Status:** ⏳ NOT TESTED

---

### TC-BATCH-02: Partner Selection Logic
**Priority:** HIGH  
**Steps:**
1. Create 2 delivery partners:
   - Partner A: `currentOrderCount=2`, `maxConcurrentOrders=5`, `maxBatchSize=3`
   - Partner B: `currentOrderCount=4`, `maxConcurrentOrders=5`, `maxBatchSize=3`
2. Create batch of 3 orders
3. Verify Partner A is selected (more capacity)

**Expected:**
- Partner A selected (has more available capacity)
- Partner B not considered (would exceed max)
- Selection logic: `currentOrderCount + batchSize <= maxConcurrentOrders`

**Actual:**  
**Status:** ⏳ NOT TESTED

---

### TC-BATCH-03: Accept Batch Assignment
**Priority:** HIGH  
**Steps:**
1. Create batch assignment (from TC-BATCH-01)
2. Delivery partner receives notification
3. Partner accepts:
   ```bash
   POST http://localhost:3001/api/delivery-assignments/batch/{batchId}/respond
   Authorization: Bearer <partner_token>
   Content-Type: application/json
   
   {
     "response": "accept"
   }
   ```

**Expected:**
- HTTP 200 OK
- Assignment status → `accepted`
- All orders in batch assigned to partner
- Partner's `currentOrderCount` incremented by 3
- SLA timer cancelled
- WebSocket event sent to order room
- FCM notification sent to partner

**Actual:**  
**Status:** ⏳ NOT TESTED

---

### TC-BATCH-04: Decline Batch Assignment
**Priority:** HIGH  
**Steps:**
1. Create batch assignment
2. Partner declines with reason:
   ```json
   {
     "response": "decline",
     "reason": "Too far from current location"
   }
   ```

**Expected:**
- HTTP 200 OK
- Assignment status → `declined`
- Orders remain `READY_FOR_PICKUP`
- Automatic reassignment triggered
- Decline reason saved
- WebSocket event sent

**Actual:**  
**Status:** ⏳ NOT TESTED

---

### TC-BATCH-05: Assignment Timeout
**Priority:** HIGH  
**Steps:**
1. Create batch assignment
2. Wait 60+ seconds without response
3. Check SLA timer service

**Expected:**
- After 60s, status → `timeout`
- Orders remain unassigned
- Automatic reassignment triggered
- WebSocket event: `assignment:timeout`
- FCM notification: "Assignment Expired"

**Actual:**  
**Status:** ⏳ NOT TESTED

---

### TC-BATCH-06: Batch Discount Calculation
**Priority:** HIGH  
**Steps:**
1. Create batch with 3 orders, each 5km distance
2. Check pricing breakdown

**Expected:**
```
Base rate: ₹15/km × 15km = ₹225
Batch discount: 10% = ₹22.50
Subtotal: ₹202.50
Extra delivery bonus: 2 × ₹10 = ₹20
Total earnings: ₹222.50
```

**Actual:**  
**Status:** ⏳ NOT TESTED

---

### TC-BATCH-07: Max Batch Size Enforcement
**Priority:** MEDIUM  
**Steps:**
1. Attempt to create batch with 6 orders (exceeds MAX_BATCH_SIZE=5)

**Expected:**
- HTTP 400 Bad Request
- Error: "Batch size exceeds maximum of 5"

**Actual:**  
**Status:** ⏳ NOT TESTED

---

### TC-BATCH-08: Get Batch Details
**Priority:** MEDIUM  
**Steps:**
1. Create batch assignment
2. Query batch details:
   ```bash
   GET http://localhost:3001/api/delivery-assignments/batch/{batchId}
   Authorization: Bearer <token>
   ```

**Expected:**
- HTTP 200 OK
- Full batch details including:
  - All order IDs
  - Optimized route
  - Pricing breakdown
  - Partner info
  - Status

**Actual:**  
**Status:** ⏳ NOT TESTED

---

## Test Suite 5: Dynamic Pricing

### TC-PRICE-01: Base Rate Calculation
**Priority:** HIGH  
**Steps:**
Test different distance tiers:
1. 3km delivery → ₹15/km tier
2. 7km delivery → ₹13/km tier
3. 12km delivery → ₹12/km tier

**Expected:**
- 3km: ₹45 (15 × 3)
- 7km: ₹91 (15 × 5 + 13 × 2)
- 12km: ₹155 (15 × 5 + 13 × 5 + 12 × 2)

**Actual:**  
**Status:** ⏳ NOT TESTED

---

### TC-PRICE-02: Time-based Surge
**Priority:** HIGH  
**Steps:**
Test at different times (simulate by changing system time or test with fixed time):
1. 9:00 AM (morning rush)
2. 1:00 PM (lunch hour)
3. 7:00 PM (evening rush)
4. 3:00 PM (off-peak)

**Expected:**
- 9:00 AM: 1.5x multiplier
- 1:00 PM: 1.3x multiplier
- 7:00 PM: 1.5x multiplier
- 3:00 PM: 1.0x (no surge)

**Actual:**  
**Status:** ⏳ NOT TESTED

---

### TC-PRICE-03: Demand-based Surge
**Priority:** HIGH  
**Steps:**
Create varying numbers of pending orders:
1. 3 pending orders
2. 8 pending orders
3. 15 pending orders
4. 25 pending orders

**Expected:**
- 3 orders: 1.0x (no surge)
- 8 orders: 1.3x
- 15 orders: 1.8x
- 25 orders: 2.0x

**Actual:**  
**Status:** ⏳ NOT TESTED

---

### TC-PRICE-04: Weather Surge (Placeholder)
**Priority:** LOW  
**Steps:**
1. Test with weather="rain"
2. Test with weather="storm"

**Expected:**
- Rain: 1.3x multiplier
- Storm: 1.8x multiplier
- (Note: Weather detection not yet integrated)

**Actual:**  
**Status:** ⏳ NOT TESTED

---

### TC-PRICE-05: Max Surge Cap
**Priority:** HIGH  
**Steps:**
1. Create scenario with multiple surge factors:
   - Time surge: 1.5x
   - Demand surge: 2.0x
   - Weather surge: 1.8x

**Expected:**
- Max surge applied: 2.5x (configured in env)
- Not 1.5 × 2.0 × 1.8 = 5.4x
- Only highest factor considered

**Actual:**  
**Status:** ⏳ NOT TESTED

---

### TC-PRICE-06: Pricing Log Storage
**Priority:** MEDIUM  
**Steps:**
1. Create delivery assignment with surge active
2. Query `pricing_logs` collection in Firestore
3. Verify pricing breakdown saved

**Expected:**
- Document created in `pricing_logs`
- Contains: baseRate, surgeMultiplier, factors breakdown
- Queryable by assignmentId

**Actual:**  
**Status:** ⏳ NOT TESTED

---

### TC-PRICE-07: Surge Toggle
**Priority:** MEDIUM  
**Steps:**
1. Set `SURGE_PRICING_ENABLED=false` in .env
2. Create assignment during peak hour
3. Check pricing

**Expected:**
- No surge multiplier applied
- Base rate only
- Surge factors still logged for analytics

**Actual:**  
**Status:** ⏳ NOT TESTED

---

## Test Suite 6: FCM Push Notifications

### TC-FCM-01: VAPID Key Configuration
**Priority:** HIGH  
**Prerequisites:** VAPID key generated and added to .env.local  
**Steps:**
1. Check `frontend/.env.local` has `NEXT_PUBLIC_FIREBASE_VAPID_KEY`
2. Verify service worker loads the key
3. Check browser console for errors

**Expected:**
- No VAPID key errors in console
- Service worker registered successfully
- `/firebase-messaging-sw.js` accessible

**Actual:**  
**Status:** ⏳ NOT TESTED

---

### TC-FCM-02: Token Registration
**Priority:** HIGH  
**Steps:**
1. Login as delivery partner
2. Click "Enable Notifications" when prompted
3. Grant notification permission
4. Check console for token logs

**Expected:**
- Browser permission prompt appears
- Console log: `[FCM] Token obtained: <token>`
- Token saved to `fcm_tokens` collection in Firestore
- Token includes platform="web", deviceInfo

**Actual:**  
**Status:** ⏳ NOT TESTED

---

### TC-FCM-03: Send Test Notification
**Priority:** HIGH  
**Steps:**
1. Get FCM token from TC-FCM-02
2. Call test endpoint:
   ```bash
   POST http://localhost:3001/api/fcm/test
   Authorization: Bearer <admin_token>
   Content-Type: application/json
   
   {
     "token": "<fcm_token>",
     "title": "Test Notification",
     "body": "This is a test"
   }
   ```

**Expected:**
- HTTP 200 OK
- Notification appears on screen (if tab active)
- Or notification in system tray (if tab backgrounded)
- Click notification opens app

**Actual:**  
**Status:** ⏳ NOT TESTED

---

### TC-FCM-04: Batch Assignment Notification
**Priority:** HIGH  
**Steps:**
1. Delivery partner has notifications enabled
2. Create batch assignment for this partner
3. Observe notification

**Expected:**
- Notification appears: "📦 New Batch Delivery"
- Body: "You have 3 deliveries ready"
- Click notification navigates to `/delivery`
- Action buttons: "Accept" and "Decline"

**Actual:**  
**Status:** ⏳ NOT TESTED

---

### TC-FCM-05: Topic Subscription
**Priority:** MEDIUM  
**Steps:**
1. Subscribe partner to topic:
   ```bash
   POST http://localhost:3001/api/fcm/subscribe
   Authorization: Bearer <partner_token>
   Content-Type: application/json
   
   {
     "topic": "new_deliveries"
   }
   ```
2. Send message to topic
3. Verify partner receives it

**Expected:**
- HTTP 200 OK
- Topic added to `fcm_tokens.topics` array
- Partner receives topic broadcasts

**Actual:**  
**Status:** ⏳ NOT TESTED

---

### TC-FCM-06: Token Cleanup
**Priority:** MEDIUM  
**Steps:**
1. Unregister token from browser
2. Attempt to send notification to invalid token
3. Check token status in Firestore

**Expected:**
- FCM service detects invalid token
- Token marked as `isActive=false`
- No repeated attempts to invalid token

**Actual:**  
**Status:** ⏳ NOT TESTED

---

## Test Suite 7: Live Tracking Dashboard

### TC-TRACK-01: Dashboard Access
**Priority:** HIGH  
**Steps:**
1. Login as wholesaler
2. Navigate to `/wholesaler/live-tracking`
3. Verify page loads

**Expected:**
- Page renders without errors
- Shows list of delivery partners
- Map placeholder or "No active partners" message
- Refresh button visible

**Actual:**  
**Status:** ⏳ NOT TESTED

---

### TC-TRACK-02: Partner Status Display
**Priority:** HIGH  
**Prerequisites:** Have 3 delivery partners with different statuses  
**Steps:**
1. Create partners:
   - Partner A: status="available", lastSeen=now
   - Partner B: status="busy", lastSeen=now
   - Partner C: status="offline", lastSeen=5 minutes ago
2. Open live tracking dashboard

**Expected:**
- Partner A: Green indicator, "Available"
- Partner B: Blue indicator, "Busy"
- Partner C: Gray indicator, "Offline"
- Last seen timestamps accurate

**Actual:**  
**Status:** ⏳ NOT TESTED

---

### TC-TRACK-03: Real-time Location Updates
**Priority:** HIGH  
**Steps:**
1. Open live tracking dashboard
2. Partner A updates location via API
3. Observe dashboard updates

**Expected:**
- Location updates without page refresh
- Partner marker moves on map (if map integrated)
- Last seen timestamp updates
- Update latency < 2 seconds

**Actual:**  
**Status:** ⏳ NOT TESTED

---

### TC-TRACK-04: Auto-refresh Mechanism
**Priority:** MEDIUM  
**Steps:**
1. Open live tracking dashboard
2. Wait 30 seconds
3. Observe auto-refresh

**Expected:**
- Dashboard refreshes automatically after 30s
- "Refreshing..." indicator appears briefly
- No page flicker or state loss

**Actual:**  
**Status:** ⏳ NOT TESTED

---

### TC-TRACK-05: Partner Details Panel
**Priority:** MEDIUM  
**Steps:**
1. Open live tracking dashboard
2. Click on a partner in the list
3. View details panel

**Expected:**
- Panel opens with partner info:
  - Name, phone, email
  - Current status
  - Active order count
  - List of assigned orders
  - Location accuracy
- Click outside closes panel

**Actual:**  
**Status:** ⏳ NOT TESTED

---

## Test Execution Summary

### Test Results by Priority

| Priority | Total | Passed | Failed | Skipped | Not Tested |
|----------|-------|--------|--------|---------|------------|
| HIGH | 28 | 0 | 0 | 0 | 28 |
| MEDIUM | 12 | 0 | 0 | 0 | 12 |
| LOW | 1 | 0 | 0 | 0 | 1 |
| **TOTAL** | **41** | **0** | **0** | **0** | **41** |


### Critical Blockers

1. **Firebase Indexes Not Deployed**
   - Impact: Firestore queries will fail or be slow
   - Action: Run `firebase deploy --only firestore:indexes`
   - ETA: 5-15 minutes

2. **FCM VAPID Key Missing**
   - Impact: Push notifications won't work
   - Action: Generate in Firebase Console, add to .env.local
   - ETA: 2 minutes

3. **Servers Not Running**
   - Impact: Cannot test any feature
   - Action: Start backend and frontend servers
   - ETA: 1 minute

### Optional Improvements

1. **Google Maps API Key**
   - Impact: Route optimization uses fallback algorithms only
   - Benefit: 20-30% better route optimization
   - Action: Configure in backend/.env

---

## Quick Start Testing

### Recommended Test Order (for time-constrained testing):

1. **Critical Path** (30 mins):
   - TC-WS-01: WebSocket connection
   - TC-BATCH-01: Create batch assignment
   - TC-BATCH-03: Accept batch
   - TC-PRICE-01: Base pricing
   - TC-TRACK-01: Dashboard access

2. **Core Features** (60 mins):
   - All HIGH priority tests

3. **Full Suite** (3-4 hours):
   - All tests including MEDIUM and LOW priority

---

## Automated Testing Scripts

### Script 1: WebSocket Connection Test
```bash
# Save as: test-websocket.js
# Run: node test-websocket.js

const io = require('socket.io-client');

const socket = io('http://localhost:3001', {
  auth: { token: 'YOUR_FIREBASE_TOKEN_HERE' }
});

socket.on('connect', () => {
  console.log('✅ Connected to WebSocket');
  console.log('Socket ID:', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection failed:', error.message);
});

socket.on('disconnect', () => {
  console.log('⚠️  Disconnected');
});

setTimeout(() => {
  socket.disconnect();
  process.exit(0);
}, 5000);
```

### Script 2: Route Optimization Test
```bash
# Save as: test-route.sh
# Run: bash test-route.sh

curl -X POST http://localhost:3001/api/delivery-assignments/batch/assign \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderIds": ["order1", "order2", "order3"],
    "method": "auto"
  }' | jq '.'
```

### Script 3: Dynamic Pricing Test
```bash
# Save as: test-pricing.sh

# Test 1: 3km delivery (tier 1)
echo "Test 1: 3km delivery"
# Add API call here

# Test 2: 7km delivery (tier 2)
echo "Test 2: 7km delivery"
# Add API call here

# Test 3: 12km delivery (tier 3)
echo "Test 3: 12km delivery"
# Add API call here
```

---

## Known Issues & Workarounds

### Issue 1: CORS Errors
**Symptom:** WebSocket connection fails with CORS error  
**Cause:** Missing CORS configuration  
**Fix:** Verify backend has `cors` enabled and frontend URL whitelisted

### Issue 2: Firebase Auth Token Expired
**Symptom:** 401 Unauthorized on API calls  
**Cause:** Token expired (1 hour default)  
**Fix:** Re-login to get fresh token

### Issue 3: Service Worker Not Updating
**Symptom:** Old service worker code runs  
**Cause:** Browser caching  
**Fix:** 
- Chrome DevTools → Application → Service Workers
- Check "Update on reload"
- Or unregister and re-register

---

## Test Environment Details

**Browser Requirements:**
- Chrome 90+ or Firefox 88+ (for service workers)
- Notification permission granted
- Location permission granted (for location tests)

**Network Requirements:**
- localhost:3000 and :3001 accessible
- No proxy blocking WebSocket connections
- Firebase services accessible

**Data Requirements:**
- At least 2 delivery partners in database
- At least 3 test orders
- Test user accounts for each role

---

## Next Steps After Testing

1. **Document all failures** in GitHub Issues
2. **Update PHASE-5C-COMPLETE.md** with test results
3. **Create bug-fix tasks** for critical issues
4. **Update progress.md** with Phase 5C completion
5. **Plan Phase 6** (COD Cash Collection)

---

**Test Plan Version:** 1.0  
**Last Updated:** 2026-07-26  
**Test Coverage:** 41 test cases across 7 feature areas
