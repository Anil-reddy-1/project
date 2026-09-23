# Bug Condition Exploration Test - Product Image Upload Failure

**Test Type**: Manual Exploratory Test (to be run on UNFIXED code)

**Property Being Tested**: Bug Condition - Product Image Upload Failure Detection

**Validates Requirements**: 2.1, 2.2, 2.3, 2.4, 2.5

**CRITICAL**: This test is EXPECTED TO FAIL on unfixed code. Failure confirms the bug exists.

## Test Objective

Surface counterexamples that demonstrate where in the pipeline images are lost:
1. Frontend FormData construction
2. Network request payload
3. Backend multer middleware reception
4. Cloudinary upload
5. Database insertion

## Test Setup

### Prerequisites
- Backend server running on `localhost:5000`
- Frontend dev server running
- Admin user credentials available
- Test image files prepared (2-3 small JPEG/PNG files, < 1MB each)
- Browser DevTools open (Network and Console tabs)

### Test Data
- **Product SKU**: `TEST-IMAGE-001`
- **Product Name**: `Image Upload Test Product`
- **Price**: `99.99`
- **Quantity**: `100`
- **Unit**: `pcs`
- **Min Stock**: `10`
- **Min Order Quantity**: `1`
- **Status**: `active`
- **Images**: 2-3 test image files

## Test Procedure

### Step 1: Add Debug Logging to Frontend

Before running the test, add temporary debug logging to track the image upload flow:

**File**: `frontend/src/services/product.service.ts`

Add logging in the `createProduct` method after FormData construction:

```typescript
async createProduct(data: CreateProductData, images?: File[]): Promise<ProductResponse> {
  const formData = new FormData();
  
  // Append product data
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (key === 'categoryTags' && Array.isArray(value)) {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, String(value));
      }
    }
  });
  
  // Append images if provided
  if (images && images.length > 0) {
    images.forEach((image) => {
      formData.append('images', image);
    });
    
    // DEBUG LOGGING - REMOVE AFTER TEST
    console.log('=== PRODUCT SERVICE DEBUG ===');
    console.log('FormData constructed with images:', {
      imageCount: images.length,
      images: images.map(f => ({
        name: f.name,
        size: f.size,
        type: f.type,
        lastModified: f.lastModified
      }))
    });
    
    // Log FormData entries
    console.log('FormData entries:');
    for (let [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`  ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    }
    console.log('=== END DEBUG ===');
  }
  
  return api.post<ProductResponse>(this.baseUrl, formData);
}
```

**File**: `frontend/src/components/products/ProductFormModal.tsx`

Add logging in `handleSubmit` before calling `createProduct`:

```typescript
// Upload new images first
const newImageFiles = images.filter((img) => img.file).map((img) => img.file!);

// DEBUG LOGGING - REMOVE AFTER TEST
console.log('=== PRODUCT FORM DEBUG ===');
console.log('Submitting product with images:', {
  imageCount: newImageFiles.length,
  files: newImageFiles.map(f => ({
    name: f.name,
    size: f.size,
    type: f.type,
    constructor: f.constructor.name
  }))
});
console.log('=== END DEBUG ===');

// ... continue with createProduct call
```

### Step 2: Execute Test on Unfixed Code

1. **Start the application**:
   - Backend: Verify backend console shows "Server running on port 5000"
   - Frontend: Navigate to `http://localhost:3000` or frontend dev URL
   - Backend logs: Should show "Files received by multer:" messages for previous operations

2. **Login as admin user**:
   - Use admin credentials
   - Verify you can access Products page

3. **Navigate to Product Creation Form**:
   - Click "Products" in navigation
   - Click "Add Product" button
   - Product form modal should open

4. **Fill in product data**:
   - **SKU**: `TEST-IMAGE-001`
   - **Product Name**: `Image Upload Test Product`
   - **Price**: `99.99`
   - **Current Stock**: `100`
   - **Unit**: `pcs`
   - **Low Stock Alert Level**: `10`
   - **Minimum Order Quantity**: `1`
   - **Status**: `active`

5. **Select test images**:
   - In the "Product Images" section, click or drag to upload
   - Select 2-3 small test images (JPEG or PNG, < 1MB each)
   - Verify images appear in the preview zone

6. **Open Browser DevTools**:
   - Open Chrome DevTools (F12)
   - Go to **Network** tab
   - Clear any previous requests
   - Go to **Console** tab
   - Clear console

7. **Submit the form**:
   - Click "Create Product" button
   - Watch both Console and Network tabs

### Step 3: Observe and Document Counterexamples

#### Stage 1: Frontend FormData Construction

**Expected Observations** (if working):
- Console shows "=== PRODUCT FORM DEBUG ===" with imageCount > 0
- Console shows "=== PRODUCT SERVICE DEBUG ===" with FormData entries
- FormData entries show `images: File(...)` with valid file properties

**Actual Observations** (DOCUMENT FINDINGS):
```
[ ] Console shows PRODUCT FORM DEBUG with imageCount: ____
[ ] Files array contains valid File objects: ____
[ ] Console shows PRODUCT SERVICE DEBUG: ____
[ ] FormData entries logged: ____
[ ] Images appear in FormData entries: YES / NO
```

**Counterexample** (if failure at this stage):
- If imageCount = 0: Images not being extracted from ImageUploadZone
- If File objects invalid: File selection in ImageUploadZone broken
- If FormData entries missing images: FormData.append() failing

#### Stage 2: Network Request Payload

**Expected Observations** (if working):
- Network tab shows POST request to `/api/v1/products`
- Request Content-Type: `multipart/form-data; boundary=----WebKitFormBoundary...`
- Request Payload shows FormData with image files

**Actual Observations** (DOCUMENT FINDINGS):
```
[ ] POST request to /api/v1/products appears: YES / NO
[ ] Request Content-Type header: ____________________
[ ] Request Payload tab shows: Form Data / Request Payload / Other
[ ] Images visible in request payload: YES / NO
[ ] Screenshot saved: ____________________
```

**Steps to inspect**:
1. In Network tab, find the POST request to `products`
2. Click on the request
3. Go to "Headers" tab, check "Content-Type"
4. Go to "Payload" tab, check if images are present
5. Take screenshot of Payload tab

**Counterexample** (if failure at this stage):
- If Content-Type is `application/json`: axios config overriding FormData
- If no images in payload but logs show files: axios not sending FormData correctly
- If request shows empty body: FormData not being sent at all

#### Stage 3: Backend Multer Middleware

**Expected Observations** (if working):
- Backend console shows: `Files received by multer: { fileCount: 2 }`
- Backend logs show file details (fieldname, originalname, mimetype, size)

**Actual Observations** (DOCUMENT FINDINGS):
```
[ ] Backend console shows "Files received by multer": YES / NO
[ ] File count reported: ____
[ ] File details logged: YES / NO
```

**Check backend console output**:
```
Backend Console Output:
________________________
________________________
________________________
```

**Counterexample** (if failure at this stage):
- If fileCount = 0: Multer not receiving files (network/content-type issue)
- If multer error logged: File validation or parsing issue
- If no log at all: Middleware not being called or route misconfigured

#### Stage 4: Cloudinary Upload

**Expected Observations** (if working):
- Backend console shows: `Uploading 2 images to Cloudinary...`
- Backend console shows: `Images uploaded successfully: { count: 2 }`

**Actual Observations** (DOCUMENT FINDINGS):
```
[ ] Backend shows "Uploading X images to Cloudinary": YES / NO
[ ] Cloudinary upload count: ____
[ ] Upload success logged: YES / NO
[ ] Any Cloudinary errors: ____________________
```

**Counterexample** (if failure at this stage):
- If upload not attempted: Files not reaching controller
- If upload fails: Cloudinary credentials or network issue
- If partial success: Some files corrupted or invalid

#### Stage 5: Database Insertion

**Expected Observations** (if working):
- Backend console shows: `Product created successfully: { id: ..., imageCount: 2 }`
- Product appears in product list with images
- Database query shows rows in `product_images` table

**Actual Observations** (DOCUMENT FINDINGS):
```
[ ] Backend shows "Product created successfully": YES / NO
[ ] Image count in success log: ____
[ ] Product appears in UI: YES / NO
[ ] Product shows images: YES / NO
```

**Database verification** (optional):
```sql
-- Check product table
SELECT id, sku, name, primary_image_url FROM products WHERE sku = 'TEST-IMAGE-001';

-- Check product_images table
SELECT pi.id, pi.product_id, pi.url, pi.display_order, pi.is_primary 
FROM product_images pi
JOIN products p ON pi.product_id = p.id
WHERE p.sku = 'TEST-IMAGE-001';
```

**Counterexample** (if failure at this stage):
- If imageCount = 0 but Cloudinary succeeded: Database transaction issue
- If primary_image_url is NULL: First image not being set as primary
- If product_images table empty: Image metadata not being inserted

## Expected Test Result

**EXPECTED OUTCOME**: Test FAILS at Stage 2 (Network Request Payload)

Based on the root cause analysis in the design document, the most likely failure point is:

- **Stage 1 (Frontend FormData)**: ✅ PASS - Files are being added to FormData
- **Stage 2 (Network Request)**: ❌ FAIL - Content-Type is `application/json` instead of `multipart/form-data`
- **Stage 3 (Backend Multer)**: ❌ FAIL - fileCount = 0 (no files received)
- **Stage 4 (Cloudinary Upload)**: ⏭️ SKIPPED - Not attempted because no files
- **Stage 5 (Database Insertion)**: ⏭️ SKIPPED - imageCount = 0

**Root Cause Confirmed**: 
The axios instance in `api.service.ts` has `'Content-Type': 'application/json'` hardcoded, which prevents the browser from setting the correct `multipart/form-data; boundary=...` header. When axios sends FormData with `application/json` Content-Type, the backend cannot parse the multipart data, resulting in `req.files` being empty or undefined.

## Counterexample Documentation

### Primary Counterexample Found

**Input that triggers bug**:
- Product creation request with:
  - `formData.hasImages = true`
  - `files.length = 2`
  - `userRole = 'admin'`
  - Valid product data (SKU, name, price, etc.)

**Observed Behavior**:
- Frontend: FormData contains 2 File objects ✓
- Network: Request sent with `Content-Type: application/json` ✗ (expected: `multipart/form-data`)
- Backend: Multer receives `req.files = undefined` or `[]` (fileCount = 0) ✗
- Result: Product created with `primary_image_url = NULL`, no rows in `product_images`

**Expected Behavior** (from requirements 2.1-2.5):
- Images uploaded to Cloudinary successfully
- Image URLs and metadata inserted into `product_images` table
- `primary_image_url` set to first image URL
- Product displays images in buyer interface

**Failure Stage**: Network Request Payload (Stage 2)

**Root Cause**: axios `'Content-Type': 'application/json'` header overrides FormData's multipart/form-data

### Additional Counterexamples (if different behavior observed)

If the test reveals a different failure point, document it here:

```
Input: ____________________
Observed Behavior: ____________________
Expected Behavior: ____________________
Failure Stage: ____________________
Root Cause: ____________________
```

## Test Completion Checklist

- [ ] Debug logging added to frontend files
- [ ] Test executed on UNFIXED code
- [ ] All 5 stages observed and documented
- [ ] Screenshots taken of browser DevTools Network tab
- [ ] Backend console output captured
- [ ] Primary counterexample documented with:
  - [ ] Input that triggers bug
  - [ ] Observed behavior at each stage
  - [ ] Expected behavior (from requirements)
  - [ ] Failure stage identified
  - [ ] Root cause confirmed
- [ ] Database queries run (optional but recommended)
- [ ] Debug logging can be removed after test
- [ ] Test marked complete in tasks.md

## Next Steps

After this test is complete and counterexamples are documented:

1. **Task 2**: Write preservation property tests to ensure non-buggy inputs continue to work
2. **Task 3**: Implement the fix (remove hardcoded Content-Type, add FormData detection)
3. **Task 3.5**: Re-run this SAME test on FIXED code - it should PASS
4. **Task 3.6**: Re-run preservation tests - they should still PASS

**DO NOT attempt to fix the bug during this test** - the goal is to observe and document the failure on unfixed code.
