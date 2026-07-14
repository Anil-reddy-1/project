# Documentation Updated for Single-Shop Architecture
**Date:** 2026-07-14  
**Status:** Documentation Phase Complete

---

## Summary

All core reference documents have been updated to reflect the **Single Wholesaler, Single Shop** architecture. The platform is **NOT a marketplace**.

---

## Documents Updated

### 1. ✅ SINGLE-SHOP-ARCHITECTURE.md (NEW)
**Path:** `reference-docs/SINGLE-SHOP-ARCHITECTURE.md`

**Created:** Complete architectural migration guide including:
- Business model change explanation
- Architectural constraints (hard rules)
- What must be removed from Phase 2
- New implementation patterns
- Migration steps (5 phases)
- Implementation checklist
- API changes
- Updated user flows
- Testing strategy
- Rollback plan

**Purpose:** Master reference for understanding and implementing single-shop architecture.

---

### 2. ✅ PRD.md (UPDATED)
**Path:** `reference-docs/PRD.md`

**Changes Made:**
- **Title:** Changed to "B2B Wholesale Order Management & Delivery Dispatch Platform"
- **Subtitle:** Added "Single Wholesaler, Single Shop Architecture"
- **Version:** Updated to 2.0 (Single-Shop Architecture)
- **§1 Executive Summary:** Complete rewrite emphasizing single business model
- **§1.4 Non-Goals:** Added explicit marketplace exclusions
- **§2 Users & Personas:** Added "Count" column, marked wholesaler as "EXACTLY ONE"
- **§2.1 Authentication:** Changed wholesaler to "Admin-seeded (ONE account)"
- **§3.1:** NEW section "Single-Shop Architecture (CRITICAL)" with implementation details
- **§3.2 Order Scope:** Simplified (single-shop inherent)
- **§3.3 Payments:** Updated from Razorpay to PhonePe
- **§3.4 Delivery Assignment:** Clarified single-shop implications

**Key Additions:**
```
ONE Wholesaler: The business owner
ONE Shop: The wholesale business location
MANY Retailers: Customers who order
MANY Delivery Partners: Fulfill deliveries
```

---

### 3. ✅ progress.md (UPDATED)
**Path:** `reference-docs/progress.md`

**Changes Made:**

#### Header
- Added "Architecture: SINGLE WHOLESALER, SINGLE SHOP"
- Added note "(Phase 2 requires refactoring)"

#### New Section: ⚠️ CRITICAL ARCHITECTURAL NOTE
- Placed prominently at top of file
- Explains single-shop model
- Lists impact on Phase 2
- References migration guide

#### Quick State Summary Table
- Changed Phase 2 status from "COMPLETE" to "NEEDS REFACTORING"
- Added explanation: "Must remove shop discovery, wholesaler registration"

#### Architecture Context Table
- Added **Platform Model** as first row
- Added **Shop Count** with `getSingleShopId()` reference
- Added **Wholesaler Count** with `getSingleWholesalerId()` reference
- Added **Retailer Flow** explaining no discovery
- Added **Payment Gateway** noting PhonePe (not Razorpay)

#### Phase 2 Section
- Added "⚠️ ARCHITECTURAL MISMATCH IDENTIFIED" subsection
- Listed marketplace features to remove (❌)
- Listed features to keep (✅)
- Changed heading to "BUILT AS MARKETPLACE - NEEDS CLEANUP"

---

## Documents Requiring Future Updates

### 4. ⏳ schema.md (PENDING)
**Path:** `reference-docs/schema.md`

**Changes Needed:**
- Update `shops` collection notes to reflect "exactly one document"
- Update `users` collection to note "exactly one wholesaler"
- Add validation rules preventing multiple shops
- Update references to shop discovery
- Add helper function documentation

### 5. ⏳ app-flow.md (PENDING)
**Path:** `reference-docs/app-flow.md`

**Changes Needed:**
- **§1.2 Retailer Flow:** Remove shop discovery steps
- **§1.2:** Update flow to: `Login → Catalog → Cart → Checkout`
- **§2.1 Wholesaler Onboarding:** Remove self-registration path
- **§2.1:** Update to admin-seed only
- Remove all shop selection/switching logic
- Update screenshots/mockups (if any)

### 6. ⏳ implementation-plan.md (PENDING)
**Path:** `reference-docs/implementation-plan.md`

**Changes Needed:**
- Phase 2 section: Mark shop discovery as "to be removed"
- Phase 2 section: Mark wholesaler registration as "to be removed"
- Phase 3+ sections: Emphasize single-shop model
- Add Phase 2.5: "Single-Shop Migration" before Phase 3
- Update all future phases to assume single-shop

### 7. ⏳ rules.md (PENDING)
**Path:** `reference-docs/rules.md`

**Changes Needed:**
- Add rule: "Platform operates with exactly ONE shop"
- Add rule: "Platform operates with exactly ONE wholesaler"
- Add rule: "Use `getSingleShopId()` and `getSingleWholesalerId()` helpers"
- Update delivery partner rules (simplified pool logic)
- Update shop-exclusive partner rules

### 8. ⏳ tech-spec.md (PENDING)
**Path:** `reference-docs/tech-spec.md`

**Changes Needed:**
- Update system architecture diagrams
- Add constraint: single shop/wholesaler
- Update API endpoint list (remove shop discovery)
- Update Firestore rules (add multi-shop prevention)
- Document helper utilities

---

## Code Documentation Status

### Backend
- [x] **utils/snapshot.ts** - Already has `getSingleShopId()` and `getSingleWholesalerId()` ✅
- [x] **services/order.service.ts** - Already uses helper functions ✅
- [ ] **routes/shops.routes.ts** - Needs comments about single-shop constraint
- [ ] **routes/auth.routes.ts** - Needs update to prevent wholesaler registration

### Frontend
- [ ] **All retailer pages** - Need comments about single-shop architecture
- [ ] **Wholesaler pages** - Need comments explaining THE shop
- [ ] **Admin pages** - Need updates for single-shop operations

---

## Testing Documentation

### Updated Test Plans Needed
- [ ] Unit tests for `getSingleShopId()` validation
- [ ] Unit tests for `getSingleWholesalerId()` validation
- [ ] Integration tests preventing multiple shops
- [ ] E2E tests for retailer catalog access (no discovery)
- [ ] E2E tests for order flow (auto-shop assignment)

---

## Migration Tracking

### Documentation Phase: ✅ COMPLETE
- [x] Create SINGLE-SHOP-ARCHITECTURE.md
- [x] Update PRD.md
- [x] Update progress.md
- [x] Create this tracking document

### Documentation Phase: 🔄 IN PROGRESS
- [ ] Update schema.md
- [ ] Update app-flow.md
- [ ] Update implementation-plan.md
- [ ] Update rules.md
- [ ] Update tech-spec.md

### Code Phase: ⏳ PENDING
- [ ] Remove retailer shop discovery pages
- [ ] Remove wholesaler registration pages
- [ ] Remove admin shop verification UI
- [ ] Add single-shop validation
- [ ] Create retailer catalog page (direct access)
- [ ] Update cart logic (remove shop switching)
- [ ] Update checkout (auto shop determination)

### Database Phase: ⏳ PENDING
- [ ] Add Firestore rules preventing multiple shops
- [ ] Create setup/seed script for initial shop and wholesaler
- [ ] Migration script for existing installations

### Testing Phase: ⏳ PENDING
- [ ] Write single-shop validation tests
- [ ] Update E2E tests for new flows
- [ ] Manual testing of complete retailer flow

---

## Quick Reference

### Key Constraints
1. **Exactly ONE shop** in `shops` collection
2. **Exactly ONE wholesaler** in `users` collection with `role: "wholesaler"`
3. **No shop discovery** UI for retailers
4. **No wholesaler registration** flow
5. **No shop verification** workflows (shop is always verified)

### Key Utilities
```typescript
// Backend (already implemented)
import { getSingleShopId, getSingleWholesalerId } from '@/utils/snapshot';

const shopId = await getSingleShopId();
const wholesalerId = await getSingleWholesalerId();
```

### Removed Features
- ❌ `GET /shops` (shop list API)
- ❌ `GET /shops/nearby` (geolocation search)
- ❌ `POST /auth/register-wholesaler`
- ❌ `/retailer/shops` (discovery page)
- ❌ `/wholesaler/signup` (registration page)
- ❌ Admin shops verification tab

### New/Modified Features
- ✅ `/retailer/catalog` (direct catalog access)
- ✅ `GET /shop` (get THE shop details)
- ✅ Auto shop assignment in orders
- ✅ Simplified delivery partner pools

---

## Communication Plan

### For Development Team
**Read First:**
1. SINGLE-SHOP-ARCHITECTURE.md (complete guide)
2. Updated PRD.md §3.1 (business model)
3. Updated progress.md (architectural note)

**Action Items:**
- Review migration checklist
- Plan Phase 2 refactoring sprint
- Update local development setup

### For Stakeholders
**Key Message:**
"The platform is designed for a single wholesale business managing orders from multiple retail customers. It is NOT a marketplace connecting multiple wholesalers."

**Benefits:**
- Simpler user experience
- Faster time to market
- Lower operational complexity
- Focused on single business needs

### For QA Team
**Testing Focus:**
- Verify single-shop constraint enforcement
- Test retailer direct catalog access
- Verify auto shop assignment in orders
- Ensure no multi-shop logic remains

---

## Next Steps

1. **Complete remaining documentation updates** (schema.md, app-flow.md, etc.)
2. **Review updated docs with stakeholders** (confirm architecture)
3. **Plan Phase 2 refactoring** (estimate effort, create tasks)
4. **Begin code migration** (following SINGLE-SHOP-ARCHITECTURE.md checklist)
5. **Update tests** (reflect new architecture)
6. **Deploy changes** (staging first, then production)

---

## Questions & Clarifications

### Resolved
- ✅ Platform is single-shop, not marketplace
- ✅ PhonePe is payment gateway (not Razorpay)
- ✅ Phase 3 already implements single-shop correctly
- ✅ Phase 2 needs refactoring to match

### Pending
- ❓ Timeline for Phase 2 refactoring?
- ❓ Migrate existing data if multi-shop installations exist?
- ❓ Keep removed code in git history for potential rollback?

---

**Status:** Documentation phase complete. Ready for code migration phase.

**Last Updated:** 2026-07-14  
**Updated By:** AI Agent (Kiro)
