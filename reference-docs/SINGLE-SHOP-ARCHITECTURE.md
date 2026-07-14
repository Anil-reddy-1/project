# Single-Shop Architecture Migration
## From Marketplace to Single Wholesaler Platform

**Date:** 2026-07-14  
**Status:** ARCHITECTURAL CHANGE IN PROGRESS  
**Impact:** BREAKING - Requires Phase 2 Refactoring

---

## Executive Summary

The platform is being migrated from a **multi-wholesaler marketplace** to a **single wholesaler, single shop** B2B order management platform.

### What This Means

| Aspect | Before (Marketplace) | After (Single Shop) |
|---|---|---|
| **Wholesalers** | Multiple wholesalers can register | ONE wholesaler only (business owner) |
| **Shops** | Multiple shops, retailers discover/choose | ONE shop only (no discovery needed) |
| **Retailer Flow** | Browse shops → Select shop → Order | Direct access to catalog → Order |
| **Shop Discovery** | Geolocation search, filtering, selection | **REMOVED** - No discovery UI |
| **Architecture** | Multi-tenant marketplace | Single-tenant B2B platform |

---

## Business Model

### Old Model (Phase 0-2): Marketplace
- Platform connects multiple retailers with multiple wholesalers
- Retailers search and discover shops by location/category
- Each shop managed independently
- Competitive marketplace dynamics

### New Model (Phase 3+): Single Business Platform
- ONE business owns the platform
- ONE wholesaler account (the business owner)
- ONE shop serving multiple retailers
- Order management and delivery system for a single wholesale business

**Analogy:** Moving from "Amazon Marketplace" to "Costco B2B" — one supplier, many buyers.

---

## Architectural Constraints

### Hard Rules (MUST be enforced)

1. **Single Wholesaler**
   - Exactly ONE user with `role: "wholesaler"`
   - No wholesaler registration flow
   - No wholesaler approval workflow
   - Wholesaler account created via admin seed/script
   - Utilities: `getSingleWholesalerId()` fetches the one wholesaler

2. **Single Shop**
   - Exactly ONE document in `shops` collection
   - No shop discovery UI
   - No shop selection logic
   - Shop created during platform setup
   - Utilities: `getSingleShopId()` fetches the one shop

3. **Retailer Access**
   - Retailers access catalog directly (no shop selection)
   - All orders automatically reference the single shop
   - No "shop switching" in cart

4. **Future Scalability**
   - Code should be modular to allow multi-shop expansion
   - Use helper functions (`getSingleShopId`) not hardcoded IDs
   - But implementation must enforce single-shop for now

---

## What Must Be Removed/Changed

### Phase 2 Features to Remove

#### 1. Retailer Shop Discovery (`/retailer/shops`)
**Current:** Retailers can search shops by location, category, distance
**Change:** Remove entirely or redirect to catalog

**Files Affected:**
- `frontend/app/(retailer)/retailer/shops/page.tsx` - DELETE or stub
- Shop discovery API calls - REMOVE
- Geolocation search UI - REMOVE

#### 2. Wholesaler Self-Registration
**Current:** Wholesalers can self-register (pending approval)
**Change:** Remove self-registration flow, admin-provision only

**Files Affected:**
- `frontend/app/(wholesaler)/wholesaler/signup/page.tsx` - DELETE
- Wholesaler registration API - REMOVE
- Admin approval workflow - REMOVE (no pending wholesalers)

#### 3. Shop Verification System
**Current:** Admin verifies/rejects shops
**Change:** Single shop is always verified (set during setup)

**Files Affected:**
- `frontend/app/(admin)/admin/page.tsx` - Remove "Shops" tab
- Shop verification routes - Keep backend for future, remove UI

#### 4. Multiple Shop Support in Code
**Current:** `shopId` passed around as variable
**Change:** Use `getSingleShopId()` everywhere

**Files Affected:**
- All order creation logic
- All catalog display logic
- Cart management

---

## New Implementation Patterns

### 1. Getting the Single Shop

**Backend (e:\\project\\backend\\src\\utils\\snapshot.ts):**
```typescript
// Already implemented ✅
export async function getSingleShopId(): Promise<string> {
  const db = adminDb();
  const shopsSnapshot = await db.collection('shops').limit(1).get();
  
  if (shopsSnapshot.empty) {
    throw new Error('No shop found in system. Please create a shop first.');
  }
  
  return shopsSnapshot.docs[0].id;
}
```

**Frontend Usage:**
```typescript
// Don't fetch shops list - just use the single shop
const SHOP_ID = await getSingleShopId(); // Server-side
// Or fetch shop directly without discovery
```

### 2. Getting the Single Wholesaler

**Backend (e:\\project\\backend\\src\\utils\\snapshot.ts):**
```typescript
// Already implemented ✅
export async function getSingleWholesalerId(): Promise<string> {
  const db = adminDb();
  const usersSnapshot = await db
    .collection('users')
    .where('role', '==', 'wholesaler')
    .limit(1)
    .get();
  
  if (usersSnapshot.empty) {
    throw new Error('No wholesaler found in system.');
  }
  
  return usersSnapshot.docs[0].id;
}
```

### 3. Retailer Catalog Access (New Flow)

**Before:** 
```
/retailer/shops → /retailer/shops/[shopId]
```

**After:**
```
/retailer/catalog (direct access to products)
```

**Implementation:**
```typescript
// Retailer catalog page - no shop selection
export default async function RetailerCatalogPage() {
  const shopId = await getSingleShopId();
  const items = await getShopItems(shopId);
  
  return <CatalogView items={items} />;
}
```

### 4. Order Creation (Simplified)

**Before:**
```typescript
// Retailer selects shop, then orders
createOrder(retailerId, shopId, items, ...);
```

**After:**
```typescript
// Shop ID automatically determined
const shopId = await getSingleShopId();
const wholesalerId = await getSingleWholesalerId();
createOrder(retailerId, items, deliveryAddress, paymentMethod);
```

---

## Migration Steps

### Phase 1: Update Documentation ✅ (Current)
- [x] Create this document
- [ ] Update PRD.md
- [ ] Update schema.md
- [ ] Update app-flow.md
- [ ] Update progress.md
- [ ] Update implementation-plan.md

### Phase 2: Backend Verification
- [x] Verify `getSingleShopId()` implemented
- [x] Verify `getSingleWholesalerId()` implemented
- [x] Verify order service uses these helpers
- [ ] Remove wholesaler registration endpoints
- [ ] Add validation: reject if multiple shops exist

### Phase 3: Frontend Refactoring
- [ ] Remove `/retailer/shops` discovery page
- [ ] Create `/retailer/catalog` direct access page
- [ ] Update cart to not pass shopId
- [ ] Remove wholesaler signup page
- [ ] Update admin dashboard (remove shop verification)
- [ ] Update all API calls to not expect shop selection

### Phase 4: Database Cleanup
- [ ] Ensure only ONE shop document exists
- [ ] Ensure only ONE wholesaler user exists
- [ ] Add Firestore rules preventing multiple shops
- [ ] Seed script for initial setup

### Phase 5: Testing
- [ ] Verify retailer cannot discover shops
- [ ] Verify retailer can browse catalog without selection
- [ ] Verify orders automatically use single shop
- [ ] Verify no shop-switching possible

---

## Implementation Checklist

### Backend Changes

- [x] **utils/snapshot.ts** - `getSingleShopId()` and `getSingleWholesalerId()` exist
- [x] **services/order.service.ts** - Uses helper functions ✅
- [ ] **routes/shops.routes.ts** - Add validation: prevent multiple shop creation
- [ ] **routes/auth.routes.ts** - Remove wholesaler self-registration
- [ ] **middleware/validateSingleShop.ts** - NEW: Middleware to enforce single shop

### Frontend Changes

#### Remove
- [ ] `app/(retailer)/retailer/shops/page.tsx` - Shop discovery
- [ ] `app/(wholesaler)/wholesaler/signup/page.tsx` - Wholesaler signup
- [ ] `app/(admin)/admin/page.tsx` - Shops verification tab

#### Create New
- [ ] `app/(retailer)/retailer/catalog/page.tsx` - Direct catalog access
- [ ] `app/(retailer)/retailer/page.tsx` - Redirect to catalog

#### Update
- [ ] `app/(retailer)/retailer/shops/[shopId]/page.tsx` - Rename to catalog
- [ ] All cart components - Remove shop selection
- [ ] All order components - Assume single shop
- [ ] Checkout flow - Auto-determine shop

### Database Changes

- [ ] **Firestore Rules** - Add rules preventing multiple shops/wholesalers
- [ ] **Seed Script** - Create initial shop and wholesaler
- [ ] **Migration Script** - If multiple shops exist, merge or select primary

---

## API Changes

### Removed Endpoints
```
❌ GET /shops - No shop discovery
❌ GET /shops/nearby - No geolocation search
❌ POST /auth/register-wholesaler - No wholesaler signup
❌ PATCH /shops/:id/verify - No verification needed (admin UI only)
```

### Modified Endpoints
```
✓ GET /items - Now returns THE shop's items (no shopId needed)
✓ POST /orders - shopId determined automatically
✓ GET /shop - NEW: Get the single shop details (public)
```

---

## Retailer User Flow (Updated)

### Old Flow (Marketplace)
```
Login → Shop Discovery → Select Shop → Browse Catalog → Cart → Checkout
```

### New Flow (Single Shop)
```
Login → Browse Catalog → Cart → Checkout
```

**Key Change:** No shop selection step. Retailers immediately see the catalog.

---

## Admin Responsibilities

### Platform Setup (One-time)
1. Create the single shop via admin interface or seed script
2. Create the single wholesaler account (or seed with initial credentials)
3. Set shop as verified
4. Upload initial catalog

### Ongoing Operations
- User management (retailers, delivery partners)
- Order monitoring and dispute resolution
- Platform configuration
- ~~Shop verification~~ (removed)
- ~~Wholesaler approval~~ (removed)

---

## Benefits of Single-Shop Model

1. **Simpler UX** - Retailers don't choose shops, just order
2. **Faster Checkout** - No shop switching friction
3. **Clearer Ownership** - One business controls everything
4. **Easier Operations** - No marketplace coordination
5. **Lower Complexity** - No multi-tenant concerns

---

## Risks & Considerations

### 1. Data Migration
**Risk:** Existing installations may have multiple shops  
**Solution:** Migration script to select primary shop, archive others

### 2. Scalability Limit
**Risk:** Client wants multiple locations later  
**Solution:** Code kept modular with helper functions for easy expansion

### 3. Retailer Confusion
**Risk:** Retailers expect shop selection (if Phase 2 was deployed)  
**Solution:** Clear messaging, redirect discovery page to catalog

### 4. Business Model Change
**Risk:** Moving from marketplace to single-supplier changes revenue model  
**Solution:** Document new pricing/commission structure

---

## Testing Strategy

### Unit Tests
- `getSingleShopId()` returns exactly one shop
- `getSingleWholesalerId()` returns exactly one wholesaler
- Order creation uses correct helper functions

### Integration Tests
- Retailer cannot access shop discovery
- Orders automatically reference single shop
- Multiple shop creation is rejected

### Manual Tests
- Retailer flow: Login → Catalog → Order (no shop selection)
- Wholesaler flow: Manage catalog for THE shop
- Admin flow: No shop verification UI visible

---

## Rollback Plan

If single-shop model must be reversed:

1. Re-enable shop discovery pages
2. Re-enable wholesaler registration
3. Remove single-shop validation
4. Update order creation to accept shopId parameter
5. Restore admin shop verification UI

All removed code should be git-tagged before deletion for easy restoration.

---

## Questions & Answers

**Q: Can we have multiple shops in the future?**  
A: Yes, code uses `getSingleShopId()` helper that can be replaced with shop selection logic.

**Q: What if a client wants multiple locations?**  
A: Create separate instances or refactor to multi-shop (modular code allows this).

**Q: How do retailers know which wholesaler they're ordering from?**  
A: Shop details shown prominently on catalog page (name, address, contact).

**Q: Can admin create additional shops?**  
A: Technically possible but should be blocked by validation. Only one shop allowed.

**Q: What about shop-exclusive delivery partners?**  
A: Still supported. All partners are either exclusive to THE shop or open-pool.

---

## Status: In Progress

- [x] Phase 3 backend built with single-shop architecture
- [x] Helper functions implemented
- [ ] Documentation updated (this document created)
- [ ] Frontend refactoring pending
- [ ] Phase 2 cleanup pending

**Next Action:** Update core reference documents (PRD, schema, app-flow) to reflect single-shop model.
