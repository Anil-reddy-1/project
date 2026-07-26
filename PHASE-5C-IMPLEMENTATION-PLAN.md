# Phase 5C Implementation Plan - Advanced Delivery Features

**Started:** 2026-07-26  
**Estimated Duration:** 2-3 days  
**Status:** In Progress  
**Dependencies:** Phase 5A & 5B Complete ✅

---

## Overview

Phase 5C adds advanced features to the delivery system:
1. **Route Optimization** - Optimize delivery routes for multiple orders
2. **Batch Assignments** - Assign multiple orders to one partner
3. **Real-time WebSocket Tracking** - Live location updates for all stakeholders
4. **Dynamic Earnings** - Demand-based pricing for delivery partners
5. **FCM Push Notifications** - Real device notifications

---

## Architecture Decisions

### 1. Route Optimization
**Technology:** Google Maps Directions API
**Alternative Considered:** OSRM (Open Source Routing Machine)
**Decision:** Google Maps for accuracy and integration with existing navigation

**Algorithm:**
- Nearest neighbor for 2-3 deliveries
- 2-opt optimization for 4+ deliveries
- Consider pickup location, delivery sequence, time windows

### 2. WebSocket Implementation
**Technology:** Socket.io
**Alternative Considered:** Native WebSocket, Pusher
**Decision:** Socket.io for reliability, auto-reconnection, room support

**Rooms:**
- `order:{orderId}` - Order-specific updates (retailer, wholesaler)
- `partner:{partnerId}` - Partner-specific events
- `wholesaler:{wholesalerId}` - All order updates
- `admin` - System-wide monitoring

### 3. Dynamic Pricing
**Model:** Surge pricing based on:
- Time of day (peak hours)
- Order volume (demand)
- Distance
- Weather conditions (optional)
- Partner availability

**Base Rate:** ₹15/km
**Surge Multiplier:** 1.0x - 2.5x

### 4. FCM Integration
**Firebase Cloud Messaging V1 API**
- Sender ID: 591266753222
- Web Push Certificates: To be generated
- Topics: `new_deliveries`, `order_updates`, `earnings`

---

## Implementation Tasks

### Task 1: Route Optimization Service ⏳
**Estimated Time:** 4 hours

**Backend:**
- [ ] Create `route-optimization.service.ts`
- [ ] Implement nearest neighbor algorithm
- [ ] Implement 2-opt optimization
- [ ] Add Google Maps Directions API integration
- [ ] Calculate optimal sequence and total distance
- [ ] Add route caching (5 min TTL)

**Frontend:**
- [ ] Display optimized route on map
- [ ] Show stop sequence with numbers
- [ ] Estimated time for each delivery
- [ ] Total route distance and time

**Files:**
```
backend/src/services/route-optimization.service.ts (NEW)
backend/src/config/google-maps.ts (NEW)
frontend/lib/services/route-service.ts (NEW)
frontend/app/(delivery)/delivery/route/page.tsx (NEW)
```

---

### Task 2: Batch Delivery Assignments ⏳
**Estimated Time:** 5 hours

**Backend:**
- [ ] Update assignment algorithm for batch mode
- [ ] Add `maxBatchSize` to partner profile (default: 3)
- [ ] Create batch assignment record
- [ ] Link multiple orders to single assignment
- [ ] Update capacity tracking (batch count vs individual)
- [ ] Add batch acceptance/decline logic

**Database Schema:**
```typescript
// delivery_assignments collection
{
  id: string;
  type: 'single' | 'batch';
  orderIds: string[]; // Multiple orders
  partnerId: string;
  batchNumber: string; // BATCH-YYYYMMDD-NNNN
  status: 'pending' | 'accepted' | 'declined' | 'timeout';
  totalDistance: number;
  optimizedRoute: {
    sequence: number[];
    waypoints: GeoPoint[];
    totalDuration: number;
  };
  createdAt: Timestamp;
}
```

**Frontend:**
- [ ] Batch assignment notification (show count)
- [ ] Multi-order list in assignment modal
- [ ] Accept/decline all at once
- [ ] Route visualization for batch

**Files:**
```
backend/src/services/batch-assignment.service.ts (NEW)
backend/src/routes/delivery-assignments.routes.ts (UPDATE)
frontend/app/(delivery)/delivery/assignments/page.tsx (UPDATE)
frontend/components/delivery/BatchAssignmentCard.tsx (NEW)
```

---

### Task 3: WebSocket Real-time Tracking ⏳
**Estimated Time:** 6 hours

**Backend:**
- [ ] Install socket.io dependencies
- [ ] Create WebSocket server in Express
- [ ] Implement room management
- [ ] Location broadcast on update
- [ ] Order status change events
- [ ] Partner status change events
- [ ] Authentication middleware for Socket.io
- [ ] Graceful connection handling

**Frontend:**
- [ ] Install socket.io-client
- [ ] Create WebSocket context provider
- [ ] Auto-connect/reconnect logic
- [ ] Subscribe to relevant rooms based on role
- [ ] Real-time location marker updates
- [ ] Real-time order status updates
- [ ] Connection status indicator

**Events:**
```typescript
// Server → Client
'location:update' - Partner location changed
'order:status' - Order status changed
'assignment:new' - New assignment available
'assignment:accepted' - Partner accepted
'assignment:declined' - Partner declined
'batch:created' - Batch assignment created

// Client → Server
'partner:connect' - Partner goes online
'partner:disconnect' - Partner goes offline
'location:track' - Start tracking order
'location:untrack' - Stop tracking order
```

**Files:**
```
backend/src/config/socket.ts (NEW)
backend/src/middleware/socket-auth.ts (NEW)
backend/src/index.ts (UPDATE - add Socket.io)
frontend/lib/contexts/websocket-context.tsx (NEW)
frontend/lib/hooks/useWebSocket.ts (NEW)
frontend/lib/hooks/useRealtimeLocation.ts (NEW)
```

---

### Task 4: Dynamic Earnings Calculator ⏳
**Estimated Time:** 3 hours

**Backend:**
- [ ] Create `dynamic-pricing.service.ts`
- [ ] Implement surge multiplier calculation
- [ ] Time-based pricing (peak hours: 8-10am, 6-8pm = 1.5x)
- [ ] Demand-based pricing (>10 pending orders = 1.8x)
- [ ] Distance tiers (0-5km: ₹15/km, 5-10km: ₹13/km, 10+km: ₹12/km)
- [ ] Weather API integration (optional - rain = 1.3x)
- [ ] Add pricing to assignment API responses
- [ ] Log pricing decisions for analytics

**Frontend:**
- [ ] Show surge badge on assignments
- [ ] Display earnings prominently
- [ ] Earnings breakdown (base + surge)
- [ ] Historical surge chart in profile

**Pricing Formula:**
```typescript
earnings = (baseRate × distance × surgeMultiplier) + bonuses
surgeMultiplier = max(timeSurge, demandSurge, weatherSurge)
```

**Files:**
```
backend/src/services/dynamic-pricing.service.ts (NEW)
backend/src/config/pricing.ts (NEW)
backend/src/routes/delivery-assignments.routes.ts (UPDATE)
frontend/components/delivery/EarningsBreakdown.tsx (NEW)
frontend/app/(delivery)/delivery/earnings/page.tsx (NEW)
```

---

### Task 5: FCM Push Notifications ⏳
**Estimated Time:** 5 hours

**Backend:**
- [ ] Install firebase-admin SDK (already present)
- [ ] Create `fcm.service.ts`
- [ ] Token registration endpoint
- [ ] Send to device by FCM token
- [ ] Send to topic subscribers
- [ ] Handle token refresh/expiry
- [ ] Notification priority (high for assignments)
- [ ] Data payload + notification payload
- [ ] Delivery report logging

**Frontend:**
- [ ] Register service worker for FCM
- [ ] Request notification permission
- [ ] Get FCM token from Firebase
- [ ] Save token to backend
- [ ] Handle foreground messages
- [ ] Handle background messages
- [ ] Show in-app notification banner
- [ ] Notification sound/vibration
- [ ] Handle notification clicks (deep links)

**Web Push Setup:**
1. Generate VAPID key pair in Firebase Console
2. Add to frontend config
3. Configure service worker

**Notification Types:**
```typescript
{
  type: 'assignment_new',
  title: '🚚 New Delivery Request',
  body: 'Pickup from Shop Name - ₹45 (1.5x surge)',
  data: { assignmentId, orderId, earnings }
}

{
  type: 'assignment_timeout',
  title: '⏰ Assignment Expired',
  body: 'You missed a delivery opportunity'
}

{
  type: 'order_ready',
  title: '📦 Order Ready for Pickup',
  body: 'Order #ORD-20260726-0012 is packed'
}
```

**Files:**
```
backend/src/services/fcm.service.ts (NEW)
backend/src/routes/fcm.routes.ts (NEW)
frontend/public/firebase-messaging-sw.js (NEW)
frontend/lib/services/fcm-service.ts (NEW)
frontend/app/(delivery)/delivery/settings/page.tsx (NEW)
```

---

### Task 6: Live Tracking Dashboard (Wholesaler/Admin) ⏳
**Estimated Time:** 4 hours

**Frontend:**
- [ ] Live map with all active deliveries
- [ ] Partner markers (color-coded by status)
- [ ] Order destination markers
- [ ] Route polylines
- [ ] Partner info cards
- [ ] Order info cards
- [ ] Real-time ETA updates
- [ ] Filters (status, partner, time range)
- [ ] Auto-refresh every 30 seconds

**Files:**
```
frontend/app/(wholesaler)/wholesaler/live-tracking/page.tsx (NEW)
frontend/app/(admin)/admin/live-tracking/page.tsx (NEW)
frontend/components/tracking/LiveMap.tsx (NEW)
frontend/components/tracking/PartnerMarker.tsx (NEW)
frontend/components/tracking/RoutePolyline.tsx (NEW)
```

---

## Database Schema Updates

### delivery_partners Collection - Add Fields
```typescript
{
  maxBatchSize: number; // Default: 3
  batchDeliveryCount: number; // Total batch deliveries
  averageBatchSize: number; // Calculated
  preferredAreas: GeoPoint[]; // Preferred delivery zones
  surgeEligible: boolean; // Can receive surge orders
  performanceScore: number; // 0-100 based on metrics
}
```

### delivery_assignments Collection - Update
```typescript
{
  type: 'single' | 'batch';
  orderIds: string[]; // Array for batch support
  batchNumber?: string;
  optimizedRoute?: {
    sequence: number[];
    waypoints: GeoPoint[];
    totalDistance: number;
    estimatedDuration: number;
  };
  pricing: {
    baseRate: number; // ₹15/km
    surgeMultiplier: number; // 1.0-2.5
    distanceTier: string; // '0-5km', '5-10km', '10+km'
    totalEarnings: number;
    breakdown: {
      base: number;
      surge: number;
      bonus: number;
    };
  };
}
```

### orders Collection - Add Fields
```typescript
{
  batchId?: string; // Link to batch assignment
  routeSequence?: number; // Position in batch route
  estimatedDeliveryTime?: Timestamp; // Based on route optimization
  actualDeliveryTime?: Timestamp; // When delivered
  surgeApplied: boolean;
  surgeMultiplier?: number;
}
```

### fcm_tokens Collection (NEW)
```typescript
{
  id: string; // Auto-generated
  userId: string; // Partner/retailer/wholesaler
  token: string; // FCM device token
  platform: 'web' | 'android' | 'ios';
  deviceInfo: {
    userAgent: string;
    browser: string;
    os: string;
  };
  topics: string[]; // Subscribed topics
  createdAt: Timestamp;
  lastUsed: Timestamp;
  isActive: boolean;
}
```

### pricing_logs Collection (NEW)
```typescript
{
  id: string;
  assignmentId: string;
  orderId: string;
  timestamp: Timestamp;
  baseRate: number;
  surgeMultiplier: number;
  factors: {
    timeSurge: number;
    demandSurge: number;
    weatherSurge: number;
    distanceTier: string;
  };
  totalEarnings: number;
}
```

---

## Environment Variables

### Backend (.env)
```bash
# Google Maps API
GOOGLE_MAPS_API_KEY=your_api_key_here

# FCM (Firebase Admin SDK already configured)
# No additional keys needed - uses service account

# Socket.io
SOCKET_IO_CORS_ORIGIN=http://localhost:3000,https://yourdomain.com

# Pricing
SURGE_PRICING_ENABLED=true
BASE_DELIVERY_RATE=15
MAX_SURGE_MULTIPLIER=2.5

# Route Optimization
ROUTE_CACHE_TTL_SECONDS=300
MAX_BATCH_SIZE=5
```

### Frontend (.env.local)
```bash
# FCM Web Push
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key_here

# WebSocket
NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:3001
```

---

## Dependencies to Install

### Backend
```bash
cd backend
npm install socket.io @googlemaps/google-maps-services-js
```

### Frontend
```bash
cd frontend
npm install socket.io-client
```

---

## Testing Strategy

### Unit Tests
- [ ] Route optimization algorithm accuracy
- [ ] Dynamic pricing calculations
- [ ] Batch assignment logic
- [ ] FCM token management

### Integration Tests
- [ ] WebSocket connection/reconnection
- [ ] Real-time location updates
- [ ] FCM notification delivery
- [ ] Batch assignment end-to-end

### Manual Tests
- [ ] Test batch assignments with 2-5 orders
- [ ] Verify route optimization on map
- [ ] Confirm surge pricing during peak hours
- [ ] Test notifications on real device
- [ ] Test WebSocket with multiple clients
- [ ] Verify live tracking dashboard

---

## Implementation Order

**Day 1:**
1. ✅ Setup Socket.io infrastructure
2. ✅ Implement real-time location tracking
3. ✅ Create WebSocket context & hooks

**Day 2:**
4. ✅ Implement route optimization service
5. ✅ Create batch assignment logic
6. ✅ Build live tracking dashboard

**Day 3:**
7. ✅ Implement dynamic pricing
8. ✅ Setup FCM push notifications
9. ✅ Test all features end-to-end

---

## Success Criteria

- ✅ Partners can receive batch assignments (2-5 orders)
- ✅ Routes are optimized for minimal distance/time
- ✅ Real-time location updates visible to all stakeholders
- ✅ Surge pricing applied during peak hours
- ✅ Push notifications delivered to devices
- ✅ Live tracking dashboard shows all active deliveries
- ✅ Battery-efficient (WebSocket < 1% battery drain)
- ✅ 99.9% WebSocket uptime
- ✅ <500ms notification latency

---

## Known Limitations

1. **Google Maps API Costs:** ~$5-10 per 1000 route optimizations
2. **WebSocket Scaling:** Single server supports ~10k connections (use Redis adapter for >10k)
3. **FCM Daily Limits:** 1M messages/day (free tier)
4. **Route Optimization:** Limited to 5 stops (Google API limit: 25)
5. **Weather API:** Optional feature, requires paid API

---

## Next Steps After Phase 5C

**Phase 6: COD Cash Collection**
- Cash on delivery ledger
- Cash reconciliation
- Settlement tracking

**Phase 7: Advanced Analytics**
- Partner performance dashboards
- Delivery heatmaps
- Predictive delivery times

**Phase 8: Production Hardening**
- Load testing (10k concurrent users)
- Redis for WebSocket scaling
- CDN for static assets
- Database indexing optimization

---

**Ready to Start Implementation!** 🚀
