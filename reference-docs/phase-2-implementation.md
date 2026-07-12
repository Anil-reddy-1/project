# Phase 2 Implementation Plan
## Shop & Catalog Management — Clean Build Strategy

**Version:** 1.0  
**Created:** 2026-07-12  
**Author:** Senior Fullstack Developer Review  
**Status:** Ready for Implementation  
**Dependencies:** Phase 1 (Identity & Roles) COMPLETE

---

## Executive Summary

Phase 2 unlocks the core marketplace experience: wholesalers create discoverable shops with real inventory, retailers browse and filter shops with actual catalog data. This is the first phase where the B2B marketplace becomes tangible.

**Critical Success Factors:**
- Geographic search must be performant (<500ms for radius queries)
- Inventory data must be the single source of truth across all views
- Shop verification workflow must be crystal clear for admin and wholesaler
- MOQ threshold visibility must be consistent everywhere it's shown

**Risk Areas:**
- Geohash precision tuning (can be adjusted post-launch if needed)
- Cloudinary storage limits for shop/item photos
- Race conditions in concurrent item stock updates (mitigated with transactions)

---

## Scope Definition

### What's IN Scope for Phase 2

✅ **Backend:**
- Shop CRUD operations (create, read, update, delete)
- Item CRUD operations within shops
- Geospatial queries (shops within radius)
- Shop verification status management (admin-only)
- Proper inventory tracking for items

✅ **Frontend - Wholesaler:**
- Shop setup wizard (first-time flow)
- Shop profile editor
- Item catalog management interface
- Add/edit/delete items
- Toggle item availability (out of stock without deletion)
- Real-time inventory updates

✅ **Frontend - Retailer:**
- Shop discovery/search interface
- Filter by category, distance, rating
- Shop detail page with full catalog
- Price, stock, and MOQ visibility

✅ **Frontend - Admin:**
- Shop verification queue
- Approve/reject shops
- View all shops (all verification states)

### What's OUT of Scope (Later Phases)

❌ Cart functionality (Phase 3)
❌ Order placement (Phase 3)
❌ Payment integration (Phase 3)
❌ Delivery assignment (Phase 5+)
❌ Reviews/ratings (Phase 8+)
❌ Analytics dashboard (Phase 9)

---

## Prerequisites Checklist

**Before starting any Phase 2 work, verify:**

- [ ] Phase 1 is fully complete and tested
- [ ] Admin account exists and can log in
- [ ] All four role dashboards are accessible
- [ ] Firebase Admin SDK is properly configured
- [ ] Cloudinary account is set up with API keys
- [ ] Decision #2 resolved: `operatingHours` structure and `verificationStatus` values

**Resolved Decisions from Implementation Plan:**
- ✅ `operatingHours` structure: `{ days: string[], open: string, close: string }`
- ✅ `verificationStatus` values: `"pending" | "verified" | "rejected"`
- ✅ MOQ is shop-order-total based (confirmed per rules.md §3)

---

## Data Model Review

### Shop Entity (Firestore: `shops/{shopId}`)

```typescript
interface Shop {
  shopId: string;                          // auto-generated UUID
  name: string;                            // required, max 100 chars
  category: string;                        // enum: see schema.md
  address: string;                         // full street address
  geolocation: {
    lat: number;
    lng: number;
    geohash: string;                       // computed server-side
  };
  moqThreshold: number;                    // minimum order value in INR
  operatingHours: {
    days: string[];                        // ["monday", "tuesday", ...]
    open: string;                          // "09:00" format
    close: string;                         // "18:00" format
  };
  verificationStatus: "pending" | "verified" | "rejected";
  ownerUid: string;                        // references users/{uid}
  photo?: {                                // optional shop photo
    url: string;
    publicId: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Key Rules:**
- One wholesaler = one shop (enforced in user doc `shopId` field)
- Geohash computed server-side using `geofire-common`
- Only `verified` shops visible to retailers


### Item Entity (Firestore: `items/{itemId}`)

```typescript
interface Item {
  itemId: string;                          // auto-generated UUID
  shopId: string;                          // parent shop reference
  name: string;                            // required, max 100 chars
  price: number;                           // INR, must be positive
  stockQty: number;                        // current available quantity
  unit: string;                            // "kg" | "litre" | "box" | etc.
  isAvailable: boolean;                    // toggle for out-of-stock
  images?: Array<{                         // optional product images
    url: string;
    publicId: string;
  }>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Key Rules:**
- `stockQty` decrements ONLY at order approval (Phase 4), never at placement
- `isAvailable: false` hides item from retailer views without deletion
- Images stored in Cloudinary, URLs in Firestore
- Items are NOT soft-deleted; use `isAvailable` for temporary removal

---

## Implementation Strategy

### Build Order (Sequential Dependencies)


**Recommended sequence to avoid blockers:**

1. **Backend Foundation** (Day 1-2)
   - Shop routes and controllers
   - Item routes and controllers
   - Geospatial query logic
   - Validation middleware

2. **Wholesaler Experience** (Day 3-4)
   - Shop setup wizard
   - Item catalog management
   - File upload integration

3. **Retailer Experience** (Day 5-6)
   - Shop discovery UI
   - Filtering and search
   - Shop detail page

4. **Admin Experience** (Day 7)
   - Shop verification queue
   - Bulk operations

5. **Integration & Testing** (Day 8)
   - End-to-end flows
   - Edge case handling
   - Performance validation

### Architecture Decisions

**1. Geospatial Strategy:**
- Use `geofire-common` for geohash-based queries
- Precision: 6 characters (~1.2km resolution)
- Query pattern: bounds first, then Haversine filter
- Index required: `shops` collection on `geolocation.geohash`

**2. Image Management:**
- Cloudinary folders: `shop_photos/`, `product_images/`
- Max upload: 5MB per image (enforced client + server)
- Format validation: JPEG, PNG, WebP, GIF only


**3. State Management:**
- No Redux/Zustand needed for Phase 2
- React state + useEffect for data fetching
- Optimistic updates for item availability toggles
- Proper error boundaries for network failures

**4. Security:**
- Wholesaler can CRUD only their own shop
- Retailers can only READ verified shops
- Admin can modify any shop's verification status
- All enforced server-side via `requireRole()` middleware

---

## Detailed Task Breakdown

### Backend Tasks

#### Task B1: Shop Routes Implementation

**File:** `backend/src/routes/shops.routes.ts`

**Endpoints to implement:**

```typescript
// Shop CRUD
POST   /shops                  // Create shop (wholesaler only)
GET    /shops/:shopId          // Get shop by ID (any authenticated user)
GET    /shops                  // List shops with filters (retailer: verified only)
GET    /shops/all              // List all shops (admin only)
PATCH  /shops/:shopId          // Update shop (owner or admin)
DELETE /shops/:shopId          // Delete shop (admin only)

// Item CRUD within shop
POST   /shops/:shopId/items              // Create item
GET    /shops/:shopId/items              // List items (owner sees all, retailer sees available only)
GET    /shops/:shopId/items/:itemId      // Get item by ID
PATCH  /shops/:shopId/items/:itemId      // Update item
DELETE /shops/:shopId/items/:itemId      // Delete item
```


**Implementation checklist:**
- [ ] Input validation using middleware (validate geolocation coordinates, MOQ > 0)
- [ ] Geohash computation on shop creation/update
- [ ] Owner verification (wholesaler can only edit their shop)
- [ ] Firestore transactions for atomic updates
- [ ] Proper error handling with AppError class
- [ ] Image URL validation (Cloudinary URLs only)

**Key Logic:**

```typescript
// Geohash computation example
import { geohashForLocation } from 'geofire-common';

const geohash = geohashForLocation([lat, lng]); // 6-char precision

// Radius query example
import { geohashQueryBounds, distanceBetween } from 'geofire-common';

const center = [userLat, userLng];
const radiusInKm = 10;
const bounds = geohashQueryBounds(center, radiusInKm);

// Execute multiple queries (one per bound)
// Then filter by Haversine distance
```

---

#### Task B2: Validation Middleware

**File:** `backend/src/middleware/validation.ts` (new)

**Create reusable validators:**
- Shop input validation
- Item input validation
- Geolocation validation
- Operating hours validation

```typescript
export const validateShopInput = (req, res, next) => {
  const { name, category, address, geolocation, moqThreshold, operatingHours } = req.body;
  
  // Validation logic
  if (!name || name.length > 100) throw new AppError('Invalid shop name', 400);
  if (moqThreshold < 0) throw new AppError('MOQ must be non-negative', 400);
  // ... more validations
  
  next();
};
```


---

### Frontend Tasks - Wholesaler

#### Task W1: Shop Setup Wizard

**File:** `frontend/app/(wholesaler)/wholesaler/shop-setup/page.tsx`

**Requirements:**
- Multi-step form (3 steps: Basic Info → Location → Hours & MOQ)
- Geolocation capture (browser API + manual entry fallback)
- Address autocomplete (optional: Google Places API)
- Image upload for shop photo
- Loading states and error handling
- Redirect to dashboard on completion

**Form Fields:**

**Step 1 - Basic Info:**
- Shop name (text, required, max 100 chars)
- Category (dropdown: Groceries, Electronics, Textiles, etc.)
- Shop photo (optional, file upload)

**Step 2 - Location:**
- Address (textarea, required)
- Latitude/Longitude (auto-filled via geolocation or manual)
- Map preview (optional enhancement)

**Step 3 - Hours & MOQ:**
- Operating days (multi-select checkboxes)
- Opening time (time picker)
- Closing time (time picker)
- Minimum order value (number input, INR)

**State management:**
```typescript
const [step, setStep] = useState(1);
const [formData, setFormData] = useState({
  name: '', category: '', photo: null,
  address: '', lat: null, lng: null,
  days: [], open: '09:00', close: '18:00',
  moqThreshold: 1000
});
```


---

#### Task W2: Catalog Management Page

**File:** `frontend/app/(wholesaler)/wholesaler/catalog/page.tsx`

**Requirements:**
- Item list with grid/table toggle
- Add/Edit/Delete item modals
- Toggle availability inline
- Real-time stock updates
- Sorting and filtering (by category, stock status)
- Empty state with CTA to add first item

**Item Card/Row Display:**
- Product image thumbnail
- Item name and price
- Stock quantity with status indicator (In Stock / Low Stock / Out of Stock)
- Availability toggle switch
- Quick actions: Edit, Delete

**Add/Edit Item Modal:**
- Name (text, required)
- Price (number, INR)
- Stock quantity (number)
- Unit (dropdown: kg, litre, box, etc.)
- Product images (multi-upload, max 10)
- Availability toggle

**Key Interactions:**
```typescript
// Optimistic update for availability toggle
const handleToggleAvailability = async (itemId: string, currentStatus: boolean) => {
  // Update UI immediately
  setItems(prev => prev.map(item => 
    item.itemId === itemId ? { ...item, isAvailable: !currentStatus } : item
  ));
  
  try {
    // Make API call
    await fetch(`/shops/${shopId}/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ isAvailable: !currentStatus })
    });
  } catch (err) {
    // Revert on failure
    setItems(prev => prev.map(item => 
      item.itemId === itemId ? { ...item, isAvailable: currentStatus } : item
    ));
    showError('Failed to update item');
  }
};
```


---

### Frontend Tasks - Retailer

#### Task R1: Shop Discovery Page

**File:** `frontend/app/(retailer)/retailer/shops/page.tsx`

**Requirements:**
- List of verified shops only
- Search by shop name
- Filter by category
- Distance-based filtering (with geolocation)
- Sort by: distance, name, rating (rating placeholder for Phase 8+)
- Skeleton loaders during fetch
- Empty state handling

**Filter Panel:**
```typescript
interface Filters {
  search: string;
  category: string | null;
  maxDistance: number | null;  // km radius
  userLocation: { lat: number; lng: number } | null;
}
```

**Shop Card Display:**
- Shop name and category badge
- Distance (if location available)
- MOQ threshold prominently displayed
- Operating hours
- Verification badge
- "View Catalog" CTA

**Geolocation Logic:**
```typescript
const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
const [locationError, setLocationError] = useState('');

const requestLocation = () => {
  if (!navigator.geolocation) {
    setLocationError('Geolocation not supported');
    return;
  }
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      setUserLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude
      });
    },
    (error) => {
      setLocationError('Location access denied');
    }
  );
};
```


---

#### Task R2: Shop Detail & Catalog Page

**File:** `frontend/app/(retailer)/retailer/shops/[shopId]/page.tsx`

**Requirements:**
- Shop header with full details
- Complete item catalog display
- Search/filter items within shop
- Real-time stock indicators
- MOQ reminder banner (if cart < threshold)
- Price and unit clearly displayed
- Image gallery for items with multiple photos

**Shop Header:**
- Shop name and category
- Address with map link (optional)
- Operating hours with day indicators
- MOQ threshold (prominent)
- Verification status badge

**Item Display:**
- Grid view (3-4 columns on desktop, 1-2 on mobile)
- Product image with fallback
- Item name and price
- Stock status (In Stock / Low Stock / Out of Stock)
- Unit displayed (per kg, per litre, etc.)
- "Add to Cart" disabled (Phase 3)

**Search & Filter:**
- Search items by name
- Filter by availability
- Sort by: name, price (low to high, high to low)

**Empty States:**
- No items available in shop
- No search results
- Out of stock items filtered out

```typescript
const [items, setItems] = useState<Item[]>([]);
const [search, setSearch] = useState('');
const [showOutOfStock, setShowOutOfStock] = useState(false);

const filteredItems = items.filter(item => {
  const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
  const matchesStock = showOutOfStock || item.stockQty > 0;
  return matchesSearch && matchesStock && item.isAvailable;
});
```


---

### Frontend Tasks - Admin

#### Task A1: Shop Verification Management

**File:** `frontend/app/(admin)/admin/page.tsx` (add Shops tab)

**Requirements:**
- New "Shops" tab in admin dashboard
- List all shops (all verification states)
- Filter by verification status
- Bulk actions support (optional)
- Quick approve/reject actions
- Shop detail modal/page

**Shop List Display:**
- Shop name and category
- Owner information (name, contact)
- Verification status badge
- Created date
- Quick actions (Approve, Reject, View Details)

**Actions:**
```typescript
const handleVerify = async (shopId: string) => {
  try {
    await fetch(`/shops/${shopId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ verificationStatus: 'verified' })
    });
    
    showSuccess('Shop verified successfully');
    refetchShops();
  } catch (err) {
    showError('Verification failed');
  }
};

const handleReject = async (shopId: string, reason: string) => {
  // Similar to verify but with rejection reason
};
```

**Filtering:**
- All shops
- Pending verification
- Verified
- Rejected

---

## Testing Strategy

### Unit Tests (Backend)

**Files to test:**
- `shops.routes.ts` - All CRUD endpoints
- `items.routes.ts` - Item management
- Geohash computation logic
- Validation middleware

**Test cases:**
```typescript
describe('Shop Creation', () => {
  it('should create shop with valid data');
  it('should reject invalid geolocation');
  it('should compute geohash correctly');
  it('should prevent duplicate shops per wholesaler');
  it('should require authentication');
  it('should enforce role permissions');
});

describe('Geospatial Queries', () => {
  it('should return shops within radius');
  it('should sort by distance');
  it('should handle edge cases (poles, date line)');
  it('should return empty array when no shops found');
});
```


### Integration Tests

**Critical flows to test:**

1. **Wholesaler Shop Setup:**
   - Complete wizard end-to-end
   - Image upload and storage
   - Geolocation capture
   - Redirect to dashboard

2. **Item Management:**
   - Create item with images
   - Update stock quantity
   - Toggle availability
   - Delete item

3. **Retailer Discovery:**
   - Browse verified shops
   - Filter by distance
   - Search by name/category
   - View shop catalog

4. **Admin Verification:**
   - Approve shop
   - Reject shop
   - View all shops

### Manual Testing Checklist

**Wholesaler Flow:**
- [ ] First-time setup wizard completes successfully
- [ ] Shop photo uploads to Cloudinary
- [ ] Geolocation capture works (or manual entry)
- [ ] Can add items with multiple images
- [ ] Stock quantity updates correctly
- [ ] Availability toggle works without refresh
- [ ] Shop edit form pre-fills correctly
- [ ] Cannot see other wholesalers' shops in management

**Retailer Flow:**
- [ ] Can see only verified shops
- [ ] Distance filter works with geolocation
- [ ] Search filters shops correctly
- [ ] Shop detail shows accurate stock
- [ ] MOQ threshold is visible everywhere
- [ ] Cannot see unavailable items
- [ ] Image gallery works for multi-image items

**Admin Flow:**
- [ ] Can see all shops regardless of status
- [ ] Approve action changes status to verified
- [ ] Reject action changes status to rejected
- [ ] Verified shops appear in retailer view
- [ ] Rejected shops do not appear in retailer view

---

## Performance Considerations

### Backend Optimization

1. **Firestore Indexes:**
```javascript
// Required composite indexes
shops: [
  { fields: ['verificationStatus', 'createdAt'], order: 'desc' },
  { fields: ['geolocation.geohash'], order: 'asc' },
  { fields: ['category', 'verificationStatus'], order: 'asc' }
]

items: [
  { fields: ['shopId', 'isAvailable', 'createdAt'], order: 'desc' },
  { fields: ['shopId', 'stockQty'], order: 'asc' }
]
```

2. **Caching Strategy:**
- Cache verified shops list (5 min TTL)
- Cache shop details (2 min TTL)
- No caching for item stock (must be real-time)

3. **Query Limits:**
- Shops list: 50 per page
- Items list: 100 per shop
- Geospatial query: max 20km radius

### Frontend Optimization

1. **Data Fetching:**
- Use SWR or React Query for caching
- Implement pagination for large lists
- Debounce search inputs (300ms)

2. **Image Loading:**
- Lazy load images below fold
- Use Cloudinary transformations for thumbnails
- Implement progressive image loading

3. **Bundle Size:**
- Code split by route
- Lazy load modals and heavy components
- Tree-shake unused utilities

---

## Security Checklist

### Backend Security

- [ ] All routes require authentication
- [ ] Role-based access control enforced
- [ ] Wholesaler can only modify their own shop
- [ ] Admin-only routes properly gated
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (Firestore parameterized queries)
- [ ] File upload size limits enforced
- [ ] File type validation (images only)
- [ ] Rate limiting on create/update endpoints

### Frontend Security

- [ ] No sensitive data in client-side state
- [ ] API keys not exposed in bundle
- [ ] XSS prevention (React auto-escaping)
- [ ] CSRF protection via Firebase tokens
- [ ] Secure session management
- [ ] Role checks in middleware and components
- [ ] No role-based logic in client code (server validates)

---

## Deployment Checklist

### Pre-Deployment

- [ ] All Phase 2 tests passing
- [ ] No console errors or warnings
- [ ] Firestore indexes created
- [ ] Cloudinary folders created
- [ ] Environment variables set (staging + prod)
- [ ] Security rules updated in Firestore
- [ ] API rate limits configured

### Deployment Steps

1. **Backend:**
   ```bash
   cd backend
   npm run build
   npm run test
   # Deploy to Cloud Run/Render
   ```

2. **Frontend:**
   ```bash
   cd frontend
   npm run build
   npm run test
   # Deploy to Vercel
   ```

3. **Post-Deployment:**
   - Smoke test all critical flows
   - Monitor error logs for 24 hours
   - Check Cloudinary usage
   - Verify Firestore write patterns

---

## Known Issues & Workarounds

### Issue 1: Geolocation Permission Denied
**Impact:** Medium
**Workaround:** Provide manual lat/lng entry or address search
**Long-term fix:** Add Google Places autocomplete with coordinates

### Issue 2: Image Upload Failures
**Impact:** Low
**Workaround:** Retry mechanism + error messaging
**Long-term fix:** Upload queue with retry logic

### Issue 3: Concurrent Stock Updates
**Impact:** High (if not handled)
**Mitigation:** Use Firestore transactions for all stock modifications
**Monitoring:** Log all transaction failures

---

## Rollback Plan

If critical issues are found post-deployment:

1. **Immediate Rollback:**
   - Revert to Phase 1 deployment
   - Disable shop creation temporarily
   - Show maintenance message

2. **Data Integrity:**
   - No data loss (shops/items remain in Firestore)
   - Verification statuses preserved
   - No inventory corruption risk

3. **Communication:**
   - Notify active wholesalers
   - Provide ETA for fix
   - Document issue in post-mortem

---

## Success Metrics

**Quantitative:**
- [ ] Shop creation success rate > 95%
- [ ] Item creation success rate > 98%
- [ ] Geospatial query response time < 500ms (p95)
- [ ] Image upload success rate > 99%
- [ ] Zero inventory corruption incidents
- [ ] Mobile responsiveness score > 90 (Lighthouse)

**Qualitative:**
- [ ] Wholesalers can complete setup without support
- [ ] Retailers find discovery intuitive
- [ ] Admin verification workflow is efficient
- [ ] No major UX complaints in first week

---

## Phase 2 Exit Criteria

**Before proceeding to Phase 3, verify:**

✅ **Backend:**
- All shop/item CRUD endpoints functional
- Geospatial queries working correctly
- Proper authentication and authorization
- Firestore indexes created
- Error handling and logging in place

✅ **Frontend - Wholesaler:**
- Shop setup wizard complete
- Item catalog management functional
- Image uploads working
- Real-time inventory updates

✅ **Frontend - Retailer:**
- Shop discovery with filters working
- Distance-based search functional
- Shop detail page shows accurate data
- Cannot see unverified shops

✅ **Frontend - Admin:**
- Shop verification queue functional
- Approve/reject actions working
- Can view all shops

✅ **Testing:**
- All integration tests passing
- Manual testing checklist complete
- Performance benchmarks met
- Security audit complete

✅ **Documentation:**
- API documentation updated
- User flows documented
- Known issues tracked
- Deployment runbook created

---

## Next Steps (Phase 3 Preview)

Once Phase 2 is complete and stable:

**Phase 3 Goals:**
- Single-shop cart implementation
- MOQ threshold enforcement
- Razorpay integration (prepaid)
- COD order placement
- Order confirmation flow

**Phase 3 Prerequisites:**
- Razorpay account setup
- Test payment gateway
- Order state machine design review
- Inventory lock strategy confirmed

---

## Appendix

### Useful Commands

```bash
# Backend
npm run dev              # Start dev server
npm run build            # Build for production
npm run test             # Run tests
npm run lint             # Lint code

# Frontend
npm run dev              # Start Next.js dev
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Lint code

# Firestore
firebase deploy --only firestore:rules    # Deploy security rules
firebase deploy --only firestore:indexes  # Deploy indexes

# Cloudinary
# Test upload via Postman/curl to verify API keys
```

### Reference Links

- [Firestore Geoqueries](https://firebase.google.com/docs/firestore/solutions/geoqueries)
- [geofire-common Documentation](https://github.com/firebase/geofire-js)
- [Cloudinary Upload API](https://cloudinary.com/documentation/image_upload_api_reference)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Firebase Auth Custom Claims](https://firebase.google.com/docs/auth/admin/custom-claims)

---

**Document End**

*This implementation plan is a living document. Update as decisions are made and edge cases discovered during development.*
