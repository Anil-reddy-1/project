# Phase 3: Order Placement, PhonePe Payments & Checkout

## Implementation Plan

**Version:** 2.0  
**Architecture:** Single Wholesaler, Single Shop  
**Payment Gateway:** PhonePe Business  
**Date:** 2026-07-13

---

## Executive Summary

Phase 3 converts the existing shopping cart into a fully functional order placement and payment system. This phase ends when a retailer successfully places an order and the system creates a **PENDING_APPROVAL** order awaiting wholesaler action.

**Key Constraints:**
- Inventory is **NOT** reduced in this phase
- Orders created with status: `PENDING_APPROVAL`
- Inventory locking happens in Phase 4 after wholesaler approval
- Single shop, single wholesaler architecture enforced

---

## Phase Objective

Enable retailers to:
1. Review their cart and proceed to checkout
2. Select delivery address
3. Choose payment method (PhonePe or COD)
4. Complete payment securely
5. Receive order confirmation

Enable wholesalers to:
1. Receive notifications of new orders
2. View pending orders (approval in Phase 4)

---

## Business Flow

```
Retailer Browses Products
         ↓
    Adds to Cart
         ↓
  Proceeds to Checkout
         ↓
Reviews Order Summary
         ↓
Selects Delivery Address
         ↓
Chooses Payment Method
         ↓
   ┌─────────────────┐
   │                 │
PhonePe          Cash on Delivery
   │                 │
   ↓                 ↓
Payment Page    Direct Order
   ↓             Creation
Completes           ↓
Payment         Payment Status:
   ↓            PENDING_COD
Verification        ↓
   ↓                │
   └────────┬───────┘
            ↓
    Order Created
    Status: PENDING_APPROVAL
            ↓
    Retailer Confirmation
            ↓
    Wholesaler Notification
            ↓
    (Phase 4: Approval)
```

---

## Scope

### In Scope

**Retailer Features:**
- Checkout page with order summary
- Delivery address selection/creation
- Payment method selection
- PhonePe payment integration
- COD order placement
- Payment success/failure pages
- Order confirmation page
- My Orders list page
- Order details page
- Retry failed payment

**Backend Services:**
- Cart validation service
- Order creation service
- PhonePe payment integration
- Payment verification service
- Order state management
- Notification service (email)
- Webhook handling
- Audit logging

**Business Logic:**
- Cart validation (MOQ, stock availability, active products)
- Server-side price calculation
- Order snapshot creation
- Payment status tracking
- Duplicate payment prevention
- Idempotency handling

**Data Models:**
- Order schema
- Payment schema
- Order items schema
- Delivery address schema
- Order audit log schema

---

### Out of Scope (Future Phases)

- Wholesaler order approval (Phase 4)
- Inventory locking/reduction (Phase 4)
- Delivery partner assignment (Phase 5)
- Delivery execution (Phase 6)
- COD settlement (Phase 7)
- Order cancellation (Phase 8)
- Refunds (Phase 9)
- Disputes (Phase 10)
- Premium UI redesign (Phase 3.9)

---

## Technical Architecture

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (Next.js)                    │
├─────────────────────────────────────────────────────────┤
│  Checkout Page  │  Payment Page  │  Order Success Page  │
│  Order List     │  Order Details │  Payment Retry       │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ↓ HTTP/HTTPS
┌─────────────────────────────────────────────────────────┐
│                Backend API (Express.js)                  │
├─────────────────────────────────────────────────────────┤
│  POST /api/orders/validate-cart                         │
│  POST /api/orders/create                                │
│  GET  /api/orders                                       │
│  GET  /api/orders/:orderId                              │
│  POST /api/payments/initiate                            │
│  POST /api/payments/verify                              │
│  POST /api/payments/webhook (PhonePe callback)          │
│  POST /api/payments/retry                               │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────────────┐
│                   Service Layer                          │
├─────────────────────────────────────────────────────────┤
│  CartValidationService                                   │
│  OrderService                                            │
│  PaymentService (PhonePe)                                │
│  NotificationService                                     │
│  AuditService                                            │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ↓
┌──────────────────┬──────────────────────────────────────┐
│                  │                                       │
│   Firestore      │        PhonePe API                   │
│   Database       │        (External)                    │
│                  │                                       │
└──────────────────┴──────────────────────────────────────┘
```

---

## Data Models

### Order Document

**Collection:** `orders`  
**Document ID:** Auto-generated

```typescript
{
  orderId: string;              // Auto-generated unique ID
  orderNumber: string;          // Human-readable (e.g., "ORD-20260713-0001")
  
  // Retailer information
  retailerId: string;
  retailerName: string;
  retailerEmail: string;
  retailerPhone: string;
  
  // Shop information (single shop)
  shopId: string;               // Fixed shop ID
  shopName: string;
  
  // Order items (snapshot at order time)
  items: [
    {
      itemId: string;
      productName: string;
      sku: string;
      quantity: number;
      unitPrice: number;        // Price at order time
      moq: number;
      totalPrice: number;       // quantity * unitPrice
      imageUrl?: string;
    }
  ];
  
  // Pricing breakdown
  subtotal: number;             // Sum of all item totals
  deliveryCharges: number;      // Configurable
  tax: number;                  // If applicable
  discount: number;             // If applicable
  grandTotal: number;           // Final amount
  
  // Delivery information
  deliveryAddress: {
    addressId: string;
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
  };
  
  // Payment information
  paymentMethod: 'PHONEPE' | 'COD';
  paymentStatus: 'PENDING' | 'INITIATED' | 'SUCCESS' | 'FAILED' | 'PENDING_COD';
  paymentId?: string;           // PhonePe transaction ID
  paymentDetails?: object;      // PhonePe response snapshot
  
  // Order status
  orderState: 'PENDING_APPROVAL';  // Fixed for Phase 3
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Audit
  createdBy: string;            // Retailer ID
  ipAddress?: string;
  userAgent?: string;
}
```

---

### Payment Document

**Collection:** `payments`  
**Document ID:** Auto-generated

```typescript
{
  paymentId: string;            // Auto-generated
  orderId: string;              // Reference to order
  
  // Payment gateway details
  gateway: 'PHONEPE';
  merchantTransactionId: string; // Our unique transaction ID
  gatewayTransactionId?: string; // PhonePe's transaction ID
  
  // Amount
  amount: number;
  currency: 'INR';
  
  // Status tracking
  status: 'INITIATED' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'EXPIRED';
  
  // PhonePe specific
  phonePeResponse?: object;     // Full API response
  checksum?: string;            // Verification checksum
  
  // Retry tracking
  retryCount: number;
  maxRetries: number;           // Default: 3
  
  // Timestamps
  initiatedAt: Timestamp;
  completedAt?: Timestamp;
  expiresAt: Timestamp;         // Payment link expiry
  
  // Audit
  retailerId: string;
  ipAddress?: string;
  webhookReceived: boolean;
  webhookData?: object;
}
```

---

### Order Audit Log

**Collection:** `orderAuditLogs`  
**Document ID:** Auto-generated

```typescript
{
  orderId: string;
  timestamp: Timestamp;
  action: string;               // e.g., "ORDER_CREATED", "PAYMENT_INITIATED"
  performedBy: string;          // User ID or "SYSTEM"
  performedByRole: string;      // e.g., "RETAILER", "SYSTEM"
  oldState?: string;
  newState: string;
  metadata?: object;            // Additional context
  ipAddress?: string;
}
```

---

### Delivery Address Document

**Collection:** `users/{userId}/addresses`  
**Document ID:** Auto-generated

```typescript
{
  addressId: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  isDefault: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## PhonePe Integration

### Overview

PhonePe Business provides a payment gateway for UPI, cards, net banking, and wallets.

**Official Documentation:**  
https://developer.phonepe.com/v1/docs/payments-overview

**Integration Type:** Standard Checkout (Redirect)

---

### Prerequisites

1. **PhonePe Business Account**
   - Sign up at PhonePe Business portal
   - Complete KYC verification
   - Obtain Merchant ID
   - Obtain Salt Key (for production)
   - Obtain Salt Index

2. **Sandbox Environment**
   - Use test credentials for development
   - Test merchant ID provided by PhonePe
   - Test salt key for checksum generation

3. **Production Environment**
   - Live merchant ID
   - Live salt key
   - SSL certificate for callback URL
   - Domain whitelisting

---

### PhonePe Payment Flow

**Step-by-Step:**

1. **Retailer Initiates Payment**
   - Frontend calls: `POST /api/payments/initiate`
   - Backend validates cart
   - Backend generates merchant transaction ID
   - Backend creates payment record in Firestore

2. **Backend Requests PhonePe**
   - Prepare payment request payload
   - Calculate checksum (SHA256)
   - Send request to PhonePe API: `/pg/v1/pay`
   - Receive payment URL and payment page URL

3. **Redirect Retailer**
   - Frontend redirects to PhonePe payment page
   - Retailer completes payment on PhonePe UI
   - PhonePe shows success/failure

4. **PhonePe Callback**
   - PhonePe redirects back to: `{callbackUrl}?merchantTransactionId={id}`
   - Frontend shows loading state
   - Frontend calls: `POST /api/payments/verify`

5. **Backend Verification**
   - Backend calls PhonePe status API: `/pg/v1/status`
   - Verify checksum
   - Update payment status in Firestore
   - If success, create order
   - Send notification to retailer

6. **Webhook (Optional but Recommended)**
   - PhonePe sends webhook to: `POST /api/payments/webhook`
   - Backend verifies webhook signature
   - Update payment status (idempotent)
   - Log webhook receipt

---

### PhonePe API Endpoints

**Base URL (Sandbox):**  
`https://api-preprod.phonepe.com/apis/pg-sandbox`

**Base URL (Production):**  
`https://api.phonepe.com/apis/hermes`

**Endpoints:**

1. **Initiate Payment**
   - `POST /pg/v1/pay`
   - Requires: Base64 encoded request + checksum

2. **Check Status**
   - `GET /pg/v1/status/{merchantId}/{merchantTransactionId}`
   - Requires: checksum in header

3. **Refund (Future)**
   - `POST /pg/v1/refund`

---

### PhonePe Request Structure

**Initiate Payment Request:**

```typescript
{
  merchantId: string;
  merchantTransactionId: string;  // Unique per transaction
  merchantUserId: string;         // Retailer ID
  amount: number;                 // In paise (₹100 = 10000 paise)
  redirectUrl: string;            // Where to redirect after payment
  redirectMode: 'POST' | 'GET';
  callbackUrl: string;            // Webhook endpoint
  mobileNumber?: string;
  paymentInstrument: {
    type: 'PAY_PAGE';             // Universal payment page
  };
}
```

**Checksum Calculation:**

```typescript
const payload = {
  merchantId,
  merchantTransactionId,
  // ... other fields
};

const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
const checksumString = base64Payload + '/pg/v1/pay' + saltKey;
const checksum = crypto.createHash('sha256').update(checksumString).digest('hex');
const xVerify = checksum + '###' + saltIndex;

// Send in request header:
// X-VERIFY: {xVerify}
```

---

### PhonePe Response Structure

**Success Response:**

```typescript
{
  success: true;
  code: 'PAYMENT_SUCCESS';
  message: 'Your payment is successful.';
  data: {
    merchantId: string;
    merchantTransactionId: string;
    transactionId: string;        // PhonePe transaction ID
    amount: number;
    state: 'COMPLETED';
    responseCode: 'SUCCESS';
    paymentInstrument: {
      type: 'UPI' | 'CARD' | 'NETBANKING' | 'WALLET';
      // Additional details based on type
    };
  };
}
```

**Failure Response:**

```typescript
{
  success: false;
  code: 'PAYMENT_ERROR';
  message: 'Payment failed';
  data: {
    merchantId: string;
    merchantTransactionId: string;
    state: 'FAILED';
    responseCode: string;         // Error code
  };
}
```

---

### Environment Configuration

**Backend `.env` file:**

```env
# PhonePe Configuration
PHONEPE_MERCHANT_ID=your_merchant_id
PHONEPE_SALT_KEY=your_salt_key
PHONEPE_SALT_INDEX=1
PHONEPE_BASE_URL=https://api-preprod.phonepe.com/apis/pg-sandbox  # Sandbox
# PHONEPE_BASE_URL=https://api.phonepe.com/apis/hermes            # Production

# Callback URLs
PHONEPE_REDIRECT_URL=https://yourdomain.com/payment/callback
PHONEPE_WEBHOOK_URL=https://yourdomain.com/api/payments/webhook

# Frontend URL
FRONTEND_URL=https://yourdomain.com
```

**Frontend `.env.local` file:**

```env
NEXT_PUBLIC_API_BASE_URL=https://your-backend-api.com
```

---

## Implementation Tasks

### Task Group 1: Backend - Data Models & Types

**Task 1.1: Define TypeScript Interfaces**

Location: `backend/src/types/index.ts`

Define interfaces for:
- `Order`
- `OrderItem`
- `DeliveryAddress`
- `Payment`
- `OrderAuditLog`
- `CartValidationResult`
- `PaymentInitiationRequest`
- `PaymentVerificationResult`

**Task 1.2: Create Firestore Schema Documentation**

Document expected Firestore collections and fields.

---

### Task Group 2: Backend - PhonePe Service

**Task 2.1: Create PhonePe Service**

Location: `backend/src/services/phonepe.service.ts`

Methods:
- `initiatePayment(orderData, retailerData, amount)`
- `verifyPayment(merchantTransactionId)`
- `generateChecksum(payload, endpoint)`
- `verifyWebhookSignature(request)`
- `checkPaymentStatus(merchantTransactionId)`

**Task 2.2: Create PhonePe Configuration**

Location: `backend/src/config/phonepe.ts`

Export:
- Merchant ID
- Salt Key
- Salt Index
- Base URL
- Redirect URL
- Webhook URL

**Task 2.3: Add PhonePe Utilities**

Location: `backend/src/utils/phonepe.utils.ts`

Functions:
- Generate unique merchant transaction ID
- Convert rupees to paise
- Convert paise to rupees
- Parse PhonePe response codes
- Map payment states

---

### Task Group 3: Backend - Cart Validation Service

**Task 3.1: Create Cart Validation Service**

Location: `backend/src/services/cart-validation.service.ts`

Methods:
- `validateCart(userId, cartItems)`
- `validateProduct(productId)`
- `validateStock(productId, requestedQty)`
- `validateMOQ(productId, requestedQty)`
- `validatePricing(productId, frontendPrice)`
- `calculateOrderTotal(cartItems, deliveryCharges)`

Validation Rules:
- Product exists and is active
- Product belongs to the single shop
- Requested quantity >= MOQ
- Sufficient stock available (validation only, not locking)
- Price matches current price
- All items valid simultaneously

---

### Task Group 4: Backend - Order Service

**Task 4.1: Create Order Service**

Location: `backend/src/services/order.service.ts`

Methods:
- `createOrder(retailerId, cartData, addressData, paymentData)`
- `generateOrderNumber()`
- `snapshotOrderItems(cartItems)`
- `calculatePricing(items, deliveryCharges)`
- `getOrderById(orderId, userId, userRole)`
- `getOrdersByRetailer(retailerId, filters, pagination)`
- `getOrdersByShop(shopId, filters, pagination)`
- `updateOrderPaymentStatus(orderId, paymentStatus, paymentDetails)`
- `createOrderAuditLog(orderId, action, performedBy, metadata)`

**Task 4.2: Implement Order Creation Logic**

Steps:
1. Validate cart
2. Verify delivery address
3. Calculate totals server-side
4. Create order document
5. Snapshot product details at order time
6. Set order state: `PENDING_APPROVAL`
7. Set payment status based on method
8. Create audit log entry
9. Clear retailer's cart
10. Return order details

**Task 4.3: Implement Order Number Generation**

Format: `ORD-YYYYMMDD-NNNN`

Example: `ORD-20260713-0001`

Use Firestore counter or atomic increment for sequence.

---

### Task Group 5: Backend - Payment Service

**Task 5.1: Create Payment Service**

Location: `backend/src/services/payment.service.ts`

Methods:
- `initiatePayment(orderId, amount, retailerData)`
- `createPaymentRecord(paymentData)`
- `verifyPaymentStatus(merchantTransactionId)`
- `updatePaymentStatus(paymentId, status, gatewayResponse)`
- `handlePaymentSuccess(paymentId, orderId)`
- `handlePaymentFailure(paymentId, orderId, reason)`
- `retryPayment(orderId, retailerId)`
- `isPaymentExpired(paymentId)`

**Task 5.2: Implement Payment Initiation Flow**

Steps:
1. Validate order exists and belongs to retailer
2. Check if payment already initiated
3. Generate unique merchant transaction ID
4. Create payment record in Firestore
5. Call PhonePe service to initiate payment
6. Store PhonePe response
7. Return payment URL to frontend

**Task 5.3: Implement Payment Verification Flow**

Steps:
1. Receive merchant transaction ID from callback
2. Call PhonePe status API
3. Verify checksum
4. Update payment record
5. If success: create/confirm order
6. If failure: update payment status
7. Send notification
8. Return verification result

---

### Task Group 6: Backend - API Routes

**Task 6.1: Create Order Routes**

Location: `backend/src/routes/orders.routes.ts`

Routes:
```
POST   /api/orders/validate-cart
POST   /api/orders/create
GET    /api/orders
GET    /api/orders/:orderId
POST   /api/orders/:orderId/cancel    (Future)
```

Middleware:
- Authentication required
- Role validation (RETAILER for create, WHOLESALER for shop orders)

**Task 6.2: Create Payment Routes**

Location: `backend/src/routes/payments.routes.ts`

Routes:
```
POST   /api/payments/initiate
POST   /api/payments/verify
POST   /api/payments/webhook
POST   /api/payments/retry
GET    /api/payments/:paymentId/status
```

Middleware:
- Authentication required (except webhook)
- Webhook signature verification
- Idempotency for webhook

**Task 6.3: Create Address Routes**

Location: `backend/src/routes/addresses.routes.ts`

Routes:
```
GET    /api/addresses
POST   /api/addresses
PUT    /api/addresses/:addressId
DELETE /api/addresses/:addressId
PUT    /api/addresses/:addressId/set-default
```

Middleware:
- Authentication required
- User can only access their own addresses

---

### Task Group 7: Backend - Controllers

**Task 7.1: Create Order Controller**

Location: `backend/src/controllers/order.controller.ts`

Functions:
- `validateCart(req, res)` - Validate cart before checkout
- `createOrder(req, res)` - Create COD order or prepare for payment
- `getOrders(req, res)` - List orders with filters
- `getOrderById(req, res)` - Get single order details

**Task 7.2: Create Payment Controller**

Location: `backend/src/controllers/payment.controller.ts`

Functions:
- `initiatePayment(req, res)` - Start PhonePe payment
- `verifyPayment(req, res)` - Verify after redirect
- `handleWebhook(req, res)` - Process PhonePe webhook
- `retryPayment(req, res)` - Retry failed payment
- `getPaymentStatus(req, res)` - Check payment status

**Task 7.3: Create Address Controller**

Location: `backend/src/controllers/address.controller.ts`

Functions:
- `getAddresses(req, res)`
- `createAddress(req, res)`
- `updateAddress(req, res)`
- `deleteAddress(req, res)`
- `setDefaultAddress(req, res)`

---

### Task Group 8: Backend - Validation Schemas

**Task 8.1: Create Validation Schemas**

Location: `backend/src/validation/order.validation.ts`

Schemas using Joi or Zod:
- `validateCartSchema` - Cart items validation
- `createOrderSchema` - Order creation validation
- `addressSchema` - Delivery address validation

**Task 8.2: Create Payment Validation Schemas**

Location: `backend/src/validation/payment.validation.ts`

Schemas:
- `initiatePaymentSchema`
- `verifyPaymentSchema`
- `webhookSchema`

---

### Task Group 9: Backend - Notification Service

**Task 9.1: Extend Notification Service**

Location: `backend/src/services/notification.service.ts`

Add methods:
- `sendOrderConfirmation(retailer, order)`
- `sendPaymentSuccess(retailer, order, payment)`
- `sendPaymentFailure(retailer, order, payment)`
- `sendCODConfirmation(retailer, order)`
- `notifyWholesalerNewOrder(wholesaler, order)`

**Task 9.2: Create Email Templates**

Templates needed:
- Order confirmation (PhonePe success)
- Order confirmation (COD)
- Payment failure
- New order notification (wholesaler)

Use existing Brevo integration.

---

### Task Group 10: Backend - Middleware

**Task 10.1: Create Idempotency Middleware**

Location: `backend/src/middleware/idempotency.ts`

Purpose: Prevent duplicate payment processing

Implementation:
- Extract idempotency key from header or request
- Check if request already processed
- If yes, return cached response
- If no, process and cache

**Task 10.2: Create Webhook Verification Middleware**

Location: `backend/src/middleware/webhook-verify.ts`

Purpose: Verify PhonePe webhook signature

Implementation:
- Extract signature from header
- Verify checksum
- Reject invalid requests

---

### Task Group 11: Backend - Error Handling

**Task 11.1: Define Custom Error Classes**

Location: `backend/src/errors/order.errors.ts`

Errors:
- `CartValidationError`
- `InsufficientStockError`
- `MOQNotMetError`
- `PriceMismatchError`
- `OrderNotFoundError`
- `UnauthorizedOrderAccessError`

**Task 11.2: Define Payment Error Classes**

Location: `backend/src/errors/payment.errors.ts`

Errors:
- `PaymentInitiationError`
- `PaymentVerificationError`
- `PaymentExpiredError`
- `DuplicatePaymentError`
- `WebhookVerificationError`

**Task 11.3: Update Global Error Handler**

Location: `backend/src/middleware/error.ts`

Handle new error types and return appropriate HTTP status codes.

---

### Task Group 12: Backend - Audit Logging

**Task 12.1: Create Audit Service**

Location: `backend/src/services/audit.service.ts`

Methods:
- `logOrderCreation(orderId, retailerId, metadata)`
- `logPaymentInitiated(orderId, paymentId, metadata)`
- `logPaymentSuccess(orderId, paymentId, metadata)`
- `logPaymentFailure(orderId, paymentId, metadata)`
- `logOrderStateChange(orderId, oldState, newState, performedBy)`

Store in `orderAuditLogs` collection.

---

### Task Group 13: Frontend - TypeScript Types

**Task 13.1: Define Order Types**

Location: `frontend/lib/types/order.ts`

Types:
- `Order`
- `OrderItem`
- `DeliveryAddress`
- `OrderStatus`
- `PaymentStatus`

**Task 13.2: Define Payment Types**

Location: `frontend/lib/types/payment.ts`

Types:
- `Payment`
- `PaymentMethod`
- `PaymentInitiationResponse`
- `PaymentVerificationResult`

---

### Task Group 14: Frontend - API Client

**Task 14.1: Create Order API Client**

Location: `frontend/lib/api/orders.ts`

Functions:
- `validateCart(cartItems)`
- `createOrder(orderData)`
- `getOrders(filters, pagination)`
- `getOrderById(orderId)`

**Task 14.2: Create Payment API Client**

Location: `frontend/lib/api/payments.ts`

Functions:
- `initiatePayment(orderId)`
- `verifyPayment(merchantTransactionId)`
- `retryPayment(orderId)`
- `getPaymentStatus(paymentId)`

**Task 14.3: Create Address API Client**

Location: `frontend/lib/api/addresses.ts`

Functions:
- `getAddresses()`
- `createAddress(addressData)`
- `updateAddress(addressId, addressData)`
- `deleteAddress(addressId)`
- `setDefaultAddress(addressId)`

---

### Task Group 15: Frontend - Checkout Page

**Task 15.1: Create Checkout Page Layout**

Location: `frontend/app/(retailer)/retailer/checkout/page.tsx`

Sections:
- Order summary (product list, quantities, prices)
- Pricing breakdown (subtotal, delivery, tax, total)
- Delivery address selection/creation
- Payment method selection (PhonePe / COD)
- Terms and conditions checkbox
- Place Order button

**Task 15.2: Implement Cart Summary Component**

Location: `frontend/components/checkout/CartSummary.tsx`

Display:
- Product image, name, SKU
- Quantity, unit price, total price
- Edit link to cart
- Pricing breakdown

**Task 15.3: Implement Address Selection Component**

Location: `frontend/components/checkout/AddressSelection.tsx`

Features:
- Display saved addresses as cards
- Highlight default address
- Select address radio buttons
- Add new address button
- Edit existing address
- Delete address

**Task 15.4: Implement Add Address Modal**

Location: `frontend/components/checkout/AddAddressModal.tsx`

Fields:
- Full name
- Phone number
- Address line 1
- Address line 2 (optional)
- City
- State
- Pincode
- Landmark (optional)
- Set as default checkbox

Validation:
- All required fields
- Phone number format
- Pincode format

**Task 15.5: Implement Payment Method Selection**

Location: `frontend/components/checkout/PaymentMethodSelection.tsx`

Options:
- PhonePe (UPI, Cards, Net Banking, Wallets)
- Cash on Delivery

Display icons and descriptions.

---

### Task Group 16: Frontend - Payment Flow

**Task 16.1: Implement Place Order Logic**

Location: `frontend/app/(retailer)/retailer/checkout/page.tsx`

Flow:
1. Validate all fields (address, payment method, terms)
2. Show loading state
3. If COD selected:
   - Call `createOrder()` API
   - Redirect to success page
4. If PhonePe selected:
   - Call `initiatePayment()` API
   - Redirect to PhonePe payment URL

**Task 16.2: Create Payment Callback Page**

Location: `frontend/app/(retailer)/retailer/payment/callback/page.tsx`

Flow:
1. Extract `merchantTransactionId` from URL
2. Show loading spinner
3. Call `verifyPayment()` API
4. If success: redirect to success page
5. If failure: redirect to failure page
6. If pending: show "Processing..." and poll status

**Task 16.3: Create Payment Success Page**

Location: `frontend/app/(retailer)/retailer/payment/success/page.tsx`

Display:
- Success icon
- Order number
- Order summary
- Expected approval timeline
- "View Order" button
- "Continue Shopping" button

**Task 16.4: Create Payment Failure Page**

Location: `frontend/app/(retailer)/retailer/payment/failure/page.tsx`

Display:
- Failure icon
- Error message
- Reason (if available)
- "Retry Payment" button
- "Contact Support" link

---

### Task Group 17: Frontend - Order Management

**Task 17.1: Create My Orders Page**

Location: `frontend/app/(retailer)/retailer/orders/page.tsx`

Features:
- List all orders
- Show order number, date, status, total
- Filter by status (All, Pending Approval, Approved, etc.)
- Sort by date (newest first)
- Pagination
- Click to view details

**Task 17.2: Create Order Details Page**

Location: `frontend/app/(retailer)/retailer/orders/[orderId]/page.tsx`

Display:
- Order number
- Order date
- Order status badge
- Payment status badge
- Order items with images, names, quantities, prices
- Delivery address
- Pricing breakdown
- Payment method
- Order timeline (audit log)
- Actions (Cancel if allowed, Retry Payment if failed)

**Task 17.3: Create Order Status Badge Component**

Location: `frontend/components/orders/OrderStatusBadge.tsx`

Status mapping:
- `PENDING_APPROVAL` → Yellow badge "Pending Approval"
- Future statuses in later phases

**Task 17.4: Create Order Timeline Component**

Location: `frontend/components/orders/OrderTimeline.tsx`

Display:
- Order created
- Payment initiated
- Payment success/failure
- Future events (approval, dispatch, delivery)

---

### Task Group 18: Frontend - Loading & Error States

**Task 18.1: Create Loading Components**

Components needed:
- `CheckoutSkeleton` - Skeleton for checkout page
- `OrderListSkeleton` - Skeleton for orders list
- `OrderDetailsSkeleton` - Skeleton for order details
- `PaymentProcessing` - Loading screen during payment

**Task 18.2: Create Empty States**

Components needed:
- `EmptyOrders` - No orders yet
- `EmptyAddresses` - No saved addresses

**Task 18.3: Create Error Components**

Components needed:
- `OrderError` - Error loading order
- `PaymentError` - Payment processing error
- `CartValidationError` - Cart validation failed

---

### Task Group 19: Frontend - State Management

**Task 19.1: Create Checkout State Hook**

Location: `frontend/hooks/useCheckout.ts`

State:
- Selected address
- Selected payment method
- Terms accepted
- Loading state
- Error state

Methods:
- `selectAddress(addressId)`
- `selectPaymentMethod(method)`
- `acceptTerms()`
- `placeOrder()`

**Task 19.2: Create Orders State Hook**

Location: `frontend/hooks/useOrders.ts`

State:
- Orders list
- Loading state
- Error state
- Filters
- Pagination

Methods:
- `fetchOrders(filters)`
- `fetchOrderById(orderId)`
- `retryPayment(orderId)`

---

### Task Group 20: Wholesaler Features

**Task 20.1: Create Wholesaler Orders List Page**

Location: `frontend/app/(wholesaler)/wholesaler/orders/page.tsx`

Features:
- List all orders for the single shop
- Filter by status
- Sort by date
- Search by order number or retailer name
- Pagination
- Click to view details

**Task 20.2: Create Wholesaler Order Details Page**

Location: `frontend/app/(wholesaler)/wholesaler/orders/[orderId]/page.tsx`

Display:
- Order details (same as retailer view)
- Retailer information
- Actions: Approve / Reject (Phase 4)

Note: Approval logic is Phase 4, but UI can show disabled buttons.

---

### Task Group 21: Testing

**Task 21.1: Backend Unit Tests**

Test files needed:
- `cart-validation.service.test.ts`
- `order.service.test.ts`
- `payment.service.test.ts`
- `phonepe.service.test.ts`

Test cases:
- Cart validation with invalid products
- Cart validation with insufficient stock
- MOQ validation
- Price mismatch detection
- Order creation with valid data
- Payment initiation
- Payment verification
- Checksum generation and validation

**Task 21.2: Backend Integration Tests**

Test scenarios:
- Complete order flow (COD)
- Complete payment flow (PhonePe sandbox)
- Webhook handling
- Duplicate payment prevention
- Concurrent order creation

---

**Task 21.3: Frontend Component Tests**

Test components:
- `AddressSelection.test.tsx`
- `PaymentMethodSelection.test.tsx`
- `CartSummary.test.tsx`
- `OrderStatusBadge.test.tsx`

**Task 21.4: End-to-End Tests**

Test flows:
1. Complete checkout with COD
2. Complete checkout with PhonePe (sandbox)
3. Payment failure scenario
4. Retry payment
5. View orders list
6. View order details

Tools: Playwright or Cypress

---

### Task Group 22: Security Implementation

**Task 22.1: Implement Input Validation**

Validate all API inputs:
- Cart items structure
- Address fields
- Payment data
- User authorization

**Task 22.2: Implement Payment Verification**

Security measures:
- Verify PhonePe checksums
- Validate webhook signatures
- Prevent replay attacks
- Implement idempotency

**Task 22.3: Implement Authorization Checks**

Ensure:
- Retailers can only access their own orders
- Wholesaler can access shop orders
- Admin can access all orders
- Proper role-based access control

**Task 22.4: Implement Rate Limiting**

Protect endpoints:
- Payment initiation (max 5 per minute per user)
- Order creation (max 10 per minute per user)
- Webhook endpoint (IP-based rate limiting)

---

### Task Group 23: Documentation

**Task 23.1: API Documentation**

Document all endpoints with:
- Request format
- Response format
- Authentication requirements
- Example requests
- Error codes

**Task 23.2: PhonePe Integration Guide**

Document:
- Setup steps
- Configuration
- Testing with sandbox
- Production deployment
- Troubleshooting

**Task 23.3: Deployment Checklist**

Create checklist for:
- Environment variables
- PhonePe account setup
- Webhook URL configuration
- SSL certificate
- Domain setup

---

### Task Group 24: Configuration & Deployment

**Task 24.1: Environment Configuration**

Set up:
- Backend `.env` with PhonePe credentials
- Frontend `.env.local` with API URL
- Separate sandbox and production configs

**Task 24.2: Firestore Security Rules**

Update rules for:
- `orders` collection (retailers read own, wholesaler read shop)
- `payments` collection (restricted access)
- `orderAuditLogs` collection (system only)
- `users/{userId}/addresses` subcollection (user only)

**Task 24.3: Firestore Indexes**

Create composite indexes:
- `orders` by `retailerId` + `createdAt`
- `orders` by `shopId` + `orderState` + `createdAt`
- `payments` by `merchantTransactionId`
- `orderAuditLogs` by `orderId` + `timestamp`

---

## Dependencies

### External Services

1. **PhonePe Business**
   - Merchant account approved
   - API credentials obtained
   - Sandbox access for testing
   - Webhook URL configured

2. **Brevo (Email Service)**
   - Already configured (from previous phases)
   - Templates updated for order/payment notifications

3. **Cloudinary (Image Hosting)**
   - Already configured (from previous phases)
   - Product images available

4. **Firebase/Firestore**
   - Already configured (from previous phases)
   - New collections to be created

### Internal Dependencies

1. **Authentication System** (Phase 1)
   - User login working
   - Session management
   - Role-based access control

2. **Product Catalog** (Phase 2)
   - Products available
   - Pricing configured
   - MOQ set
   - Stock availability

3. **Shopping Cart** (Previous Phase)
   - Cart functionality working
   - Add/update/remove items
   - Cart persistence

4. **Shop Configuration** (Phase 2)
   - Single shop configured
   - Shop details available
   - Delivery charges configured

---

## Risk Assessment

### High Risk

1. **PhonePe Integration Complexity**
   - Mitigation: Thorough testing in sandbox, comprehensive error handling
   - Fallback: COD remains available if payment issues

2. **Payment Security**
   - Mitigation: Strict checksum verification, webhook signature validation
   - Fallback: Manual verification process for suspicious transactions

3. **Race Conditions**
   - Mitigation: Firestore transactions, idempotency keys
   - Fallback: Audit logs to detect and resolve

### Medium Risk

1. **Cart-Order State Sync**
   - Mitigation: Server-side validation, real-time stock checks
   - Fallback: Clear error messages, retry mechanism

2. **Webhook Delivery Failures**
   - Mitigation: Implement polling as backup, retry logic
   - Fallback: Status check API for verification

3. **User Experience During Payment**
   - Mitigation: Clear loading states, timeout handling
   - Fallback: Retry payment feature

### Low Risk

1. **Email Delivery**
   - Mitigation: Use reliable service (Brevo), queue system
   - Fallback: In-app notifications

2. **Address Management**
   - Mitigation: Input validation, saved addresses
   - Fallback: Manual entry always available

---

## Exit Criteria

Phase 3 is complete when:

### Functional Requirements

✅ Retailer can proceed to checkout from cart  
✅ Retailer can select/add delivery address  
✅ Retailer can choose payment method (PhonePe/COD)  
✅ Retailer can complete PhonePe payment successfully  
✅ Retailer can place COD order successfully  
✅ Order is created with status `PENDING_APPROVAL`  
✅ Payment status is tracked correctly  
✅ Retailer receives order confirmation email  
✅ Wholesaler receives new order notification  
✅ Retailer can view order history  
✅ Retailer can view order details  
✅ Retailer can retry failed payment  
✅ Wholesaler can view pending orders  

### Technical Requirements

✅ All backend APIs implemented and tested  
✅ PhonePe sandbox integration working  
✅ Webhook handling implemented  
✅ Payment verification working  
✅ Idempotency implemented  
✅ Security measures in place  
✅ Error handling comprehensive  
✅ Audit logging complete  
✅ Frontend pages functional  
✅ Loading/error states implemented  
✅ Mobile responsive  

### Quality Requirements

✅ Unit tests passing (>80% coverage)  
✅ Integration tests passing  
✅ E2E tests passing  
✅ Security audit complete  
✅ Performance benchmarks met  
✅ Code reviewed  
✅ Documentation complete  

### Business Requirements

✅ Order creation validated against business rules  
✅ MOQ enforced  
✅ Stock availability checked  
✅ Pricing calculated server-side  
✅ No inventory reduction (deferred to Phase 4)  
✅ Single shop architecture enforced  

---

## Manual Testing Checklist

### COD Order Flow

- [ ] Add products to cart
- [ ] Proceed to checkout
- [ ] Select delivery address
- [ ] Choose "Cash on Delivery"
- [ ] Accept terms
- [ ] Place order
- [ ] Verify order created with status `PENDING_APPROVAL`
- [ ] Verify payment status `PENDING_COD`
- [ ] Verify confirmation email received
- [ ] Verify wholesaler notification received
- [ ] View order in "My Orders"
- [ ] View order details

### PhonePe Payment Flow (Sandbox)

- [ ] Add products to cart
- [ ] Proceed to checkout
- [ ] Select delivery address
- [ ] Choose "PhonePe"
- [ ] Accept terms
- [ ] Click "Pay Now"
- [ ] Redirected to PhonePe page
- [ ] Complete payment (sandbox)
- [ ] Redirected back to success page
- [ ] Verify order created
- [ ] Verify payment status `SUCCESS`
- [ ] Verify confirmation email
- [ ] View order details

### PhonePe Payment Failure

- [ ] Initiate PhonePe payment
- [ ] Simulate failure (sandbox)
- [ ] Redirected to failure page
- [ ] Verify payment status `FAILED`
- [ ] Verify order not created OR marked failed
- [ ] Click "Retry Payment"
- [ ] Complete payment successfully
- [ ] Verify order created/updated

---

### Cart Validation

- [ ] Try to checkout with out-of-stock product
- [ ] Try to checkout with quantity below MOQ
- [ ] Try to checkout after price change
- [ ] Try to checkout with inactive product
- [ ] Try to checkout with deleted product
- [ ] Verify appropriate error messages

### Address Management

- [ ] Create new address
- [ ] Edit existing address
- [ ] Delete address
- [ ] Set default address
- [ ] Select address during checkout

### Webhook Testing

- [ ] Configure ngrok for local testing
- [ ] Trigger PhonePe payment
- [ ] Verify webhook received
- [ ] Verify signature validated
- [ ] Verify payment status updated
- [ ] Test duplicate webhook (idempotency)

### Security Testing

- [ ] Try to access other user's orders
- [ ] Try to create order without authentication
- [ ] Try to manipulate price in request
- [ ] Verify checksum validation
- [ ] Test webhook signature verification
- [ ] Test rate limiting

### Edge Cases

- [ ] Multiple concurrent orders
- [ ] Payment timeout
- [ ] Network interruption during payment
- [ ] Duplicate payment attempts
- [ ] Cart modified during checkout
- [ ] Stock reduced during checkout

---

## Relationship with Other Phases

### Phase 3.9: Premium Retail UI Enhancement

**Dependency:** Phase 3 must be complete  
**Purpose:** Redesign retailer-facing pages to premium e-commerce quality  
**Scope:** UI/UX only, no business logic changes  

After Phase 3 is complete and functional, Phase 3.9 will enhance:
- Product browsing experience
- Checkout flow design
- Order management interface
- Responsive design improvements
- Loading animations
- Accessibility improvements

Phase 3.9 is **purely visual enhancement** and should not modify:
- Backend APIs
- Business logic
- Data models
- Payment integration

### Phase 4: Order Approval & Inventory Locking

**Dependency:** Phase 3 must be complete  
**Key Changes:**

1. **Wholesaler Approval Workflow**
   - View pending orders
   - Approve orders
   - Reject orders with reason
   - Bulk approval

2. **Inventory Locking**
   - Lock inventory on approval
   - Release inventory on rejection
   - Handle concurrent approvals

3. **Order State Transitions**
   - `PENDING_APPROVAL` → `APPROVED` (on approval)
   - `PENDING_APPROVAL` → `REJECTED` (on rejection)
   - `APPROVED` → `READY_FOR_DISPATCH`

4. **Notifications**
   - Notify retailer of approval
   - Notify retailer of rejection

Phase 4 will **extend** Phase 3, not replace it.

---

### Phase 5: Delivery Assignment

**Dependency:** Phase 4 must be complete  
**Integration Points:**

- Orders in `APPROVED` state can be assigned to delivery partners
- Delivery partners see assigned orders
- Order state: `APPROVED` → `ASSIGNED_TO_DELIVERY`

### Phase 6: Delivery Execution

**Dependency:** Phase 5 must be complete  
**Integration Points:**

- Delivery partner picks up order
- Real-time tracking
- OTP verification
- Delivery completion
- Order state: `ASSIGNED_TO_DELIVERY` → `OUT_FOR_DELIVERY` → `DELIVERED`

### Phase 7: COD Settlement

**Dependency:** Phase 6 must be complete  
**Integration Points:**

- COD orders marked as paid after delivery
- Payment records updated
- Settlement tracking

---

## Implementation Sequence

### Week 1: Backend Foundation

**Day 1-2:**
- Task Group 1: Data models & types
- Task Group 2: PhonePe service
- Task Group 3: Cart validation service

**Day 3-4:**
- Task Group 4: Order service
- Task Group 5: Payment service
- Task Group 12: Audit logging

**Day 5:**
- Task Group 6: API routes
- Task Group 7: Controllers

---

### Week 2: Backend Completion & Frontend Start

**Day 6:**
- Task Group 8: Validation schemas
- Task Group 9: Notification service
- Task Group 10: Middleware

**Day 7:**
- Task Group 11: Error handling
- Task Group 22: Security implementation
- Backend testing setup

**Day 8-9:**
- Task Group 13: Frontend types
- Task Group 14: API clients
- Task Group 19: State management

**Day 10:**
- Task Group 15: Checkout page (start)

---

### Week 3: Frontend Core Features

**Day 11-12:**
- Task Group 15: Checkout page (complete)
- Task Group 16: Payment flow

**Day 13:**
- Task Group 17: Order management pages

**Day 14:**
- Task Group 18: Loading & error states
- Task Group 20: Wholesaler features

**Day 15:**
- Polish and refinements

---

### Week 4: Testing & Deployment

**Day 16-17:**
- Task Group 21: Testing (unit, integration)
- Bug fixes

**Day 18:**
- Task Group 21: E2E testing
- Manual testing checklist

**Day 19:**
- Task Group 23: Documentation
- Task Group 24: Configuration & deployment

**Day 20:**
- Final review
- Production deployment
- Monitoring setup

---

## Decision Points

Before implementation, confirm:

### Business Decisions

1. **Delivery Charges**
   - Fixed amount or weight-based?
   - Free delivery threshold?
   - Different rates for different locations?

2. **Tax Handling**
   - GST applicable?
   - Tax rate(s)?
   - Tax calculation method?

3. **COD Terms**
   - COD available for all retailers?
   - COD limit per order?
   - COD charges?

4. **Order Cancellation**
   - Can retailer cancel before approval?
   - Automatic cancellation if payment fails?
   - Cancellation policy?

5. **Payment Expiry**
   - How long is payment link valid?
   - What happens after expiry?

### Technical Decisions

1. **Order Number Format**
   - Confirm format: `ORD-YYYYMMDD-NNNN`
   - Counter reset daily or continuous?

2. **Webhook Retry Policy**
   - How many retries for failed webhooks?
   - Retry interval?
   - Fallback mechanism?

3. **Payment Timeout**
   - How long to wait for payment completion?
   - Polling frequency for status check?

4. **Stock Validation**
   - Check stock at checkout or payment?
   - Lock mechanism (this phase or Phase 4)?

---

## Configuration Reference

### Backend Environment Variables

```env
# Server
NODE_ENV=development|production
PORT=3001
FRONTEND_URL=https://yourdomain.com

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY=your-private-key

# PhonePe
PHONEPE_MERCHANT_ID=your-merchant-id
PHONEPE_SALT_KEY=your-salt-key
PHONEPE_SALT_INDEX=1
PHONEPE_BASE_URL=https://api-preprod.phonepe.com/apis/pg-sandbox
PHONEPE_REDIRECT_URL=https://yourdomain.com/payment/callback
PHONEPE_WEBHOOK_URL=https://your-backend.com/api/payments/webhook

# Email (Brevo)
BREVO_API_KEY=your-brevo-api-key
BREVO_SENDER_EMAIL=noreply@yourdomain.com
BREVO_SENDER_NAME=Your Shop Name

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Shop Configuration
SHOP_ID=your-single-shop-id
DEFAULT_DELIVERY_CHARGES=50
```

### Frontend Environment Variables

```env
NEXT_PUBLIC_API_BASE_URL=https://your-backend-api.com
NEXT_PUBLIC_SHOP_NAME=Your Shop Name
```

---

## Monitoring & Observability

### Metrics to Track

**Business Metrics:**
- Orders placed per day
- Order value distribution
- Payment success rate
- Payment failure rate
- COD vs online payment ratio
- Average order value
- Checkout abandonment rate

**Technical Metrics:**
- API response times
- PhonePe API latency
- Webhook delivery success rate
- Database query performance
- Error rates by endpoint
- Payment verification time

**User Experience Metrics:**
- Checkout completion time
- Payment redirection time
- Page load times
- Error frequency

### Logging Requirements

**Log Events:**
- Order creation
- Payment initiation
- Payment verification
- Webhook received
- Cart validation failures
- Payment failures
- Order state changes

**Log Structure:**
```json
{
  "timestamp": "ISO 8601",
  "level": "info|warn|error",
  "service": "order|payment|notification",
  "event": "EVENT_NAME",
  "userId": "user-id",
  "orderId": "order-id",
  "metadata": {}
}
```

### Alerts

Set up alerts for:
- Payment success rate < 95%
- Webhook delivery failure > 5%
- API error rate > 1%
- Payment verification taking > 30 seconds
- Order creation failures

---

## Troubleshooting Guide

### Common Issues

**Issue: Payment stuck in "Pending" state**

Possible causes:
- Webhook not received
- Network interruption
- PhonePe API delay

Resolution:
1. Check webhook logs
2. Poll PhonePe status API
3. Manual verification if needed

---

**Issue: Checksum verification failed**

Possible causes:
- Incorrect salt key
- Incorrect payload format
- Timestamp mismatch

Resolution:
1. Verify salt key configuration
2. Check payload encoding
3. Review PhonePe documentation

---

**Issue: Cart validation fails at checkout**

Possible causes:
- Product price changed
- Stock reduced
- Product deactivated

Resolution:
1. Show clear error message
2. Refresh cart
3. Allow user to review and update

---

**Issue: Duplicate orders created**

Possible causes:
- Idempotency not working
- Multiple webhook deliveries
- Race condition

Resolution:
1. Check idempotency key usage
2. Implement transaction locks
3. Review audit logs

---

**Issue: Webhook not received**

Possible causes:
- Incorrect URL configuration
- Firewall blocking
- PhonePe service issue

Resolution:
1. Verify webhook URL in PhonePe dashboard
2. Test with webhook testing tools
3. Implement polling as backup
4. Check server logs for incoming requests

---

## Future Enhancements (Out of Scope for Phase 3)

### Payment Features
- Saved payment methods
- Auto-retry failed payments
- Payment reminders
- Partial payments
- EMI options
- Wallet integration

### Order Features
- Order templates (repeat orders)
- Scheduled orders
- Bulk ordering
- Order notes
- Gift wrapping
- Invoice download

### Checkout Features
- Multiple delivery addresses per order
- Split delivery
- Express delivery option
- Delivery time slot selection
- Packaging preferences

### User Experience
- Real-time stock updates during checkout
- Price alerts
- Wishlist
- Recently viewed products
- Product recommendations

---

## References

### PhonePe Documentation
- Main docs: https://developer.phonepe.com/
- Payment gateway: https://developer.phonepe.com/v1/docs/payments-overview
- API reference: https://developer.phonepe.com/v1/reference/pay-api-1

### Internal Documentation
- Architecture Summary: `ARCHITECTURE-SUMMARY-V2.md`
- Full Implementation Plan: `IMPLEMENTATION-PLAN-V2.md`
- Progress Tracking: `progress.md`

### Tech Stack
- Backend: Node.js, Express.js, TypeScript
- Frontend: Next.js, React, TypeScript
- Database: Firebase Firestore
- Authentication: Firebase Auth
- Email: Brevo
- Payment: PhonePe Business
- Image Storage: Cloudinary

---

## Summary

Phase 3 transforms the shopping cart into a complete order placement and payment system. By the end of this phase:

**Retailers can:**
- Complete checkout with delivery address selection
- Pay via PhonePe (UPI, cards, net banking, wallets)
- Place COD orders
- Receive order confirmations
- View order history
- Track order status
- Retry failed payments

**Wholesalers can:**
- Receive notifications of new orders
- View pending orders
- Prepare for approval workflow (Phase 4)

**System provides:**
- Secure payment processing with PhonePe
- Server-side validation and pricing
- Order snapshots for audit
- Payment status tracking
- Comprehensive error handling
- Audit logging
- Email notifications

**Key Architecture Principles:**
- Single wholesaler, single shop model maintained
- No inventory reduction in this phase
- Orders created with `PENDING_APPROVAL` status
- Modular service architecture
- Secure payment verification
- Idempotent operations

**Ready for Phase 4:**
After Phase 3 completion, the system is ready for Phase 4 (Order Approval & Inventory Locking), where wholesalers will approve/reject orders and inventory will be locked accordingly.

**Optional Phase 3.9:**
Before proceeding to Phase 4, consider implementing Phase 3.9 (Premium Retail UI Enhancement) to elevate the retailer experience to match premium e-commerce platforms.

---

**End of Phase 3 Implementation Plan**

