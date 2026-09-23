# Implementation Plan: Product Image Display Fix

## Overview
This implementation plan follows the bugfix exploratory workflow: Explore → Preserve → Implement → Validate. We will first write tests to understand the bug (Bug Condition), then write tests to preserve existing behavior (Preservation Requirements), then implement the fix, and finally validate that the fix works without breaking existing functionality.

---

## Phase 1: Exploration

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Product Image Upload Failure Detection
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate where in the pipeline images are lost (frontend FormData, backend multer, Cloudinary upload, or database insert)
  - **Scoped PBT Approach**: For this deterministic bug, scope the property to concrete failing cases: product creation with 1-3 selected image files
  - Test implementation details from Bug Condition in design:
    - Input: Admin creates product with `formData.hasImages == true` and `files.length > 0`
    - Expected behavior: Images uploaded to Cloudinary AND image metadata inserted to database AND `primary_image_url` set
    - Bug condition: `NOT imagesUploadedToCloudinary(input) OR NOT imageMetadataInsertedToDatabase(input)`
  - The test assertions should match the Expected Behavior Properties from design:
    - `result.product.primaryImageUrl != NULL`
    - `result.product.images.length > 0`
    - `allImagesUploadedToCloudinary(result)`
    - `allImageMetadataInDatabase(result)`
  - **Test Strategy**: Add debug logging at each stage of the upload pipeline:
    1. Frontend: Log FormData contents and File objects in browser console
    2. Network: Check browser DevTools Network tab for files in request payload
    3. Backend multer: Check logs for "Files received by multer: { fileCount: X }"
    4. Cloudinary: Check logs for "Uploading X images to Cloudinary..."
    5. Database: Check logs for "Product created successfully: { imageCount: X }"
  - Run test on UNFIXED code using the frontend form
  - **EXPECTED OUTCOME**: Test FAILS at one of the stages above (most likely frontend FormData construction or axios Content-Type header issue)
  - Document counterexamples found:
    - Which stage shows the failure (e.g., "fileCount = 0 in multer logs but files visible in Network tab FormData")
    - Specific error messages or missing data
    - Screenshots of browser DevTools Network tab showing FormData payload
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

---

## Phase 2: Preservation

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Product Creation Without Images
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (product creation without images):
    1. Create product with no images selected → observe NULL primary_image_url
    2. Create product with invalid data (missing SKU) → observe validation error
    3. Create product with duplicate SKU → observe 409 conflict error
    4. Create product as non-admin user → observe 403 forbidden error
    5. Fetch created product via GET /api/v1/products/:id → observe all fields correct
    6. Fetch products via GET /api/v1/products/buyer → observe products appear correctly
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements:
    - **Property**: For all product creation requests where `formData.hasImages == false` OR `files.length == 0`, behavior should be unchanged
    - Test: Product creates successfully with NULL primary_image_url
    - Test: Product data validation (SKU uniqueness, required fields) works correctly
    - Test: Backend validation and authorization middleware work correctly
    - Test: Product fetching via GET endpoints returns correct data
    - Test: Error handling works correctly (invalid Cloudinary credentials, network timeouts)
  - Property-based testing generates many test cases for stronger guarantees:
    - Generate random product data with 0 images
    - Generate random invalid product data
    - Generate random user roles (non-admin)
    - Verify all produce expected errors or successful creation without images
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

---

## Phase 3: Implementation

- [x] 3. Fix for product image upload bug

  - [x] 3.1 Implement Content-Type header fix in API service
    - **File**: `frontend/src/services/api.service.ts`
    - Remove hardcoded `'Content-Type': 'application/json'` from axios instance defaults
    - Add request interceptor logic to detect FormData and let browser set Content-Type with boundary:
      ```typescript
      apiClient.interceptors.request.use((config) => {
        // Let browser set Content-Type for FormData (includes boundary parameter)
        if (config.data instanceof FormData) {
          delete config.headers['Content-Type'];
        }
        return config;
      });
      ```
    - This allows the browser to automatically set `multipart/form-data; boundary=...` header
    - _Bug_Condition: isBugCondition(input) where input.formData.hasImages == true AND input.files.length > 0_
    - _Expected_Behavior: Images uploaded to Cloudinary AND image metadata inserted to database (from design)_
    - _Preservation: Product creation without images continues to work with NULL primary_image_url (Preservation Requirements from design)_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2_

  - [x] 3.2 Add debug logging to frontend form submission
    - **File**: `frontend/src/components/products/ProductFormModal.tsx`
    - In `handleSubmit` function, before calling `productService.createProduct()`, add logging:
      ```typescript
      console.log('Submitting product with images:', {
        imageCount: newImageFiles.length,
        files: newImageFiles.map(f => ({
          name: f.name,
          size: f.size,
          type: f.type
        }))
      });
      ```
    - This helps verify that File objects are being passed to the service
    - _Bug_Condition: Verify files are present before API call_
    - _Expected_Behavior: Console shows file count > 0 and valid File properties_
    - _Preservation: No impact on existing form validation or submission logic_
    - _Requirements: 2.1, 2.2_

  - [x] 3.3 Add debug logging to product service
    - **File**: `frontend/src/services/product.service.ts`
    - In `createProduct` function, after constructing FormData, add logging:
      ```typescript
      console.log('FormData constructed:', {
        hasImages: images.length > 0,
        imageCount: images.length
      });
      // Log the FormData entries
      for (let [key, value] of formData.entries()) {
        console.log(`FormData entry: ${key}`, value);
      }
      ```
    - This helps verify that images are being appended to FormData correctly
    - _Bug_Condition: Verify FormData contains image File objects_
    - _Expected_Behavior: Console shows 'images' entries with File objects_
    - _Preservation: No impact on existing service methods_
    - _Requirements: 2.1, 2.2_

  - [x] 3.4 Verify backend logging is working
    - **Files**: `backend/src/middleware/upload.js`, `backend/src/controller/productController.js`
    - Backend already has comprehensive logging from previous diagnostic work
    - No changes needed - logging already shows:
      - Files received by multer with file count
      - Cloudinary upload progress
      - Product creation with image count
    - This step just confirms logs are visible and working
    - _Bug_Condition: Logs will show if files reach the backend_
    - _Expected_Behavior: Logs show fileCount > 0 when images are sent_
    - _Preservation: No changes to existing backend logic_
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.5 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Product Image Upload Success
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Test the full flow using the frontend form:
      1. Log in as admin user
      2. Navigate to Products → Add Product
      3. Fill in all required fields (SKU, name, price, stock, category)
      4. Select 2-3 image files in the ImageUploadZone
      5. Click "Create Product"
      6. Check browser console for frontend logs
      7. Check browser DevTools Network tab for FormData with images
      8. Check backend console for multer logs showing fileCount > 0
      9. Check backend console for Cloudinary upload logs
      10. Check backend console for product creation log showing imageCount > 0
      11. Verify product appears in product list with images
      12. Query database to verify product_images table has rows
    - **EXPECTED OUTCOME**: Test PASSES at all stages (confirms bug is fixed)
    - Document success:
      - Frontend logs show files being sent
      - Network tab shows files in FormData payload
      - Backend logs show files received by multer
      - Cloudinary logs show successful uploads
      - Database shows image metadata inserted
      - Product displays images in buyer interface
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.6 Verify preservation tests still pass
    - **Property 2: Preservation** - Product Creation Without Images
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2:
      1. Create product without selecting images → verify NULL primary_image_url
      2. Create product with invalid data → verify same validation errors
      3. Create product with duplicate SKU → verify same 409 error
      4. Create product as non-admin → verify same 403 error
      5. Fetch product via GET /api/v1/products/:id → verify correct data
      6. Fetch products via GET /api/v1/products/buyer → verify correct display
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all preservation tests still pass after fix
    - Document that no existing functionality was broken
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

---

## Phase 4: Validation

- [x] 4. Populate images for existing products
  - PROD-001 (SALT 25 KG BAGS) currently has NULL primary_image_url
  - PROD-002 (test product 2) currently has NULL primary_image_url
  - Options for populating images:
    1. **Use frontend form**: Edit each product and upload images through the fixed admin interface
    2. **Direct database insert**: Manually upload images to Cloudinary and insert URLs into database
    3. **Backend script**: Create a script to bulk upload images for existing products
  - Recommended approach: Use frontend form (validates that edit functionality also works)
  - Test both single image and multiple images per product
  - Verify images display correctly in buyer interface after population
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 5. Checkpoint - Ensure all tests pass and images display correctly
  - **Summary**: Verify the complete fix
  - All exploration tests pass (bug is fixed)
  - All preservation tests pass (no regressions)
  - Existing products PROD-001 and PROD-002 now have images
  - New products can be created with images through admin interface
  - Images display correctly in buyer interface
  - Backend logs show successful flow for all operations
  - Database product_images table contains rows for all products with images
  - If any issues arise, ask the user for guidance before proceeding

---

## Notes

### Bug Condition (from Design)
```
isBugCondition(input):
  input.formData.hasImages == true
  AND input.files.length > 0
  AND input.userRole == 'admin'
  AND (NOT imagesUploadedToCloudinary(input)
       OR NOT imageMetadataInsertedToDatabase(input))
```

### Expected Behavior (from Design)
For all inputs where isBugCondition(input) returns true:
- `result.product.primaryImageUrl != NULL`
- `result.product.images.length > 0`
- `allImagesUploadedToCloudinary(result)`
- `allImageMetadataInDatabase(result)`

### Preservation Requirements (from Design)
For all inputs where isBugCondition(input) returns false:
- Product creation without images works with NULL primary_image_url
- Product fetching via GET /api/v1/products/buyer returns correct data
- Backend validation (SKU uniqueness, required fields) works correctly
- Frontend form validation and user feedback work correctly
- Error handling for invalid Cloudinary credentials works gracefully
- Multiple image upload support (with display_order) continues to work

### Root Cause (Hypothesized from Design)
The most likely root cause is the axios instance setting `Content-Type: 'application/json'` which prevents FormData from being sent correctly. When FormData is sent with the wrong Content-Type, the backend receives an empty body or cannot parse the multipart data. The fix removes the default Content-Type header and adds FormData detection in the request interceptor to let the browser set the correct `multipart/form-data; boundary=...` header.
