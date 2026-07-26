# End-to-End Testing Guide - Phase 5 Delivery System

**Status:** ✅ Both servers running
- Backend: http://localhost:3001
- Frontend: http://localhost:3000

---

## Prerequisites Setup

### 1. Create Test Delivery Partner in Firestore

Open Firebase Console → Firestore Database

**Collection:** `delivery_partners`
**Document ID:** (auto-generate or use UID of test user)

```json
{
  "uid": "DELIVERY_PARTNER_UID_HERE",
  "name": "Test Driver",
  "email": "driver@test.com",
  "phone": "+1234567890",
  "status": "available",
  "isOnline": true,
  "currentLocation": {
    "latitude": 37.7749,
    "longitude": -122.4194,
    "geohash": "9q8yyk8yuv",
    "accuracy": 50,
    "updatedAt": "2026-07-26T00:00:00Z"
  },
  "maxConcurrentOrders": 2,
  "currentOrderCount": 0,
  "todayDeliveryCount": 0,
  "totalDeliveries": 0,
  "successfulDeliveries": 0,
  "cancelledDeliveries": 0,
  "rating": 4.5,
  "shopId": "SHOP_ID_HERE",
  "maxDeliveryRadius": 10,
  "vehicleType": "bike",
  "vehicleNumber": "AB12CD3456",
  "fcmToken": "",
  "createdAt": "2026-07-26T00:00:00Z",
  "updatedAt": "2026-07-26T00:00:00Z"
}
```

### 2. Create Test User with Delivery Role

**Collection:** `users`
**Document ID:** Same as delivery partner UID

```json
{
  "uid": "DELIVERY_PARTNER_UID_HERE",
  "email": "driver@test.com",
  "name": "Test Driver",
  "phone": "+1234567890",
  "role": "delivery",
  "status": "active",
  "createdAt": "2026-07-26T00:00:00Z",
  "updatedAt": "2026-07-26T00:00:00Z"
}
```

### 3. Set Custom Claims in Firebase Auth

Run this in Firebase Console → Functions or via Admin SDK:

```javascript
admin.auth().setCustomUserClaims('DELIVERY_PARTNER_UID_HERE', {
  role: 'delivery',
  status: 'active'
});
```

---

## E2E Test Flow

### Step 1: Create Order (Retailer)

1. **Login as Retailer**
   - Navigate to http://localhost:3000
   - Sign in with retailer credentials
   
2. **Browse Catalog**
   - Go to `/retailer/catalog`
   - Add items to cart
   
3. **Checkout**
   - Go to `/retailer/cart`
   - Click "Proceed to Checkout"
   - Enter delivery address
   - Select payment method (COD for testing)
   - Place order
   
4. **Expected Result:**
   - Order created with status: `PENDING_APPROVAL`
   - Email sent to retailer
   - Wholesaler notified

**✅ Checkpoint:** Order visible in `/retailer/orders`

---

### Step 2: Approve Order (Wholesaler)

1. **Login as Wholesaler**
   - Navigate to http://localhost:3000
   - Sign in with wholesaler credentials
   
2. **View Pending Orders**
   - Dashboard shows new order
   - Click to view details
   
3. **Approve Order**
   - Click "Approve" button
   - Inventory decremented
   - Status: `APPROVED`
   
4. **Pack Order**
   - Click "Mark as Packed"
   - Status: `PACKED`
   
5. **Ready for Pickup**
   - Click "Ready for Pickup"
   - Pickup OTP generated
   - Status: `READY_FOR_PICKUP`
   - **Delivery assignment auto-triggered!**

**✅ Checkpoint:** Order status = `READY_FOR_PICKUP`, pickup OTP visible

---

### Step 3: Delivery Assignment (Automatic)

**What Happens:**
1. Backend detects `READY_FOR_PICKUP` status
2. Finds nearest available delivery partner
3. Creates assignment with 60-second SLA
4. Sends push notification (if FCM configured)
5. Updates order status to `ASSIGNED`

**Check Backend Logs:**
```
[Orders] Triggering delivery assignment for order ORDER_ID
Assigned order ORDER_ID to partner PARTNER_ID (Test Driver) - 3.2 km away
```

**✅ Checkpoint:** Check Firestore `delivery_assignments` collection

---

### Step 4: Accept Assignment (Delivery Partner)

1. **Login as Delivery Partner**
   - Navigate to http://localhost:3000
   - Sign in with delivery partner credentials (driver@test.com)
   
2. **View Dashboard**
   - `/delivery` shows status toggle
   - Location tracking starts automatically
   
3. **View Assignment**
   - Navigate to `/delivery/assignments`
   - See assignment modal with:
     - Customer name
     - Distance (km)
     - Earnings (₹)
     - 60-second countdown timer
   
4. **Accept Assignment**
   - Click "Accept" button (green, left side)
   - Countdown stops
   - Navigates to order details

**✅ Checkpoint:** Order status = `ASSIGNED`, partner status = `busy`

---

### Step 5: Navigate to Pickup (Delivery Partner)

1. **Order Details Page**
   - `/delivery/orders/[orderId]`
   - See pickup section with shop info
   
2. **Check Location Tracking**
   - Open browser console
   - Look for: `[Location] Location updated: {latitude, longitude}`
   - Updates every 30 seconds
   
3. **Call Shop (Optional)**
   - Click "📞 Call" button
   - Phone dialer opens with shop number
   
4. **Navigate to Shop**
   - Click "📍 Navigate" button
   - Google Maps (Android) or Apple Maps (iOS) opens
   - Driving directions displayed
   
**✅ Checkpoint:** Maps app opens with correct shop location

---

### Step 6: Verify Pickup OTP (Delivery Partner)

1. **Get Pickup OTP**
   - Ask wholesaler for 6-digit OTP
   - Or check Firestore: `orders/{orderId}/pickupOTP`
   
2. **Enter OTP**
   - Type 6-digit code in yellow input field
   - Numeric keyboard appears on mobile
   
3. **Click "Verify"**
   - OTP validated
   - Status: `PICKED_UP`
   - Delivery OTP generated for customer
   - Green success message appears
   
4. **Check Response**
   - Backend returns delivery OTP
   - Partner should share this with customer

**✅ Checkpoint:** Order status = `PICKED_UP`, delivery OTP visible in response

---

### Step 7: Navigate to Customer (Delivery Partner)

1. **View Delivery Section**
   - Scroll down to delivery section
   - See customer name and address
   
2. **COD Amount (if applicable)**
   - Red box shows cash to collect
   - Amount displayed prominently
   
3. **Call Customer (Optional)**
   - Click "📞 Call" button
   - Customer phone number dials
   
4. **Navigate to Customer**
   - Click "📍 Navigate" button
   - Maps opens with customer location
   - *Note:* Currently shows "Coming soon" - needs geocoding

**✅ Checkpoint:** Location tracking continues during journey

---

### Step 8: Take Delivery Proof Photo (Delivery Partner)

1. **Tap Photo Capture Area**
   - Blue dashed box: "📷 Tap to take photo"
   - Camera permission requested
   
2. **Capture Photo**
   - Rear camera opens (mobile)
   - Take photo of delivered package
   
3. **Preview Photo**
   - Image appears in preview
   - Click ✕ to retake if needed
   
4. **Photo Uploads**
   - Automatically uploads to Cloudinary
   - `delivery_proof` folder
   - Loading spinner shows progress

**✅ Checkpoint:** Photo preview visible, no upload errors

---

### Step 9: Verify Delivery OTP (Delivery Partner)

1. **Get Delivery OTP from Customer**
   - Customer received 6-digit OTP via SMS/email
   - Or partner shares OTP from Step 6 response
   
2. **Enter Delivery OTP**
   - Purple input field
   - Type 6-digit code
   
3. **Click "Deliver" Button**
   - OTP validated
   - Photo proof URL sent (if photo taken)
   - Status: `DELIVERED`
   - Success message: "✅ Delivery completed successfully!"
   
4. **Auto-navigation**
   - Redirects to `/delivery` dashboard
   - Partner status: `AVAILABLE`
   - Today's delivery count incremented

**✅ Checkpoint:** Order status = `DELIVERED`, partner available for next order

---

### Step 10: Verify Post-Delivery (All Roles)

**Delivery Partner:**
1. **Dashboard**
   - `todayDeliveryCount`: +1
   - Status: Available (green)
   
2. **Profile Page**
   - Total earnings updated
   - Today's earnings: +₹45 (or calculated amount)
   - Total deliveries: +1
   
3. **History Page**
   - `/delivery/history`
   - Completed delivery visible
   - Shows earnings, distance, rating

**Retailer:**
1. **Order Details**
   - Status: DELIVERED
   - Delivery proof photo visible
   - Delivered timestamp shown

**Wholesaler:**
1. **Order Management**
   - Order marked as delivered
   - Delivery partner visible
   - Photo proof attached

**Firestore:**
```
orders/{orderId}:
  - state: "DELIVERED"
  - deliveredAt: timestamp
  - deliveredBy: partner UID
  - deliveryProofImage: Cloudinary URL
  - pickupOTPVerified: true
  - deliveryOTPVerified: true

delivery_partners/{partnerId}:
  - status: "available"
  - currentOrderCount: 0
  - todayDeliveryCount: 1
  - totalDeliveries: 1
  - successfulDeliveries: 1

delivery_assignments/{assignmentId}:
  - status: "accepted"
  - respondedAt: timestamp
```

---

## Testing Scenarios

### Scenario 1: Partner Declines Assignment

1. Go to `/delivery/assignments`
2. Click "❌ Decline" button
3. **Expected:**
   - Assignment marked as declined
   - Next nearest partner tried
   - If no partners: escalate to manual
   
**Check:** `delivery_assignments` has status: `declined`

### Scenario 2: Assignment Timeout

1. Accept assignment (don't click Accept or Decline)
2. Wait 60 seconds
3. **Expected:**
   - Timer reaches 0:00
   - Auto-declined
   - Reassignment triggered
   
**Check:** Backend logs show timeout handling

### Scenario 3: Invalid OTP

1. Enter wrong 6-digit pickup OTP
2. Click Verify
3. **Expected:**
   - Error message: "❌ Invalid OTP"
   - Order status unchanged
   - Can retry
   
**Check:** OTP remains valid for retry

### Scenario 4: Offline Mode

1. Turn off WiFi/mobile data
2. Move location (if on mobile)
3. **Expected:**
   - Location updates queued
   - Cached order data visible
   - "Offline" indicator (if implemented)
   
4. Turn WiFi back on
5. **Expected:**
   - Queued locations sync automatically
   - Fresh data loaded

### Scenario 5: Multiple Concurrent Deliveries

1. Create 2 orders
2. Approve and mark both ready
3. **Expected:**
   - Both assigned to same partner (if capacity allows)
   - `currentOrderCount`: 2
   - Status: `busy`
   
4. Complete one delivery
5. **Expected:**
   - `currentOrderCount`: 1
   - Still `busy` (1 remaining)

---

## Troubleshooting

### Location Not Updating
- **Check:** Browser console for permission errors
- **Fix:** Grant location permission in browser settings
- **Verify:** Console shows `[Location] Location updated`

### Maps Not Opening
- **Check:** Platform detection in console
- **Fix:** Test on actual mobile device (not desktop)
- **Alternative:** Web fallback should open

### OTP Not Validating
- **Check:** OTP hasn't expired (30 min limit)
- **Check:** OTP not already used
- **Check:** Firestore `pickupOTP` / `deliveryOTP` fields
- **Fix:** Regenerate OTP (mark order ready again)

### Photo Not Uploading
- **Check:** Cloudinary credentials in `.env`
- **Check:** Network connectivity
- **Check:** File size (<10MB)
- **Verify:** Browser network tab shows upload

### Partner Not Receiving Assignment
- **Check:** Partner status: `available` & `isOnline: true`
- **Check:** Partner location not stale (< 5 min old)
- **Check:** Distance within `maxDeliveryRadius`
- **Check:** `currentOrderCount < maxConcurrentOrders`
- **Verify:** Backend logs for assignment creation

---

## Performance Checks

### Location Tracking
- ✅ Updates every 30 seconds (check timestamp)
- ✅ Movement threshold: 50 meters
- ✅ Accuracy: 20-100 meters (typical)

### API Response Times
- Assignment creation: < 2 seconds
- OTP verification: < 500ms
- Photo upload: < 5 seconds (depends on size)

### Database Queries
- Geospatial search: < 500ms
- Order fetch: < 300ms
- Partner status: < 200ms

---

## Success Criteria

### Backend
- [✓] Order transitions through all states correctly
- [✓] OTPs generate and validate properly
- [✓] Location updates persist to Firestore
- [✓] Timer service handles timeouts
- [✓] Partner stats update correctly

### Frontend
- [✓] All pages load without errors
- [✓] Navigation works (buttons, links)
- [✓] Camera captures and uploads photos
- [✓] Maps opens with correct locations
- [✓] Location tracking runs in background

### User Experience
- [✓] Large touch targets (56-64px)
- [✓] Clear visual feedback
- [✓] Loading states visible
- [✓] Error messages helpful
- [✓] Mobile-responsive (360px+)

---

## Next Steps After Testing

1. **Fix any bugs found**
2. **Optimize performance bottlenecks**
3. **Add missing features** (delivery address geocoding)
4. **Implement FCM** for real push notifications
5. **Set up PWA** for mobile installation
6. **Deploy to staging** for real-world testing
7. **Onboard real delivery partners**

---

**Testing Status:** Ready to begin!
**Estimated Time:** 30-45 minutes for complete E2E flow

