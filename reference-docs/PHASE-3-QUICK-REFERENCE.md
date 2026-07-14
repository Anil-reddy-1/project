# Phase 3: Quick Reference Guide

## Overview

**Phase:** Order Placement, PhonePe Payments & Checkout  
**Duration:** ~4 weeks  
**Status:** Ready for Implementation  

---

## Key Deliverables

1. ✅ Complete checkout flow
2. ✅ PhonePe payment integration
3. ✅ Cash on Delivery option
4. ✅ Order management (list/details)
5. ✅ Delivery address management
6. ✅ Payment retry mechanism
7. ✅ Email notifications
8. ✅ Wholesaler order view

---

## Architecture Highlights

- **Single Shop:** All orders go to one shop
- **Single Wholesaler:** All orders processed by one business owner
- **Order State:** Always created as `PENDING_APPROVAL`
- **Inventory:** NOT reduced in this phase (Phase 4)
- **Payment Gateway:** PhonePe Business (NOT Razorpay)

---

## API Endpoints Summary

### Orders
```
POST   /api/orders/validate-cart
POST   /api/orders/create
GET    /api/orders
GET    /api/orders/:orderId
```

### Payments
```
POST   /api/payments/initiate
POST   /api/payments/verify
POST   /api/payments/webhook
POST   /api/payments/retry
```

### Addresses
```
GET    /api/addresses
POST   /api/addresses
PUT    /api/addresses/:addressId
DELETE /api/addresses/:addressId
```

---

## Task Groups (24 Total)

1. ✅ Data Models & Types
2. ✅ PhonePe Service
3. ✅ Cart Validation Service
4. ✅ Order Service
5. ✅ Payment Service
6. ✅ API Routes
7. ✅ Controllers
8. ✅ Validation Schemas
9. ✅ Notification Service
10. ✅ Middleware
11. ✅ Error Handling
12. ✅ Audit Logging
13. ✅ Frontend Types
14. ✅ API Clients
15. ✅ Checkout Page
16. ✅ Payment Flow
17. ✅ Order Management
18. ✅ Loading & Error States
19. ✅ State Management
20. ✅ Wholesaler Features
21. ✅ Testing
22. ✅ Security Implementation
23. ✅ Documentation
24. ✅ Configuration & Deployment

---

## Critical Files to Create

### Backend
```
src/services/phonepe.service.ts
src/services/cart-validation.service.ts
src/services/order.service.ts
src/services/payment.service.ts
src/routes/orders.routes.ts
src/routes/payments.routes.ts
src/routes/addresses.routes.ts
src/controllers/order.controller.ts
src/controllers/payment.controller.ts
src/config/phonepe.ts
```

### Frontend
```
app/(retailer)/retailer/checkout/page.tsx
app/(retailer)/retailer/payment/callback/page.tsx
app/(retailer)/retailer/payment/success/page.tsx
app/(retailer)/retailer/payment/failure/page.tsx
app/(retailer)/retailer/orders/page.tsx
app/(retailer)/retailer/orders/[orderId]/page.tsx
components/checkout/AddressSelection.tsx
components/checkout/PaymentMethodSelection.tsx
lib/api/orders.ts
lib/api/payments.ts
```

---

## Environment Variables Needed

### Backend `.env`
```env
PHONEPE_MERCHANT_ID=your_merchant_id
PHONEPE_SALT_KEY=your_salt_key
PHONEPE_SALT_INDEX=1
PHONEPE_BASE_URL=https://api-preprod.phonepe.com/apis/pg-sandbox
PHONEPE_REDIRECT_URL=https://yourdomain.com/payment/callback
PHONEPE_WEBHOOK_URL=https://your-backend.com/api/payments/webhook
SHOP_ID=your-single-shop-id
DEFAULT_DELIVERY_CHARGES=50
```

---

## Firestore Collections

### New Collections
- `orders` - Order documents
- `payments` - Payment tracking
- `orderAuditLogs` - Audit trail
- `users/{userId}/addresses` - Delivery addresses

### Indexes Required
```javascript
// orders collection
{ retailerId: 'asc', createdAt: 'desc' }
{ shopId: 'asc', orderState: 'asc', createdAt: 'desc' }

// payments collection
{ merchantTransactionId: 'asc' }

// orderAuditLogs collection
{ orderId: 'asc', timestamp: 'desc' }
```

---

## Payment Flow Quick Guide

### PhonePe Payment
1. Retailer clicks "Pay Now"
2. Backend creates payment record
3. Backend calls PhonePe API
4. Frontend redirects to PhonePe
5. Customer completes payment
6. PhonePe redirects back
7. Frontend calls verify API
8. Backend verifies with PhonePe
9. Order created if successful

### COD Payment
1. Retailer selects COD
2. Backend validates cart
3. Order created immediately
4. Payment status: `PENDING_COD`
5. Email sent to retailer

---

## Testing Checklist

### Must Test
- [ ] COD order placement
- [ ] PhonePe payment success
- [ ] PhonePe payment failure
- [ ] Payment retry
- [ ] Cart validation (stock, MOQ, price)
- [ ] Address CRUD operations
- [ ] Order list pagination
- [ ] Webhook handling
- [ ] Duplicate payment prevention
- [ ] Authorization (user can only see own orders)

---

## Exit Criteria

Phase 3 is DONE when:

✅ Retailer can complete checkout and place order  
✅ PhonePe sandbox payments working  
✅ COD orders working  
✅ Orders created with `PENDING_APPROVAL` status  
✅ Email notifications sent  
✅ Wholesaler can view pending orders  
✅ All tests passing  
✅ Security measures in place  
✅ Documentation complete  

---

## Next Phase

**Phase 3.9 (Optional):** Premium Retail UI Enhancement  
- Pure UI/UX improvements
- No business logic changes
- Elevate to Flipkart/Amazon quality

**Phase 4 (Required):** Order Approval & Inventory Locking  
- Wholesaler approves/rejects orders
- Inventory reduced on approval
- Order state transitions

---

## Support Resources

- Full Plan: `PHASE-3-IMPLEMENTATION-PLAN.md`
- Architecture: `ARCHITECTURE-SUMMARY-V2.md`
- PhonePe Docs: https://developer.phonepe.com/
- Progress: `progress.md`

