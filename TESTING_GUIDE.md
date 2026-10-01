# Testing Guide - Address Management & Order Flow

## Overview
This guide covers testing for the newly implemented Address Management feature with Geolocation & Shop Images, and the complete Order Flow from cart to delivery.

## Prerequisites
Before testing, ensure:
1. Database migration `003_addresses_geolocation_image.sql` has been run
2. Backend server is running
3. Frontend development server is running
4. At least one test user account exists (buyer role)
5. Products are available in the system

## Test Scenarios

### 1. End-to-End Buyer Order Flow

#### Test Case 1.1: Complete Order Flow with New Address
**Steps:**
1. Login as a buyer
2. Navigate to Products page
3. Add multiple products to cart (varying quantities)
4. Navigate to Cart page
5. Verify cart items display correctly
6. Click "Proceed to Checkout"
7. If no addresses exist:
   - Fill out the inline address form
   - Upload a shop/location image
   - Capture geolocation coordinates
   - Submit the form
8. Select the delivery address
9. Optionally add order notes
10. Click "Place Order"
11. Verify order confirmation
12. Navigate to Order Details
13. Verify address displays with image and map link

**Expected Results:**
- All products added to cart correctly
- Cart calculations are accurate
- Address creation succeeds with validation
- Geolocation captures successfully
- Image uploads to Cloudinary
- Order places successfully
- Order details show complete address information
- Cart clears after order placement

#### Test Case 1.2: Order Flow with Existing Address
**Steps:**
1. Login as a buyer with existing addresses
2. Add products to cart
3. Proceed to checkout
4. Select existing address
5. Click "Place Order"

**Expected Results:**
- Existing addresses load correctly
- Default address is pre-selected
- Order places successfully

#### Test Case 1.3: Add Address During Checkout
**Steps:**
1. Login as a buyer with existing addresses
2. Add products to cart
3. Proceed to checkout
4. Click "Add New" in address section
5. Fill and submit inline address form
6. Verify new address is selected
7. Complete order

**Expected Results:**
- Inline form displays correctly
- New address saves and auto-selects
- Order completes successfully

#### Test Case 1.4: Stock Validation
**Steps:**
1. Add products that exceed available stock
2. Proceed to checkout
3. Attempt to place order

**Expected Results:**
- Stock issues are flagged in cart
- Checkout shows stock warnings
- Order placement is blocked with clear error message

#### Test Case 1.5: MOQ Validation
**Steps:**
1. Add products below minimum order quantity
2. Proceed to checkout
3. Attempt to place order

**Expected Results:**
- MOQ violations are displayed
- Order placement is blocked
- Clear error messages guide user

### 2. Address Management Flow

#### Test Case 2.1: Create First Address
**Steps:**
1. Login as a new buyer (no addresses)
2. Navigate to Addresses page
3. Click "Add First Address"
4. Fill all required fields
5. Upload shop image
6. Capture geolocation
7. Submit form

**Expected Results:**
- Form validates all fields
- Image uploads successfully
- Geolocation captures with accuracy
- Address saves and displays
- Address is set as default automatically

#### Test Case 2.2: Add Multiple Addresses
**Steps:**
1. Create first address
2. Add second address
3. Add third address without setting as default

**Expected Results:**
- All addresses save correctly
- Only one default address exists
- Addresses list displays all addresses

#### Test Case 2.3: Edit Address Inline
**Steps:**
1. Click "Edit" on an address card
2. Modify fields
3. Change shop image
4. Update geolocation
5. Save changes

**Expected Results:**
- Form pre-fills with existing data
- Inline edit mode activates
- Updates save successfully
- Card returns to display mode

#### Test Case 2.4: Delete Address
**Steps:**
1. Click delete on a non-default address
2. Confirm deletion
3. Attempt to delete default address

**Expected Results:**
- Confirmation dialog shows
- Non-default address deletes
- Default address delete is blocked
- Helpful message explains why

#### Test Case 2.5: Set Default Address
**Steps:**
1. Click "Set as Default" on non-default address
2. Verify previous default is unset

**Expected Results:**
- New default is set
- Previous default loses default status
- Badge updates correctly

#### Test Case 2.6: Address Validation
**Steps:**
1. Try to submit form with missing required fields
2. Enter invalid phone number (not 10 digits)
3. Enter invalid postal code (not 6 digits)
4. Try to set only latitude without longitude

**Expected Results:**
- Validation errors display for each field
- Form doesn't submit until valid
- Error messages are clear and helpful

### 3. Geolocation Features

#### Test Case 3.1: Capture Location
**Steps:**
1. Click "Capture Location" button
2. Allow browser permission

**Expected Results:**
- Permission prompt appears
- Coordinates capture successfully
- Accuracy displays
- Coordinates display in readable format

#### Test Case 3.2: Permission Denied
**Steps:**
1. Click "Capture Location"
2. Deny browser permission

**Expected Results:**
- Error message explains issue
- Form remains functional
- Can still submit without coordinates

#### Test Case 3.3: View on Map
**Steps:**
1. Create address with geolocation
2. View in order details
3. Click "View on Map"

**Expected Results:**
- Link opens Google Maps in new tab
- Map centers on correct location

### 4. Image Upload Features

#### Test Case 4.1: Upload Shop Image
**Steps:**
1. Select valid image file (JPG, PNG, WebP)
2. Verify preview
3. Submit form

**Expected Results:**
- Preview displays immediately
- Image uploads to Cloudinary
- URL stores in database
- Image displays in address card

#### Test Case 4.2: Image Validation
**Steps:**
1. Try to upload file > 5MB
2. Try to upload non-image file
3. Try to upload unsupported format

**Expected Results:**
- Validation errors for each case
- Upload is blocked
- Clear error messages

#### Test Case 4.3: Remove Image
**Steps:**
1. Upload image
2. Click remove button
3. Submit form

**Expected Results:**
- Preview clears
- Form submits without image
- No errors occur

### 5. Admin Order Management Flow

#### Test Case 5.1: View Order Details
**Steps:**
1. Login as admin
2. Navigate to Orders page
3. Click on an order
4. Verify all information displays

**Expected Results:**
- Order items display correctly
- Delivery address shows with image and map
- Order status is accurate
- All sections are readable

#### Test Case 5.2: Assign Delivery Partner
**Steps:**
1. View pending order
2. Click "Assign Delivery"
3. Select delivery partner
4. Confirm assignment

**Expected Results:**
- Assignment modal opens
- Delivery partners list loads
- Assignment succeeds
- Status updates to "assigned"

#### Test Case 5.3: Update Order Status
**Steps:**
1. Update order through status progression
2. Verify status changes reflect in buyer view

**Expected Results:**
- Status updates successfully
- Timeline updates
- Buyer sees updated status

#### Test Case 5.4: View Address with Map
**Steps:**
1. Open order with geolocation data
2. View shop image
3. Click "View on Map"

**Expected Results:**
- Image displays correctly
- Coordinates show accurately
- Map link works correctly

### 6. Edge Cases & Error Handling

#### Test Case 6.1: Network Errors
**Steps:**
1. Disable network during address creation
2. Re-enable and retry

**Expected Results:**
- Error message displays
- Form data is retained
- Retry succeeds

#### Test Case 6.2: Concurrent Operations
**Steps:**
1. Start editing address
2. Open another tab and delete the same address

**Expected Results:**
- Appropriate error handling
- User is notified
- Data consistency maintained

#### Test Case 6.3: Browser Compatibility
**Test on:**
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

**Expected Results:**
- All features work across browsers
- Geolocation works on all
- Image upload works on all

## Known Issues & Limitations

### Current Limitations:
1. Database migration requires manual execution
2. Geolocation requires HTTPS in production
3. Image upload limited to 5MB
4. Single image per address (not multiple)

### Browser Geolocation Permissions:
- Requires user consent
- May not work in all environments
- Accuracy varies by device

## Testing Checklist

### Backend
- [ ] Migration runs successfully
- [ ] Address CRUD APIs work
- [ ] Image upload to Cloudinary works
- [ ] Validation works server-side
- [ ] Order placement includes address data

### Frontend
- [ ] Address list loads
- [ ] Address form validates
- [ ] Image upload works
- [ ] Geolocation captures
- [ ] Checkout address selection works
- [ ] Order details display address
- [ ] Admin views work correctly

### Integration
- [ ] Cart → Checkout → Order flow complete
- [ ] Address data persists correctly
- [ ] Images display in all views
- [ ] Map links work correctly
- [ ] Toasts show for all actions

### User Experience
- [ ] Loading states display
- [ ] Error messages are clear
- [ ] Form validation is helpful
- [ ] Mobile responsive
- [ ] Accessibility compliant

## Performance Considerations

### Monitoring Points:
1. Image upload speed
2. Geolocation capture time
3. Address list load time
4. Order placement duration

### Expected Performance:
- Image upload: < 3 seconds
- Geolocation capture: < 5 seconds
- Address CRUD: < 1 second
- Order placement: < 2 seconds

## Bug Reporting Template

```
**Title:** [Brief description]

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happens]

**Environment:**
- Browser: 
- OS: 
- User Role: 
- Network: 

**Screenshots/Logs:**
[Attach if available]

**Severity:** [Critical/High/Medium/Low]
```

## Test Data Requirements

### Test Users:
- Buyer with no addresses
- Buyer with multiple addresses
- Admin user

### Test Products:
- Products with sufficient stock
- Products with low stock
- Products with MOQ requirements

### Test Images:
- Valid image files (< 5MB)
- Invalid image files (for validation testing)
- Large files (> 5MB, for validation)

## Automated Testing (Future)

### Recommended Test Coverage:
1. Unit tests for validation functions
2. Integration tests for API endpoints
3. E2E tests for critical user flows
4. Visual regression tests for UI components

### Priority Test Automation:
1. Address CRUD operations
2. Order placement flow
3. Form validation
4. Image upload

## Success Criteria

The implementation is considered successful when:
1. ✅ All test cases pass
2. ✅ No critical bugs exist
3. ✅ Performance meets expectations
4. ✅ User experience is smooth
5. ✅ Edge cases are handled gracefully
6. ✅ Mobile responsive
7. ✅ Accessibility standards met

## Notes

- Test with real geolocation data when possible
- Use different network conditions (fast, slow, offline)
- Test on different devices and screen sizes
- Verify data consistency across all views
- Check browser console for errors
- Monitor network requests for failures

---

**Last Updated:** October 1, 2026
**Version:** 1.0
**Status:** Ready for Testing
