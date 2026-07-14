# Phase 3: Next Steps Guide
## Completing the Remaining Frontend & Testing Tasks

**Current Status:** Backend 100% Complete, Frontend 25% Complete  
**Remaining:** 8 tasks (~20-30 hours of work)  
**Priority Order:** UI Components → State Hooks → Testing

---

## Quick Task Overview

| # | Task | Priority | Est. Time | Status |
|---|---|---|---|---|
| 16 | Checkout page and components | HIGH | 4-6h | ⏳ TODO |
| 17 | Payment flow pages | HIGH | 3-4h | ⏳ TODO |
| 18 | Order management pages | HIGH | 4-5h | ⏳ TODO |
| 19 | Loading/error state components | MEDIUM | 2-3h | ⏳ TODO |
| 20 | State management hooks | MEDIUM | 2-3h | ⏳ TODO |
| 21 | Wholesaler order view pages | MEDIUM | 3-4h | ⏳ TODO |
| 23 | Backend tests | MEDIUM | 4-6h | ⏳ TODO |
| 24 | Manual testing | HIGH | 3-4h | ⏳ TODO |

**Total Estimated Time:** 25-35 hours

---

## Implementation Order

### Phase 1: Core UI (Tasks #16, #17, #19)
Start here - these enable basic order placement flow

1. **Loading/Error States First** (Task #19)
   - Create reusable skeleton loaders
   - Build empty states
   - Error display components
   - **Why first?** Other pages will need these

2. **Checkout Page** (Task #16)
   - Cart summary display
   - Address selection/creation
   - Payment method selection
   - Place order button
   - **Enables:** Complete checkout flow

3. **Payment Flow Pages** (Task #17)
   - Callback handler (PhonePe redirect)
   - Success page
   - Failure page
   - Pending/processing page
   - **Enables:** End-to-end payment flow

### Phase 2: Order Management (Tasks #18, #20)

4. **State Management Hooks** (Task #20)
   - useCheckout hook
   - useOrders hook
   - useAddresses hook
   - **Why before pages?** Pages will use these hooks

5. **Order Management Pages** (Task #18)
   - Order list page
   - Order details page
   - Order status badge
   - Order timeline
   - **Enables:** Order tracking

### Phase 3: Wholesaler & Testing (Tasks #21, #23, #24)

6. **Wholesaler Order Views** (Task #21)
   - Orders list for wholesaler
   - Order details view
   - **Note:** Approval actions disabled (Phase 4)

7. **Backend Tests** (Task #23)
   - Service unit tests
   - API integration tests

8. **Manual Testing** (Task #24)
   - End-to-end flow testing
   - PhonePe sandbox testing
   - Edge case verification

---

## Detailed Implementation Guides

### Task #19: Loading/Error State Components (2-3 hours)

**Priority:** Do this FIRST - all other pages need these

#### Files to Create:

**1. `components/shared/LoadingSpinner.tsx`**
```typescript
export default function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-16 w-16',
  };

  return (
    <div className="flex items-center justify-center">
      <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]}`}></div>
    </div>
  );
}
```

**2. `components/shared/CheckoutSkeleton.tsx`**
```typescript
export default function CheckoutSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 bg-gray-200 rounded w-1/4"></div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="h-20 w-20 bg-gray-200 rounded"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**3. `components/shared/OrderListSkeleton.tsx`**
```typescript
export default function OrderListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="animate-pulse border rounded-lg p-4">
          <div className="flex justify-between items-start mb-4">
            <div className="space-y-2 flex-1">
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </div>
            <div className="h-8 w-24 bg-gray-200 rounded"></div>
          </div>
          <div className="flex justify-between items-center">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-6 bg-gray-200 rounded w-1/6"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

**4. `components/shared/EmptyState.tsx`**
```typescript
interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export default function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      {icon && <div className="mb-4 flex justify-center text-gray-400">{icon}</div>}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
```

**5. `components/shared/ErrorDisplay.tsx`**
```typescript
interface ErrorDisplayProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export default function ErrorDisplay({
  title = 'Something went wrong',
  message,
  onRetry,
}: ErrorDisplayProps) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
      <div className="mb-2 text-red-600">
        <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
```

---

### Task #16: Checkout Page (4-6 hours)

**Priority:** Do this SECOND (after loading states)

#### Key Components:

**1. Main Checkout Page:** `app/(retailer)/retailer/checkout/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createOrder } from '@/lib/api/orders';
import { getAddresses } from '@/lib/api/addresses';
import CheckoutSkeleton from '@/components/shared/CheckoutSkeleton';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import CartSummary from '@/components/checkout/CartSummary';
import AddressSelection from '@/components/checkout/AddressSelection';
import PaymentMethodSelection from '@/components/checkout/PaymentMethodSelection';

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cart state (load from localStorage or context)
  const [cart, setCart] = useState<any[]>([]);
  
  // Form state
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'PHONEPE' | 'COD'>('PHONEPE');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Pricing state
  const [subtotal, setSubtotal] = useState(0);
  const [deliveryCharges] = useState(50); // From config
  const [tax] = useState(0); // From config
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadCheckoutData();
  }, [user]);

  useEffect(() => {
    // Calculate totals
    const sub = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    setSubtotal(sub);
    setTotal(sub + deliveryCharges + tax);
  }, [cart, deliveryCharges, tax]);

  const loadCheckoutData = async () => {
    try {
      setLoading(true);
      
      // Load cart from localStorage
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }

      // Load addresses
      if (user?.uid) {
        const result = await getAddresses(user.uid);
        setAddresses(result.addresses);
        
        // Auto-select default address
        const defaultAddr = result.addresses.find(a => a.isDefault);
        if (defaultAddr) {
          setSelectedAddress(defaultAddr);
        }
      }
    } catch (err) {
      setError('Failed to load checkout data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      alert('Please select a delivery address');
      return;
    }

    if (!termsAccepted) {
      alert('Please accept the terms and conditions');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await createOrder({
        items: cart.map(item => ({
          itemId: item.id,
          quantity: item.quantity,
        })),
        deliveryAddress: {
          line1: selectedAddress.line1,
          line2: selectedAddress.line2,
          city: selectedAddress.city,
          state: selectedAddress.state,
          pincode: selectedAddress.pincode,
          phone: selectedAddress.phone,
          landmark: selectedAddress.landmark,
        },
        paymentMethod,
        saveAddress: false,
      });

      if (response.success) {
        // Clear cart
        localStorage.removeItem('cart');

        if (response.data.phonepeRedirectUrl) {
          // Redirect to PhonePe
          window.location.href = response.data.phonepeRedirectUrl;
        } else {
          // COD order - redirect to success
          router.push(`/retailer/payment/success?orderId=${response.data.orderId}`);
        }
      } else {
        setError(response.message || 'Failed to place order');
      }
    } catch (err: any) {
      console.error('Order placement failed:', err);
      setError(err.message || 'Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <CheckoutSkeleton />
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmptyState
          title="Your cart is empty"
          description="Add items to your cart to proceed with checkout"
          actionLabel="Browse Products"
          onAction={() => router.push('/retailer/shops')}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      {error && (
        <div className="mb-6">
          <ErrorDisplay message={error} onRetry={() => setError(null)} />
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column - Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cart Summary */}
          <CartSummary items={cart} />

          {/* Address Selection */}
          <AddressSelection
            addresses={addresses}
            selectedAddress={selectedAddress}
            onSelectAddress={setSelectedAddress}
            onAddressesChange={setAddresses}
          />

          {/* Payment Method */}
          <PaymentMethodSelection
            selected={paymentMethod}
            onSelect={setPaymentMethod}
          />

          {/* Terms */}
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="terms"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-1"
            />
            <label htmlFor="terms" className="text-sm text-gray-700">
              I agree to the{' '}
              <a href="/terms" className="text-blue-600 hover:underline">
                terms and conditions
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-blue-600 hover:underline">
                privacy policy
              </a>
            </label>
          </div>
        </div>

        {/* Right Column - Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white border rounded-lg p-6 sticky top-4">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({cart.length} items)</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery Charges</span>
                <span>₹{deliveryCharges.toFixed(2)}</span>
              </div>
              {tax > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Tax</span>
                  <span>₹{tax.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t pt-3">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={submitting || !selectedAddress || !termsAccepted}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {submitting ? 'Placing Order...' : 'Place Order'}
            </button>

            <p className="text-xs text-gray-500 mt-4 text-center">
              {paymentMethod === 'COD' 
                ? 'You will pay cash on delivery' 
                : 'You will be redirected to PhonePe for payment'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**2. Cart Summary Component:** `components/checkout/CartSummary.tsx`

```typescript
interface CartSummaryProps {
  items: any[];
}

export default function CartSummary({ items }: CartSummaryProps) {
  return (
    <div className="bg-white border rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Items in Your Cart</h2>
      
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex gap-4">
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="h-20 w-20 object-cover rounded"
              />
            )}
            <div className="flex-1">
              <h3 className="font-medium">{item.name}</h3>
              <p className="text-sm text-gray-600">
                Quantity: {item.quantity} × ₹{item.price}
              </p>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                ₹{(item.quantity * item.price).toFixed(2)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Continue with AddressSelection and PaymentMethodSelection components...**

---

### Task #17: Payment Flow Pages (3-4 hours)

Create these pages in order:

1. **Callback Handler** - `app/(retailer)/retailer/payment/callback/page.tsx`
2. **Success Page** - `app/(retailer)/retailer/payment/success/page.tsx`
3. **Failure Page** - `app/(retailer)/retailer/payment/failure/page.tsx`
4. **Pending Page** - `app/(retailer)/retailer/payment/pending/page.tsx`

See PHASE-3-COMPLETION-SUMMARY.md for complete code examples.

---

### Task #20: State Management Hooks (2-3 hours)

**Create these hooks before Task #18:**

1. **`hooks/useCheckout.ts`** - Manages checkout flow state
2. **`hooks/useOrders.ts`** - Manages order list and details
3. **`hooks/useAddresses.ts`** - Manages address CRUD operations

---

## Testing Guide

### Backend API Testing (Before Frontend)

**Test with Postman/curl:**

```bash
# 1. Create Order (COD)
curl -X POST http://localhost:3001/api/orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"itemId": "item123", "quantity": 10}],
    "deliveryAddress": {
      "line1": "123 Main St",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "phone": "9876543210"
    },
    "paymentMethod": "COD"
  }'

# 2. List Orders
curl http://localhost:3001/api/orders \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Get Order Details
curl http://localhost:3001/api/orders/ORDER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### PhonePe Sandbox Testing

**Test Credentials:**
- Use PhonePe sandbox environment
- Test cards provided by PhonePe
- Verify webhook signature

### Manual Testing Checklist

**COD Flow:**
- [ ] Add items to cart
- [ ] Select address
- [ ] Choose COD
- [ ] Place order
- [ ] Verify email received
- [ ] Check order in database
- [ ] Verify status is PENDING_APPROVAL

**PhonePe Flow:**
- [ ] Choose PhonePe payment
- [ ] Redirect to PhonePe works
- [ ] Complete sandbox payment
- [ ] Callback handling works
- [ ] Order created successfully
- [ ] Email notification sent

**Edge Cases:**
- [ ] Cart validation (insufficient stock)
- [ ] MOQ not met error
- [ ] Price change during checkout
- [ ] Payment timeout
- [ ] Network interruption
- [ ] Duplicate payment prevention

---

## Deployment Checklist

Before going to production:

### Backend
- [ ] Set PhonePe production credentials
- [ ] Configure production webhook URL
- [ ] Test webhook with PhonePe production
- [ ] Set up SSL certificate
- [ ] Configure email service (Brevo production)
- [ ] Deploy Firestore security rules
- [ ] Verify Firestore indexes
- [ ] Set up monitoring and alerts

### Frontend
- [ ] Update API_BASE_URL to production
- [ ] Test payment redirect flow
- [ ] Verify responsive design
- [ ] Check all loading states
- [ ] Test error handling
- [ ] Verify accessibility
- [ ] Cross-browser testing

### Final Testing
- [ ] End-to-end COD flow
- [ ] End-to-end PhonePe flow (production)
- [ ] Payment retry functionality
- [ ] Order cancellation
- [ ] Email notifications
- [ ] Webhook delivery
- [ ] Load testing (if needed)

---

## Common Issues & Solutions

### Issue: "Payment verification failed"
**Solution:** Check PhonePe checksum calculation and salt key configuration

### Issue: "Order not created after successful payment"
**Solution:** Check webhook URL configuration and signature verification

### Issue: "Email not received"
**Solution:** Verify Brevo API key and check spam folder

### Issue: "Cart validation errors"
**Solution:** Ensure product IDs are correct and stock is available

---

## Quick Start Commands

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev

# Run tests
cd backend
npm test

# Check TypeScript
cd frontend
npm run type-check
```

---

## Support Resources

- **Implementation Plan:** PHASE-3-IMPLEMENTATION-PLAN.md
- **Completion Status:** PHASE-3-COMPLETION-SUMMARY.md
- **Quick Reference:** PHASE-3-QUICK-REFERENCE.md
- **Progress Tracking:** progress.md
- **PhonePe Docs:** https://developer.phonepe.com/

---

**Last Updated:** 2026-07-13  
**Status:** Backend Complete, Frontend 25%  
**Next Priority:** Task #19 (Loading States) → Task #16 (Checkout) → Task #17 (Payment Pages)

