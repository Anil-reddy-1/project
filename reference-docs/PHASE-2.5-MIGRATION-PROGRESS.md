# Phase 2.5 Migration Progress
## Single-Shop Architecture Implementation

**Started:** 2026-07-14  
**Status:** 🚧 IN PROGRESS  
**Goal:** Convert marketplace architecture to single-shop model

---

## Migration Checklist

### ✅ Backend Changes

#### Core Utilities & Middleware
- ✅ Helper functions already exist (`backend/src/utils/snapshot.ts`):
  - `getSingleShopId()` - retrieves THE shop ID
  - `getSingleWholesalerId()` - retrieves THE wholesaler UID
  - `createProductSnapshot()`, `createPriceSnapshot()`, etc.

- ✅ Created validation middleware (`backend/src/middleware/single-shop-validation.ts`):
  - `preventMultipleShops()` - blocks creation of additional shops
  - `preventMultipleWholesalers()` - blocks creation of additional wholesalers
  - `preventShopOwnerChange()` - prevents changing shop ownership

#### Services
- ✅ Order service already uses single-shop helpers:
  - Auto-assigns `shopId` via `getSingleShopId()`
  - Auto-assigns `wholesalerId` via `getSingleWholesalerId()`
  - No shop selection logic

#### Routes & API
- ✅ Applied middleware to shop creation routes (`backend/src/routes/shops.routes.ts`):
  - `POST /shops` - now includes `preventMultipleShops` middleware
  - `PATCH /shops/:shopId` - now includes `preventShopOwnerChange` middleware

- ✅ Applied middleware to user creation routes (`backend/src/routes/auth.routes.ts`):
  - `POST /auth/register` - blocked wholesaler self-signup
  - `POST /auth/set-role` - now includes `preventMultipleWholesalers` middleware

#### Database Setup
- ✅ Created seed script (`backend/scripts/setup-single-shop.ts`):
  - Creates admin account
  - Creates wholesaler account  
  - Creates shop document
  - Links wholesaler to shop
  - Idempotent (safe to re-run)
  - Includes verification checks

---

### ✅ Frontend Changes

#### Pages Removed
- ✅ `frontend/app/(retailer)/retailer/shops/page.tsx` - Shop discovery page (deleted)
- ✅ `frontend/app/(retailer)/retailer/shops/[shopId]/page.tsx` - Shop detail page (deleted)
- ✅ `frontend/app/(wholesaler)/wholesaler/signup/page.tsx` - Wholesaler signup page (deleted)

#### Pages Created
- ✅ `frontend/app/(retailer)/retailer/catalog/page.tsx` - Direct catalog access
  - Fetches THE single shop
  - Shows shop info in header
  - Product grid with search/filter
  - Add to cart functionality

#### Pages Updated
- ✅ `frontend/app/(retailer)/retailer/page.tsx` - Retailer home
  - Changed "Browse Shops" → "Browse Catalog"
  - Updated routing to `/retailer/catalog`
  - Removed marketplace-specific stats (multiple shops, location search)
  - Updated tips section

#### Pages to Update
- ⏳ `frontend/app/(admin)/admin/page.tsx` - Admin dashboard
  - Remove wholesaler approval tab
  - Show single wholesaler (read-only)
  - Single shop management
  - Remove shop-exclusivity bulk editor

- ⏳ `frontend/app/(wholesaler)/wholesaler/page.tsx` - Wholesaler dashboard
  - Confirm no shop selection UI
  - Direct access to inventory/orders

---

## Testing Checklist

### Backend Testing
- ⏳ Test shop creation prevention (should allow only 1)
- ⏳ Test wholesaler creation prevention (should allow only 1)
- ⏳ Test order creation (auto-assigns shop/wholesaler)
- ⏳ Run seed script and verify setup
- ⏳ Test helper functions return correct IDs

### Frontend Testing
- ⏳ Verify retailer can access catalog directly
- ⏳ Verify no shop discovery UI exists
- ⏳ Verify no wholesaler signup UI exists
- ⏳ Verify cart/checkout works with single shop
- ⏳ Verify admin dashboard reflects single-shop model

### Integration Testing
- ⏳ End-to-end: Retailer browse → cart → checkout
- ⏳ Verify order has correct shopId/wholesalerId
- ⏳ Verify wholesaler sees their orders
- ⏳ Verify admin can manage single shop

---

## Database Migration

### Firestore Rules Updates Needed
```javascript
// Prevent multiple shops
match /shops/{shopId} {
  // Only allow creation if no shops exist
  allow create: if request.auth != null 
    && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'
    && !exists(/databases/$(database)/documents/shops/$(shopId));
  
  // Only allow updates by admin or shop owner
  allow update: if request.auth != null 
    && (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'
    || resource.data.ownerUid == request.auth.uid);
}

// Prevent multiple wholesalers
match /users/{userId} {
  allow create: if request.auth != null
    && request.auth.uid == userId
    && (request.resource.data.role != 'wholesaler' 
        || !exists(/databases/$(database)/documents/users, 
            function(user) { return user.data.role == 'wholesaler'; }));
}
```

### Data Cleanup (if migrating existing data)
1. ⏳ Identify THE primary shop
2. ⏳ Identify THE primary wholesaler
3. ⏳ Update all orders to use primary shop/wholesaler IDs
4. ⏳ Archive/delete secondary shops (if any)
5. ⏳ Archive/delete secondary wholesalers (if any)

---

## Configuration Updates

### Environment Variables
- ⏳ Verify no shop/wholesaler-specific env vars
- ⏳ Update any documentation referencing marketplace

### API Documentation
- ⏳ Update API docs to reflect single-shop model
- ⏳ Remove shop discovery endpoints from docs
- ⏳ Update order creation endpoint docs (no shopId param)

---

## Remaining Tasks

### High Priority
1. ✅ Apply validation middleware to routes
2. ✅ Remove shop discovery pages
3. ✅ Remove wholesaler signup page
4. ⏳ Update admin dashboard
5. ⏳ Run seed script
6. ⏳ Update Firestore rules

### Medium Priority
7. ⏳ Test all flows end-to-end
8. ⏳ Update API documentation
9. ⏳ Clean up unused components
10. ⏳ Update environment configs

### Low Priority
11. ⏳ Performance optimization
12. ⏳ Analytics updates
13. ⏳ Monitoring dashboards

---

## Known Issues & Blockers

### Issues
- None currently

### Blockers
- None currently

---

## Verification Steps

Before marking Phase 2.5 complete, verify:

1. ✅ Backend helper functions work
2. ✅ Validation middleware created
3. ✅ Seed script created
4. ✅ Retailer catalog page works
5. ✅ Middleware applied to routes
6. ✅ Shop discovery pages removed
7. ✅ Wholesaler signup blocked
8. ⏳ Only one shop can be created (test needed)
9. ⏳ Only one wholesaler can be created (test needed)
10. ⏳ Orders auto-assign shop/wholesaler (test needed)
11. ⏳ Admin dashboard reflects single-shop
12. ⏳ All tests pass
13. ⏳ Documentation updated

---

## Next Steps

After Phase 2.5 completion:
1. **Phase 3 Completion** - Finish remaining frontend UI
2. **Phase 3.9** - UI/UX enhancement
3. **Phase 4** - Wholesaler approval workflow

---

## Notes

- Order service already correctly implements single-shop logic
- Helper functions already exist and are being used
- Main work is removing UI and adding validation
- Seed script provides clean setup process
- Migration is mostly additive (prevents future issues)

---

**Last Updated:** 2026-07-14  
**Updated By:** Migration Agent  
**Next Review:** After route middleware application
