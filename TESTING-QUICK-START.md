# 🚀 Quick Start: Phase 4 Testing with Mock Payments

**Status:** Ready for Task A3 - Frontend Testing
**Last Updated:** 2026-07-25

---

## ✅ What's Been Completed

### Phase A - Tasks A1 & A2 (Complete)
- ✅ PhonePe mock mode implemented
- ✅ Comprehensive backend tests passing (3/3)
- ✅ Status mapping fixed
- ✅ Environment configuration updated
- ✅ Test scripts created

**Result:** Backend payment mocking is fully functional and tested.

---

## 🎯 Current Task: A3 - Frontend Integration Testing

**Objective:** Test the complete payment flow from frontend checkout to order creation.

---

## 🏃 How to Run Tests

### Step 1: Start Backend Server

```bash
cd backend
npm run dev
```

**Expected Output:**
```
[PhonePe] MOCK MODE ENABLED - Using simulated payment flow
Server running on port 3001
```

✅ **Verify:** Visit http://localhost:3001/health (should return `{"status":"ok"}`)

### Step 2: Start Frontend Server

```bash
cd frontend  
npm run dev
```

**Expected Output:**
```
   ▲ Next.js 15.x.x
   - Local:        http://localhost:3000
```

✅ **Verify:** Visit http://localhost:3000 (should show login page)

### Step 3: Run Manual Tests

Follow the checklist in:
📄 **`reference-docs/PHASE-A3-FRONTEND-TESTING-CHECKLIST.md`**

**Key Tests:**
1. ✅ Successful prepaid payment
2. ✅ Failed payment handling
3. ✅ COD order placement
4. ✅ Payment callback pages
5. ✅ Order creation verification

---

## 🔍 How to Verify Mock Mode is Working

### Backend Console Output:
When you place an order with prepaid payment, you should see:

```
[PhonePe] MOCK MODE ENABLED - Using simulated payment flow
[PhonePe Mock] Transaction ID: MT-1784991020489-RXWJ5LH
[PhonePe Mock] Amount: 1250.5 INR
```

### Payment Auto-Completion:
- Mock payments start as `PENDING`
- After 2 seconds, they automatically become `COMPLETED` (paid)
- Status checks will show this transition

### No Real API Calls:
- Mock mode does NOT call PhonePe sandbox
- Everything happens locally
- Fast and reliable testing

---

## 📋 Test Credentials

### Admin Account:
Check your seed script or backend `.env` for:
- Email: `ADMIN_EMAIL`
- Password: `ADMIN_PASSWORD`

### Wholesaler Account:
Created via seed script (`scripts/setup-single-shop.ts`)

### Retailer Account:
Use the self-signup flow:
1. Go to http://localhost:3000
2. Click "Sign Up as Retailer"
3. Create account
4. Login

---

## 🧪 Testing Different Payment Scenarios

### Success (Default):
Just complete the checkout - mock auto-completes after 2 seconds.

### Failure:
Method 1: Temporarily modify mock code to default to FAILED
Method 2: Quickly run in backend console after order:
```typescript
phonePeService.setMockPaymentState('MT-xxxxx', 'FAILED');
```

### Pending:
Check status before 2 seconds elapsed.

---

## 📊 What to Check in Firestore

After each test, verify in Firestore Console:

### `orders` collection:
- Order document exists
- `status`: `PENDING_APPROVAL`
- `paymentStatus`: `paid` / `failed` / `pending`
- `merchantTransactionId`: present for prepaid orders

### `payments` collection:
- Payment document exists
- Linked to order via `orderId`
- `status`: matches payment outcome
- `method`: `phonepe` or `cod`

---

## ⚠️ Common Issues & Solutions

### Issue: Backend shows "PhonePe configuration is incomplete"
**Solution:** Check `backend/.env` has `PHONEPE_MERCHANT_ID` and `PHONEPE_SALT_KEY`

### Issue: Mock mode not activating
**Solution:** Verify `backend/.env` has `PHONEPE_MOCK_MODE=true`

### Issue: Payment doesn't auto-complete
**Solution:** Wait at least 2 seconds before checking status

### Issue: Orders not appearing
**Solution:** Check backend console for errors, verify Firestore credentials

### Issue: CORS errors
**Solution:** Verify `CORS_ORIGIN=http://localhost:3000` in backend `.env`

---

## 📝 Documenting Test Results

As you test, fill out:
- **`PHASE-A3-FRONTEND-TESTING-CHECKLIST.md`** - Mark ✅ or ❌ for each test
- Take screenshots of success/failure pages
- Note any bugs or unexpected behavior
- Record test execution date and time

---

## 🎬 Next Steps After A3 Completion

Once all frontend payment tests pass:

### Phase B: Phase 4 Feature Testing
1. Test wholesaler approval flow
2. Test inventory locking (atomic operations)
3. Test OTP generation for pickup
4. Test state transitions
5. Test notifications
6. Create comprehensive test report

### Phase C: Phase 5 Preparation
1. Review delivery assignment requirements
2. Research geospatial solutions
3. Design delivery algorithm
4. Create Phase 5 task breakdown

---

## 📚 Reference Documentation

- **Testing Plan:** `reference-docs/PHASE-4-TESTING-PLAN.md`
- **Mock Implementation:** `reference-docs/PHASE-A-MOCK-PAYMENT-IMPLEMENTATION.md`
- **Frontend Checklist:** `reference-docs/PHASE-A3-FRONTEND-TESTING-CHECKLIST.md`
- **Progress Log:** `reference-docs/progress.md`

---

## 🎯 Success Criteria for Task A3

Task A3 is complete when:
- ✅ Backend server running with mock mode
- ✅ Frontend server running
- ✅ Prepaid payment success flow works
- ✅ Prepaid payment failure handled
- ✅ COD orders work
- ✅ Orders created in Firestore correctly
- ✅ Payment statuses recorded accurately
- ✅ No critical bugs
- ✅ Test results documented

---

## 💡 Tips for Effective Testing

1. **Test in order:** Follow the checklist sequence
2. **Clear Firestore:** Between major tests, consider clearing test data
3. **Check console:** Always monitor both frontend and backend consoles
4. **Take notes:** Document unexpected behavior immediately
5. **Screenshots:** Capture evidence for the test report

---

**Ready to test?** Start both servers and open the frontend checklist! 🚀

---

**Questions or Issues?**
- Check backend logs for detailed error messages
- Review mock implementation: `backend/src/services/phonepe.service.ts`
- Verify environment configuration: `backend/.env`
- Run backend mock tests: `cd backend && npx ts-node scripts/test-phonepe-mock.ts`
