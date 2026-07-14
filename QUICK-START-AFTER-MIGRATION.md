# Quick Start Guide - After Phase 2.5 Migration

**For:** Next developer continuing the project  
**Status:** Core migration complete, ready for testing and admin dashboard

---

## TL;DR - What Changed

Your platform is now a **single-shop system** (not a marketplace):
- ONE shop (your business)
- ONE wholesaler (the owner)
- Retailers browse your catalog directly (no shop discovery)
- Orders auto-assign to your shop

---

## First Things First - Initialize the System

### 1. Run the Seed Script (Required!)

This creates your admin, wholesaler, and shop:

```bash
cd backend
npx ts-node scripts/setup-single-shop.ts
```

**What it creates:**
- Admin account: `admin@wholesaleplatform.com` / `Admin@123`
- Wholesaler account: `wholesaler@business.com` / `Wholesaler@123`
- Shop: "Wholesale Mart" in Mumbai

**Configure before running:**
Edit `backend/scripts/setup-single-shop.ts` and update the `CONFIG` object with your details:
```typescript
const CONFIG = {
  admin: {
    email: 'your-admin@email.com',
    password: 'YourSecurePassword',
    name: 'Your Name',
    phone: '+919876543210',
  },
  wholesaler: {
    email: 'wholesaler@yourbusiness.com',
    password: 'SecurePassword',
    name: 'Business Owner Name',
    phone: '+919876543211',
  },
  shop: {
    name: 'Your Shop Name',
    address: 'Your Business Address',
    lat: 19.0760,  // Your location coordinates
    lng: 72.8777,
    // ... etc
  },
};
```

### 2. Verify Setup

After running seed script, check Firestore:
- ✅ One document in `shops/` collection
- ✅ One user with `role: "wholesaler"` in `users/` collection
- ✅ One user with `role: "admin"` in `users/` collection

---

## What Works Right Now

### ✅ Backend (100% Complete)
- Shop/wholesaler creation prevention
- Auto-assignment of orders to THE shop
- Auth routes updated (no wholesaler self-signup)
- Helper functions: `getSingleShopId()`, `getSingleWholesalerId()`

### ✅ Retailer Frontend (90% Complete)
- Direct catalog access: `/retailer/catalog`
- Home page updated
- Old shop discovery pages removed
- Cart and checkout (from Phase 3)

### ⏳ Admin Frontend (Needs Update)
- Current admin dashboard still has marketplace features
- Needs: Single wholesaler view, single shop management

---

## Quick Testing Guide

### Test 1: Catalog Access (2 mins)
```
1. Start frontend: npm run dev
2. Login as retailer (create account if needed)
3. Navigate to /retailer/catalog
4. Should see: shop header + product grid
5. Try: search, filters, add to cart
```

### Test 2: Shop Creation Prevention (1 min)
```bash
# Should fail (403 Forbidden)
curl -X POST http://localhost:5000/api/shops \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Second Shop",
    "address": "123 Street",
    "lat": 19.0,
    "lng": 72.0,
    "category": "General",
    "operatingHours": {"days": ["Monday"], "open": "09:00", "close": "18:00"},
    "moqThreshold": 5000
  }'

# Expected response:
{
  "success": false,
  "message": "Cannot create multiple shops...",
  "code": "SINGLE_SHOP_CONSTRAINT"
}
```

### Test 3: Order Placement (3 mins)
```
1. As retailer, add items to cart
2. Go to checkout
3. Select delivery address
4. Choose payment method (PhonePe or COD)
5. Place order
6. Check Firestore `orders/` collection
7. Verify: shopId and wholesalerId are auto-assigned
```

---

## Key Code Locations

### Backend:
```
src/
  middleware/
    single-shop-validation.ts     ← NEW: Prevention middleware
  
  utils/
    snapshot.ts                    ← Helper functions (getSingleShopId, etc.)
  
  routes/
    shops.routes.ts                ← UPDATED: Has prevention middleware
    auth.routes.ts                 ← UPDATED: Blocks wholesaler self-signup
  
  services/
    order.service.ts               ← Already uses helper functions
  
scripts/
  setup-single-shop.ts             ← NEW: System initialization
```

### Frontend:
```
app/
  (retailer)/
    retailer/
      catalog/
        page.tsx                   ← NEW: Direct catalog (replaces shops/)
      page.tsx                     ← UPDATED: Routes to /catalog
      
  (wholesaler)/
    wholesaler/
      # signup/ folder deleted     ← REMOVED
      
  (admin)/
    admin/
      page.tsx                     ← NEEDS UPDATE
```

---

## What to Work on Next

### Priority 1: Admin Dashboard (30-60 mins)
File: `frontend/app/(admin)/admin/page.tsx`

**Remove:**
- Wholesaler approval section (no self-signup anymore)
- Shop verification workflow
- Multi-shop features

**Add:**
- Single wholesaler view (read-only)
- Single shop management
- Shop edit form

### Priority 2: Testing (30 mins)
- Test shop creation prevention ✓
- Test wholesaler creation prevention ✓
- Test order auto-assignment ✓
- Test catalog functionality ✓
- Manual testing checklist

### Priority 3: Phase 3 Completion
Continue with remaining frontend UI:
- Checkout flow improvements
- Payment pages polish
- Order management UI

---

## Common Issues & Solutions

### Issue: "Shop not found" in catalog
**Solution:** Run seed script to create the shop

### Issue: Orders not auto-assigning shop/wholesaler
**Solution:** Check that `getSingleShopId()` and `getSingleWholesalerId()` are being called in order service

### Issue: Can still create multiple shops
**Solution:** Verify middleware is applied to route:
```typescript
router.post('/',
  verifyFirebaseToken,
  requireRole('wholesaler'),
  validateShopCreation,
  preventMultipleShops,  // ← This must be here
  async (req, res) => { ... }
);
```

### Issue: Wholesaler self-signup still works
**Solution:** Check auth.routes.ts has the block:
```typescript
if (requestedRole === 'wholesaler') {
  return res.status(403).json({
    message: 'Wholesaler accounts must be created by admin'
  });
}
```

---

## Important Helper Functions

### Getting Shop ID:
```typescript
import { getSingleShopId } from '../utils/snapshot';

const shopId = await getSingleShopId();
// Returns: The ID of THE single shop
// Throws: Error if no shop exists
```

### Getting Wholesaler ID:
```typescript
import { getSingleWholesalerId } from '../utils/snapshot';

const wholesalerId = await getSingleWholesalerId();
// Returns: The UID of THE single wholesaler
// Throws: Error if no wholesaler exists
```

### Creating Orders:
```typescript
// Order service automatically uses helpers:
const order = await orderService.createOrder(
  retailerId,
  items,
  deliveryAddress,
  paymentMethod
);

// Order will have:
order.shopId        // Auto-assigned via getSingleShopId()
order.wholesalerId  // Auto-assigned via getSingleWholesalerId()
```

---

## Documentation

**Main References:**
- `reference-docs/PHASE-2.5-COMPLETED.md` - Full migration summary
- `reference-docs/SINGLE-SHOP-ARCHITECTURE.md` - Architecture guide
- `reference-docs/schema.md` - Database schema with constraints
- `MIGRATION-SUMMARY.md` - Quick overview (this doc's companion)

**Implementation Guides:**
- `reference-docs/PHASE-3-IMPLEMENTATION-PLAN.md` - Current phase
- `reference-docs/app-flow.md` - Updated user flows
- `reference-docs/PRD.md` - Product requirements

---

## Environment Setup

### Backend:
```bash
cd backend
npm install
npm run dev  # Starts on port 5000
```

### Frontend:
```bash
cd frontend
npm install
npm run dev  # Starts on port 3000
```

### Firestore:
- Emulator: `firebase emulators:start`
- Production: Configure in `backend/src/config/env.ts`

---

## Quick Commands Cheat Sheet

```bash
# Initialize system
cd backend && npx ts-node scripts/setup-single-shop.ts

# Start backend
cd backend && npm run dev

# Start frontend
cd frontend && npm run dev

# Run tests (when created)
cd backend && npm test
cd frontend && npm test

# Check migration status
cat reference-docs/PHASE-2.5-MIGRATION-PROGRESS.md

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Firestore indexes
firebase deploy --only firestore:indexes
```

---

## Deployment Checklist

Before deploying to production:

1. [ ] Run seed script in production environment
2. [ ] Verify only one shop exists
3. [ ] Verify only one wholesaler exists
4. [ ] Test shop creation prevention
5. [ ] Test wholesaler creation prevention
6. [ ] Test order placement end-to-end
7. [ ] Update environment variables
8. [ ] Deploy Firestore rules
9. [ ] Deploy Firestore indexes
10. [ ] Monitor logs for errors

---

## Getting Help

**Documentation Issues:**
- Check `reference-docs/` folder
- Migration details in `PHASE-2.5-COMPLETED.md`

**Code Issues:**
- Check helper functions in `backend/src/utils/snapshot.ts`
- Check middleware in `backend/src/middleware/single-shop-validation.ts`

**Architecture Questions:**
- See `SINGLE-SHOP-ARCHITECTURE.md`
- See `schema.md` for data model

---

## You're Ready! 🚀

The core migration is complete. Just:
1. Run the seed script
2. Test the functionality
3. Update admin dashboard
4. Continue with Phase 3

Good luck! The hard part (architecture migration) is done. 😊
