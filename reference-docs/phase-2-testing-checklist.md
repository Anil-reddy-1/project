# Phase 2 Testing Checklist
## Shop Setup & Item Catalog System

**Date Created:** 2026-07-12  
**Status:** Ready for Testing  
**Tester:** _____________  
**Environment:** Development / Staging / Production

---

## Prerequisites

Before starting testing, ensure:

- [ ] Backend server is running (`npm run dev` in `/backend`)
- [ ] Frontend server is running (`npm run dev` in `/frontend`)
- [ ] Firebase project is configured with test data
- [ ] Admin account exists and is accessible
- [ ] At least 2 test wholesaler accounts exist
- [ ] At least 2 test retailer accounts exist
- [ ] Cloudinary credentials are configured
- [ ] Browser DevTools are open for console monitoring

---

## 1. Backend API Testing

### 1.1 Shop Routes

#### POST /shops (Create Shop)

- [ ] **TC-S001:** Create shop with all valid fields
  - Login as wholesaler
  - Send POST request with complete shop data
  - Verify 201 response with shopId
  - Verify shop appears in Firestore

- [ ] **TC-S002:** Reject shop creation with missing name
  - Expected: 400 Bad Request with validation error

- [ ] **TC-S003:** Reject shop creation with invalid latitude (> 90)
  - Expected: 400 Bad Request with validation error

- [ ] **TC-S004:** Reject shop creation with invalid longitude (> 180)
  - Expected: 400 Bad Request with validation error

- [ ] **TC-S005:** Reject shop creation with invalid category
  - Expected: 400 Bad Request with validation error

- [ ] **TC-S006:** Reject shop creation with invalid operating hours format
  - Expected: 400 Bad Request with validation error

- [ ] **TC-S007:** Reject shop creation from retailer
  - Expected: 403 Forbidden

- [ ] **TC-S008:** Reject duplicate shop creation by same wholesaler
  - Expected: 409 Conflict

#### GET /shops (List Shops)

- [ ] **TC-S009:** List all verified shops without filters
  - Expected: 200 with array of verified shops only

- [ ] **TC-S010:** List shops with geolocation filter (lat, lng, radiusInKm)
  - Verify shops within radius are returned
  - Verify distanceInKm is included
  - Verify shops are sorted by distance

- [ ] **TC-S011:** List shops with invalid lat/lng
  - Expected: 400 Bad Request

- [ ] **TC-S012:** List shops without authentication
  - Expected: 401 Unauthorized

#### GET /shops/all (Admin Only)

- [ ] **TC-S013:** Admin can list all shops (including pending/rejected)
  - Expected: 200 with all shops

- [ ] **TC-S014:** Non-admin cannot access /shops/all
  - Expected: 403 Forbidden

#### GET /shops/:shopId (Get Shop Details)

- [ ] **TC-S015:** Get shop details with valid shopId
  - Expected: 200 with complete shop data

- [ ] **TC-S016:** Get shop with non-existent shopId
  - Expected: 404 Not Found

#### PATCH /shops/:shopId (Update Shop)

- [ ] **TC-S017:** Owner updates shop name
  - Expected: 200 with success message

- [ ] **TC-S018:** Owner updates shop location (lat, lng)
  - Verify geohash is recalculated

- [ ] **TC-S019:** Owner updates operating hours
  - Expected: 200 with success message

- [ ] **TC-S020:** Owner updates MOQ threshold
  - Expected: 200 with success message

- [ ] **TC-S021:** Admin verifies shop (pending → verified)
  - Expected: 200 with success message

- [ ] **TC-S022:** Admin rejects shop (pending → rejected)
  - Expected: 200 with success message

- [ ] **TC-S023:** Non-owner tries to update shop
  - Expected: 403 Forbidden

- [ ] **TC-S024:** Non-admin tries to change verificationStatus
  - Expected: 403 Forbidden or field ignored

### 1.2 Item Routes

#### POST /shops/:shopId/items (Create Item)

- [ ] **TC-I001:** Create item with all valid fields
  - Expected: 201 with itemId

- [ ] **TC-I002:** Create item with multiple images
  - Verify all images are stored

- [ ] **TC-I003:** Reject item with negative price
  - Expected: 400 Bad Request

- [ ] **TC-I004:** Reject item with non-integer stockQty
  - Expected: 400 Bad Request

- [ ] **TC-I005:** Reject item with invalid unit
  - Expected: 400 Bad Request

- [ ] **TC-I006:** Non-owner tries to create item in shop
  - Expected: 403 Forbidden

#### GET /shops/:shopId/items (List Items)

- [ ] **TC-I007:** Owner sees all items (including unavailable)
  - Expected: 200 with all items

- [ ] **TC-I008:** Retailer sees only available items
  - Expected: 200 with isAvailable=true items only

- [ ] **TC-I009:** Admin sees all items
  - Expected: 200 with all items

#### PATCH /shops/:shopId/items/:itemId (Update Item)

- [ ] **TC-I010:** Owner updates item price
  - Expected: 200 with success message

- [ ] **TC-I011:** Owner updates item stock quantity
  - Expected: 200 with success message

- [ ] **TC-I012:** Owner toggles item availability
  - Expected: 200 with success message

- [ ] **TC-I013:** Owner updates item images
  - Expected: 200 with success message

- [ ] **TC-I014:** Non-owner tries to update item
  - Expected: 403 Forbidden

#### DELETE /shops/:shopId/items/:itemId (Delete Item)

- [ ] **TC-I015:** Owner deletes item
  - Expected: 200 with success message

- [ ] **TC-I016:** Delete non-existent item
  - Expected: 404 Not Found

- [ ] **TC-I017:** Non-owner tries to delete item
  - Expected: 403 Forbidden

---

## 2. Wholesaler Frontend Testing

### 2.1 Shop Setup Wizard (/wholesaler/shop-setup)

- [ ] **TC-W001:** Access shop setup page as new wholesaler
  - Page loads without errors

- [ ] **TC-W002:** Fill all required fields in shop setup form
  - Name, address, location, category, operating hours, MOQ

- [ ] **TC-W003:** Use "Detect Location" button
  - Browser asks for location permission
  - Coordinates populate correctly

- [ ] **TC-W004:** Upload shop photo
  - File upload succeeds
  - Preview shows uploaded image
  - Remove button works

- [ ] **TC-W005:** Submit form with valid data
  - Shop is created successfully
  - Redirect to catalog page or dashboard

- [ ] **TC-W006:** Submit form with missing required fields
  - Validation errors display correctly

- [ ] **TC-W007:** Submit form with invalid coordinates
  - Validation error displays

- [ ] **TC-W008:** Try to access shop-setup after shop exists
  - Should redirect to catalog or show "Shop already exists"

### 2.2 Catalog Management (/wholesaler/catalog)

- [ ] **TC-W009:** Access catalog page as wholesaler with shop
  - Page loads, shows existing items

- [ ] **TC-W010:** Click "Add Item" button
  - Modal opens with empty form

- [ ] **TC-W011:** Create item with single image
  - Item appears in catalog list

- [ ] **TC-W012:** Create item with multiple images (up to 10)
  - All images upload successfully
  - First image is main display

- [ ] **TC-W013:** Edit existing item
  - Modal opens with pre-filled data
  - Changes save correctly

- [ ] **TC-W014:** Toggle item availability (Show/Hide)
  - Item status changes
  - Visual indicator updates

- [ ] **TC-W015:** Delete item
  - Confirmation dialog appears
  - Item is removed from list

- [ ] **TC-W016:** Search/filter items in catalog
  - Search works for item names

- [ ] **TC-W017:** Upload image exceeding 5MB
  - Error message displays

- [ ] **TC-W018:** Upload non-image file
  - Error message displays

- [ ] **TC-W019:** Try to upload more than 10 images
  - Error message displays

---

## 3. Retailer Frontend Testing

### 3.1 Shop Discovery (/retailer/shops)

- [ ] **TC-R001:** Access shop discovery page
  - Page loads, shows verified shops

- [ ] **TC-R002:** Search shops by name
  - Results filter correctly

- [ ] **TC-R003:** Search shops by category
  - Results filter correctly

- [ ] **TC-R004:** Click "Nearby Shops" button
  - Browser asks for location permission
  - Location is detected
  - Radius filter appears

- [ ] **TC-R005:** Change radius filter (5km, 10km, 20km, 50km)
  - Shop list updates
  - Distance in km displays for each shop

- [ ] **TC-R006:** Clear location filter
  - Returns to unfiltered shop list

- [ ] **TC-R007:** Click on shop card
  - Navigates to shop detail page

- [ ] **TC-R008:** No shops match search
  - Empty state displays correctly

### 3.2 Shop Detail Page (/retailer/shops/[shopId])

- [ ] **TC-R009:** View shop details
  - All shop info displays correctly
  - Operating days highlight correctly

- [ ] **TC-R010:** View shop catalog
  - Available items display
  - Unavailable items are hidden (if not owner)

- [ ] **TC-R011:** Search items in catalog
  - Search filters items correctly

- [ ] **TC-R012:** Click on item card
  - Modal opens with item details
  - Image carousel works (if multiple images)

- [ ] **TC-R013:** Add item to cart
  - Cart button shows quantity controls
  - Quantity increments correctly

- [ ] **TC-R014:** Decrease item quantity in cart
  - Quantity decrements
  - Item removes when quantity reaches 0

- [ ] **TC-R015:** Try to add more than available stock
  - Button becomes disabled at stock limit

- [ ] **TC-R016:** View cart summary bar (sticky bottom)
  - Shows correct item count
  - Shows correct total price

- [ ] **TC-R017:** Open cart drawer
  - Cart items list displays
  - Quantities can be adjusted
  - Total is accurate

- [ ] **TC-R018:** Close cart drawer
  - Drawer closes smoothly

- [ ] **TC-R019:** Item marked "Out of Stock"
  - Add button is disabled
  - Stock status displays

---

## 4. Admin Frontend Testing

### 4.1 Shop Verification (/admin)

- [ ] **TC-A001:** Navigate to Shops tab
  - All shops (pending, verified, rejected) display

- [ ] **TC-A002:** View pending shop details
  - Name, category, address, MOQ display correctly

- [ ] **TC-A003:** Verify pending shop
  - Shop status changes to "verified"
  - Success message displays

- [ ] **TC-A004:** Reject pending shop
  - Confirmation dialog appears
  - Shop status changes to "rejected"

- [ ] **TC-A005:** Re-verify rejected shop
  - Status changes back to "verified"

- [ ] **TC-A006:** Switch between Users and Shops tabs
  - Data loads correctly for each tab

---

## 5. Firestore Integration Testing

### 5.1 Data Persistence

- [ ] **TC-F001:** Create shop via API
  - Verify document exists in Firestore shops collection

- [ ] **TC-F002:** Verify geohash is generated correctly
  - Check Firestore document has geohash field

- [ ] **TC-F003:** Create item via API
  - Verify document exists in shops/{shopId}/products

- [ ] **TC-F004:** Update shop details
  - Verify updatedAt timestamp changes in Firestore

### 5.2 Security Rules

- [ ] **TC-F005:** Try to write to shops collection from client
  - Should be blocked by security rules

- [ ] **TC-F006:** Try to write to items collection from client
  - Should be blocked by security rules

- [ ] **TC-F007:** Read shops as authenticated user
  - Should succeed

- [ ] **TC-F008:** Read shops as unauthenticated user
  - Should fail with permission denied

### 5.3 Indexes

- [ ] **TC-F009:** Query shops by verificationStatus + createdAt
  - Query executes without index warning

- [ ] **TC-F010:** Query shops by geohash range
  - Query executes without index warning

- [ ] **TC-F011:** Query items by isAvailable + updatedAt
  - Query executes without index warning

---

## 6. Image Upload Testing

### 6.1 Cloudinary Integration

- [ ] **TC-U001:** Upload shop photo
  - Image uploads to Cloudinary
  - URL is returned and stored

- [ ] **TC-U002:** Upload product images (single)
  - Image uploads successfully

- [ ] **TC-U003:** Upload product images (multiple)
  - All images upload successfully
  - URLs and publicIds stored correctly

- [ ] **TC-U004:** Upload image with invalid format
  - Error message displays

- [ ] **TC-U005:** Upload image exceeding size limit
  - Error message displays

- [ ] **TC-U006:** Verify uploaded images display correctly
  - Images render in shop/item cards
  - Images render in detail modals

---

## 7. Validation Testing

### 7.1 Frontend Validation

- [ ] **TC-V001:** Submit shop form with empty name
  - Client-side validation error displays

- [ ] **TC-V002:** Submit item form with negative price
  - Client-side validation error displays

- [ ] **TC-V003:** Submit item form with decimal stock quantity
  - Client-side validation error displays

### 7.2 Backend Validation

- [ ] **TC-V004:** API request with missing required field
  - 400 Bad Request with clear error message

- [ ] **TC-V005:** API request with invalid data type
  - 400 Bad Request with clear error message

- [ ] **TC-V006:** API request with out-of-range values
  - 400 Bad Request with clear error message

---

## 8. Error Handling Testing

### 8.1 Network Errors

- [ ] **TC-E001:** Simulate network failure during shop creation
  - Error message displays to user

- [ ] **TC-E002:** Simulate timeout during image upload
  - Error message displays, upload can be retried

- [ ] **TC-E003:** Simulate 500 error from backend
  - User-friendly error message displays

### 8.2 Edge Cases

- [ ] **TC-E004:** Submit form with very long shop name (>200 chars)
  - Validation error or truncation

- [ ] **TC-E005:** Submit form with special characters in name
  - Accepts valid special characters

- [ ] **TC-E006:** Create shop at coordinates (0, 0)
  - Accepted if valid for business logic

- [ ] **TC-E007:** Set operating hours with open > close time
  - Validation should catch this if enforced

---

## 9. Performance Testing

### 9.1 Load Time

- [ ] **TC-P001:** Shop discovery page loads in < 2 seconds
  - With 50+ shops in database

- [ ] **TC-P002:** Catalog page loads in < 1.5 seconds
  - With 100+ items

- [ ] **TC-P003:** Image uploads complete in < 5 seconds
  - For 2MB image file

### 9.2 Geospatial Queries

- [ ] **TC-P004:** Geospatial query returns results in < 1 second
  - With 1000+ shops in database

- [ ] **TC-P005:** Radius filter update is responsive
  - UI updates within 500ms

---

## 10. Cross-Browser Testing

- [ ] **TC-B001:** Test on Chrome (latest)
- [ ] **TC-B002:** Test on Firefox (latest)
- [ ] **TC-B003:** Test on Safari (latest)
- [ ] **TC-B004:** Test on Edge (latest)

### Mobile Browser Testing

- [ ] **TC-B005:** Test on Chrome Mobile (Android)
- [ ] **TC-B006:** Test on Safari Mobile (iOS)

---

## 11. Accessibility Testing

- [ ] **TC-A001:** All forms have proper labels
- [ ] **TC-A002:** Keyboard navigation works throughout
- [ ] **TC-A003:** Screen reader announces key actions
- [ ] **TC-A004:** Color contrast meets WCAG AA standards
- [ ] **TC-A005:** Focus indicators are visible

---

## Bug Report Template

When a test fails, document the bug:

**Bug ID:** BUG-XXX  
**Test Case:** TC-XXX  
**Severity:** Critical / High / Medium / Low  
**Environment:** Dev / Staging / Prod  
**Browser:** Chrome 120 / Firefox 121 / etc.

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Result:**

**Actual Result:**

**Screenshots/Logs:**

**Additional Notes:**

---

## Sign-Off

- [ ] All critical test cases passed
- [ ] All high-priority test cases passed
- [ ] Known issues documented
- [ ] Phase 2 ready for deployment

**Tested By:** _____________  
**Date:** _____________  
**Signature:** _____________
