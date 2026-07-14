# Phase 3: Order Placement, PhonePe Payments & Checkout — Detailed Implementation Plan

**Document Version:** 2.0  
**Date:** 2026-07-13  
**Architecture:** Single Wholesaler, Single Shop (NOT Marketplace)  
**Status:** Planning Document  

---

## Executive Summary

**Phase Objective:** Convert the existing shopping cart into a fully functional order placement and payment system with PhonePe Business integration.

**Success Criteria:**
- Retailer can complete checkout from cart to order confirmation
- PhonePe payment gateway fully integrated (UPI, cards, net banking, wallets)
- Cash on Delivery (COD) supported
- Orders created in `PENDING_APPROVAL` state
- Inventory validation performed but NOT reduced (reduction happens in Phase 4)
- Wholesaler receives notification of new orders
- Retailer can view order history and track status
- Payment verification and security implemented
- Error handling and retry flows functional

**Exit Criteria:**
- All 24 implementation tasks completed
- Manual testing checklist passed
- Documentation complete
- No critical bugs
- Ready for Phase 3.9 UI/UX enhancement

---

## Architectural Context

### Core Constraints


**CRITICAL:** This system operates with:
- **ONE Admin**
- **ONE Wholesaler** (fixed business owner)
- **ONE Shop** (the wholesale business)
- **Multiple Retailers** (customers)
- **Multiple Delivery Partners** (Phase 4+)

**Shop Assignment:** All orders automatically assigned to THE single shop via `getSingleShopId()`

**Wholesaler Assignment:** All orders automatically assigned to THE single wholesaler via `getSingleWholesalerId()`

**No Multi-Tenancy:** System does not support:
- Multiple wholesalers
- Wholesaler registration/onboarding
- Shop discovery/selection
- Marketplace features

### System State Before Phase 3

**Completed (Phase 1-2):**
- Authentication (Firebase Auth)
- Role management (admin, wholesaler, retailer, delivery_partner)
- Single shop setup (admin-provisioned)
- Product catalog management
- Inventory management
- Shopping cart functionality
- Product browsing and search
- Category management

**Available Data:**
- One shop document in `shops/{shopId}`
- One wholesaler user in `users/{uid}` where `role == "wholesaler"`
- Product catalog in `items/{itemId}`
- User carts in `carts/{userId}/items/{itemId}`

---

## Business Flow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 3 ORDER FLOW                          │
└─────────────────────────────────────────────────────────────────┘

RETAILER JOURNEY:
┌──────────────┐
│ Browse       │ ← Already implemented (Phase 2)
│ Products     │
└──────┬───────┘
       │
┌──────▼───────┐
│ Add to Cart  │ ← Already implemented (Phase 2)
└──────┬───────┘
       │
┌──────▼───────────────┐
│ View Cart            │ ← Phase 3: Enhanced validation
│ - Review items       │
│ - Check totals       │
│ - Validate MOQ       │
└──────┬───────────────┘
       │
┌──────▼─────────────────┐
│ Checkout Page          │ ← Phase 3: NEW
│ - Delivery address     │
│ - Payment method       │
│ - Order summary        │
│ - Terms acceptance     │
└──────┬─────────────────┘
       │
       ├─────────────────┬──────────────────┐
       │                 │                  │
┌──────▼──────────┐ ┌───▼──────────┐ ┌────▼────────┐
│ PhonePe Payment │ │ Cash on      │ │ (Future:    │
│                 │ │ Delivery     │ │  Credit)    │
└──────┬──────────┘ └───┬──────────┘ └─────────────┘
       │                 │
┌──────▼──────────────┐  │
│ PhonePe Checkout    │  │
│ - UPI               │  │
│ - Cards             │  │
│ - Net Banking       │  │
│ - Wallets           │  │
└──────┬──────────────┘  │
       │                 │
┌──────▼─────────────────▼────────┐
│ Payment Verification            │ ← Phase 3: NEW
│ - Webhook/callback              │
│ - Status polling                │
│ - Signature verification        │
└──────┬──────────────────────────┘
       │
┌──────▼──────────────────────────┐
│ Create Order                    │ ← Phase 3: NEW
│ - Snapshot products/prices      │
│ - Calculate totals              │
│ - Set status: PENDING_APPROVAL  │
│ - Generate order number         │
│ - Create audit trail            │
└──────┬──────────────────────────┘
       │
┌──────▼──────────────────────────┐
│ Order Confirmation              │ ← Phase 3: NEW
│ - Order number                  │
│ - Payment status                │
│ - Expected timeline             │
└──────┬──────────────────────────┘
       │
┌──────▼──────────────────────────┐
│ Notifications Sent              │ ← Phase 3: NEW
│ ├─ Retailer: Order placed       │
│ └─ Wholesaler: New order        │
└──────┬──────────────────────────┘
       │
┌──────▼──────────────────────────┐
│ Awaiting Wholesaler Approval    │ ← Phase 4
│ (Order state: PENDING_APPROVAL) │
└─────────────────────────────────┘

WHOLESALER JOURNEY (Phase 3 scope):
┌──────────────────────────────┐
│ Receive Notification         │ ← Phase 3: NEW
│ - Email alert                │
│ - Order summary              │
└──────┬───────────────────────┘
       │
┌──────▼───────────────────────┐
│ View New Orders Dashboard    │ ← Phase 3: Basic view
│ - List of pending orders     │
│ - Order details              │
└──────────────────────────────┘
       │
       └──→ [Approval workflow in Phase 4]
```

---

## Payment Gateway: PhonePe Business

### Why PhonePe?

- **Business Decision:** PhonePe selected as payment gateway (NOT Razorpay)
- **Coverage:** Supports UPI, cards, net banking, wallets
- **Market:** Strong presence in Indian B2B payments
- **Integration:** RESTful API, webhook support, sandbox environment

### Payment Methods Supported

1. **UPI**
   - UPI ID
   - UPI QR code scan
   - Intent-based (mobile apps)

2. **Credit Cards**
   - Visa
   - Mastercard
   - RuPay

3. **Debit Cards**
   - All major banks
   - RuPay debit cards

4. **Net Banking**
   - 50+ banks supported

5. **Wallets**
   - PhonePe Wallet
   - Other supported wallets (if available)

6. **Cash on Delivery**
   - Payment pending until delivery
   - No upfront payment gateway interaction

### PhonePe Integration Architecture


```
┌─────────────────────────────────────────────────────────────┐
│                  PhonePe Payment Flow                       │
└─────────────────────────────────────────────────────────────┘

Backend                     PhonePe                    Frontend
   │                           │                          │
   │◄─────[1] Create Order─────┤                          │
   │                           │                          │
   ├─[2] Validate Cart         │                          │
   ├─[3] Calculate Total       │                          │
   ├─[4] Create Payment────────►                          │
   │    Request                 │                          │
   │                           │                          │
   │◄─[5] Payment URL──────────┤                          │
   │                           │                          │
   ├─[6] Return Payment URL────────────────────────────────►│
   │                           │                          │
   │                           │◄─[7] User Redirected─────┤
   │                           │                          │
   │                           ├─[8] Payment UI           │
   │                           │                          │
   │                           ├─[9] User Pays            │
   │                           │                          │
   │◄─[10] Webhook Callback────┤                          │
   │     (payment status)      │                          │
   │                           │                          │
   ├─[11] Verify Signature     │                          │
   ├─[12] Check Status API─────►                          │
   │                           │                          │
   │◄─[13] Status Confirmed────┤                          │
   │                           │                          │
   ├─[14] Create Order         │                          │
   ├─[15] Update Payment       │                          │
   ├─[16] Send Notifications   │                          │
   │                           │                          │
   │                           ├─[17] Redirect User───────►│
   │                           │      (success URL)       │
   │                           │                          │
   │◄─[18] Fetch Order Details─────────────────────────────┤
   │                           │                          │
   ├─[19] Order Data───────────────────────────────────────►│
   │                           │                          │
```

### PhonePe Configuration Requirements

**Merchant Setup:**
- PhonePe Business Account
- Merchant ID
- Salt Key (for signature generation)
- Salt Index
- API Base URL (sandbox vs production)

**Webhook Configuration:**
- Callback URL (backend endpoint)
- Success URL (frontend page)
- Failure URL (frontend page)

**Environment Variables:**
```env
PHONEPE_MERCHANT_ID=<merchant_id>
PHONEPE_SALT_KEY=<salt_key>
PHONEPE_SALT_INDEX=<salt_index>
PHONEPE_API_BASE_URL=https://api-preprod.phonepe.com/apis/pg-sandbox  # or production
PHONEPE_REDIRECT_URL=<frontend_base>/payment/callback
PHONEPE_CALLBACK_URL=<backend_base>/api/payments/webhook
```

---

## Detailed Feature Breakdown

### 1. Delivery Address Management

**Purpose:** Allow retailers to manage multiple delivery addresses for order placement.

**Backend Implementation:**

**Database Schema:**
```typescript
// Collection: addresses/{addressId}
interface DeliveryAddress {
  addressId: string;        // Document ID
  userId: string;           // Retailer UID
  label: string;            // "Home", "Office", "Warehouse", etc.
  recipientName: string;    // Receiver name
  phone: string;            // Contact number
  addressLine1: string;     // Street address
  addressLine2?: string;    // Apartment, suite, etc.
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  isDefault: boolean;       // Default delivery address
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Backend Routes:**
```
POST   /api/addresses              → Create address
GET    /api/addresses              → List user addresses
GET    /api/addresses/:id          → Get address by ID
PUT    /api/addresses/:id          → Update address
DELETE /api/addresses/:id          → Delete address
PUT    /api/addresses/:id/default  → Set as default
```

**Validation Rules:**
- User can only access their own addresses
- At least one address required before checkout
- Pincode must be 6 digits
- Phone must be valid Indian mobile number
- Only one address can be default per user


**Frontend Implementation:**

**Components:**
- `AddressSelector` - Choose address during checkout
- `AddressForm` - Add/edit address modal
- `AddressList` - Manage saved addresses
- `AddressCard` - Display single address

**User Flows:**
1. **First-time checkout:** Prompt to add delivery address
2. **Returning user:** Select from saved addresses or add new
3. **Address management:** Dedicated page to manage addresses

**Validation:**
- Real-time pincode validation
- Phone number format validation
- Required field checks
- Character limits on text fields

---

### 2. Checkout Page

**Purpose:** Final review before payment with delivery address and payment method selection.

**Page Structure:**

```
┌──────────────────────────────────────────────────────────┐
│                    CHECKOUT                              │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  [1] DELIVERY ADDRESS                                    │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Selected Address:                                  │ │
│  │ John Doe                                           │ │
│  │ 123 Main Street, Apt 4B                           │ │
│  │ Mumbai, Maharashtra 400001                         │ │
│  │ Phone: +91 9876543210                             │ │
│  │                                                    │ │
│  │ [Change Address] [Add New Address]                │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  [2] ORDER SUMMARY                                       │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Product                  Qty    Price    Total     │ │
│  │ ───────────────────────────────────────────────    │ │
│  │ Rice (25kg)              10     ₹500    ₹5,000    │ │
│  │ Wheat Flour (10kg)        5     ₹350    ₹1,750    │ │
│  │                                                    │ │
│  │ Subtotal:                              ₹6,750     │ │
│  │ Delivery Charges:                        ₹100     │ │
│  │ GST (5%):                                ₹338     │ │
│  │ ───────────────────────────────────────────────    │ │
│  │ TOTAL:                                 ₹7,188     │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  [3] PAYMENT METHOD                                     │
│  ┌────────────────────────────────────────────────────┐ │
│  │ ○ PhonePe (UPI, Cards, Net Banking, Wallets)      │ │
│  │ ○ Cash on Delivery                                 │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  [4] TERMS & CONDITIONS                                  │
│  ┌────────────────────────────────────────────────────┐ │
│  │ ☑ I agree to terms and conditions                  │ │
│  │ ☑ I confirm order details are correct              │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  [PLACE ORDER]                                           │
└──────────────────────────────────────────────────────────┘
```

**Backend API:**
```
POST /api/checkout/validate
→ Validates cart, calculates totals, checks inventory
← Returns: validated order summary or validation errors

POST /api/orders
→ Creates order with payment initiation
← Returns: order ID, payment URL (PhonePe) or confirmation (COD)
```

**Validation (Server-Side):**
- Cart not empty
- Delivery address selected and valid
- Payment method selected
- All products still available
- Inventory sufficient
- MOQ threshold met
- Price hasn't changed since cart was built
- User account active and not suspended

---

### 3. PhonePe Payment Integration

**Payment Workflow:**

#### A. Payment Initiation (Backend)
```typescript
// POST /api/payments/initiate
Request:
{
  orderId: string,
  amount: number,
  currency: "INR",
  customerInfo: {
    name: string,
    phone: string,
    email?: string
  },
  deliveryAddress: DeliveryAddress
}

Response (Success):
{
  success: true,
  paymentId: string,
  merchantTransactionId: string,
  instrumentResponse: {
    redirectInfo: {
      url: string,  // PhonePe payment URL
      method: "GET"
    }
  }
}

Response (Failure):
{
  success: false,
  code: string,
  message: string
}
```

**Server-Side Steps:**
1. Validate order exists and is in valid state for payment
2. Calculate X-VERIFY header (SHA256 hash with salt)
3. Call PhonePe `/pg/v1/pay` endpoint
4. Store payment record with status "PENDING"
5. Return payment URL to frontend

#### B. Payment Redirect (Frontend)
- Redirect user to PhonePe payment URL
- User completes payment on PhonePe platform
- PhonePe redirects back to frontend callback URL


#### C. Payment Callback/Webhook (Backend)
```typescript
// POST /api/payments/webhook
Request (PhonePe webhook):
{
  response: string  // Base64 encoded JSON
}

Decoded Response:
{
  success: true/false,
  code: string,
  message: string,
  data: {
    merchantId: string,
    merchantTransactionId: string,
    transactionId: string,
    amount: number,
    state: "COMPLETED" | "FAILED" | "PENDING",
    responseCode: string,
    paymentInstrument: {
      type: string,
      // Additional payment method specific data
    }
  }
}

Verification:
- Decode base64 response
- Verify X-VERIFY header signature
- Extract payment status

Actions:
- Update payment record
- If SUCCESS: Create order with status PENDING_APPROVAL
- If FAILURE: Mark payment failed, allow retry
- Send notification to retailer
- If order created: Send notification to wholesaler
```

**Security:**
- Always verify X-VERIFY signature
- Use idempotency keys to prevent duplicate processing
- Log all webhook calls for audit trail


#### D. Payment Status Check (Polling/Manual)
```typescript
// GET /api/payments/:merchantTransactionId/status
Response:
{
  success: true,
  code: string,
  message: string,
  data: {
    merchantId: string,
    merchantTransactionId: string,
    transactionId: string,
    amount: number,
    state: "COMPLETED" | "FAILED" | "PENDING",
    responseCode: string
  }
}
```

**Usage:**
- Frontend polls this after redirect to confirm payment
- Used as fallback if webhook fails
- Used for retry flow

#### E. Payment Retry Flow
```
Payment Failed
  ↓
Frontend: Show failure page with reason
  ↓
User clicks "Retry Payment"
  ↓
Backend: Create new payment with same order
  ↓
Redirect to PhonePe again
```

**Implementation:**
- Mark old payment as "SUPERSEDED"
- Create new payment record
- Link to same order
- Revalidate cart before retry

---

### 4. Cash on Delivery (COD) Flow

**Simplified Flow:**
```
User selects COD at checkout
  ↓
Backend creates order immediately
  ↓
Payment status: "COD_PENDING"
  ↓
Order state: PENDING_APPROVAL
  ↓
Notifications sent
```

**No PhonePe interaction needed.**

**Backend:**
```typescript
// POST /api/orders (with paymentMethod: "COD")
- Skip payment gateway
- Create order directly
- Set paymentStatus: "COD_PENDING"
- Set paymentMethod: "COD"
- state: "PENDING_APPROVAL"
```

**COD Payment Tracking (Phase 7):**
- Delivery partner collects cash
- Marks as collected in app
- Wholesaler confirms receipt
- Ledger updated

---

