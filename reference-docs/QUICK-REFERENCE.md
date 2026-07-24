# Quick Reference — Single-Shop Platform

**Last Updated:** 2026-07-22  
**Phase:** 4 Complete (100%)

---

## 🎯 Current Status

✅ **Phase 2.5:** Single-shop migration complete (100%)  
✅ **Phase 3:** Order placement & payments complete (100%)  
✅ **Phase 4:** Wholesaler approval & inventory lock complete (100%)  
⏳ **Next:** Phase 5 (Delivery Partner Assignment)

---

## 🏗️ Architecture

**Model:** Single Wholesaler, Single Shop (NOT marketplace)

- **ONE Admin** - Platform manager
- **ONE Wholesaler** - Business owner
- **ONE Shop** - Wholesale location
- **MANY Retailers** - Customers
- **MANY Delivery Partners** - Fulfillment

---

## 🚀 Quick Start (First Time Setup)

### 1. Setup Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with Firebase credentials
npm run build
```

### 2. Run Seed Script (One-Time)
```bash
cd backend
npx ts-node scripts/setup-single-shop.ts
# Save the generated passwords!
```

### 3. Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### 4. Start Backend
```bash
cd backend
npm run dev
# Server runs on http://localhost:3001
```

### 5. Setup Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local
# Edit .env.local with backend URL
npm run build
```

### 6. Start Frontend
```bash
cd frontend
npm run dev
# App runs on http://localhost:3000
```

---

## 📁 Key Files

### Backend
```
backend/src/
├── middleware/single-shop-validation.ts  (Prevents multiple shops/wholesalers)
├── routes/shops.routes.ts                (Shop CRUD with validation)
├── routes/auth.routes.ts                 (User management with validation)
├── routes/orders.routes.ts               (Order management)
├── utils/snapshot.ts                     (getSingleShopId, getSingleWholesalerId)
└── scripts/setup-single-shop.ts          (Initial setup script)
```

### Frontend
```
frontend/app/
├── (admin)/admin/page.tsx                (Admin dashboard - 6 tabs)
├── (retailer)/retailer/catalog/page.tsx  (Direct catalog access)
├── (retailer)/retailer/page.tsx          (Retailer home)
├── (retailer)/retailer/checkout/page.tsx (Checkout flow)
├── (retailer)/retailer/orders/page.tsx   (Order history)
└── (wholesaler)/wholesaler/page.tsx      (Wholesaler dashboard)
```

### Documentation
```
reference-docs/
├── PHASE-2.5-FINAL-STATUS.md       (Current status)
├── DEPLOYMENT-GUIDE.md             (Deployment steps)
├── NEXT-STEPS.md                   (Testing guide)
├── ADMIN-DASHBOARD-UPDATE-SUMMARY.md (Dashboard reference)
└── progress.md                     (Overall progress)
```

---

## 🧪 Testing Commands

### Test Shop Prevention
```bash
TOKEN="<admin_token>"
curl -X POST http://localhost:3001/shops \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Shop 2","category":"grocery","address":"Test","moqThreshold":500}'
# Should return 400 error
```

### Test Wholesaler Prevention
```bash
TOKEN="<admin_token>"
curl -X POST http://localhost:3001/auth/set-role \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"uid":"test-uid","role":"wholesaler"}'
# Should return 400 error
```

### Check Health
```bash
curl http://localhost:3001/health
# Should return {"status":"ok","timestamp":"..."}
```

---

## 👤 User Roles & Access

### Admin (`/admin`)
- View THE shop (info, edit, manage items)
- View all orders
- Manage users (wholesaler, retailers, delivery partners)
- Suspend/reactivate accounts
- Approve/reject signups
- Create accounts

### Wholesaler (`/wholesaler`)
- Manage catalog (add/edit/delete products)
- View orders (pending approval)
- Approve/reject orders (Phase 4)
- Manage inventory
- Generate pickup OTPs

### Retailer (`/retailer`)
- Browse catalog
- Add to cart
- Checkout & pay
- View order history
- Track orders

### Delivery Partner (`/delivery`)
- View assigned orders
- Update delivery status
- Mark deliveries complete
- Report issues

---

## 📊 Admin Dashboard Tabs

1. **Shop** - Manage THE single shop
   - Shop info card
   - Edit Details button
   - Manage Items button

2. **Orders** - View all orders
   - Order table
   - Status badges
   - View details

3. **Users** - Manage accounts
   - **Wholesaler** subtab (view-only, suspend/reactivate)
   - **Retailers** subtab (approve/reject/suspend)
   - **Delivery Partners** subtab (approve/reject/suspend)

4. **Deliveries** - (Placeholder for Phase 5+)

5. **Payments** - (Placeholder for Phase 7+)

6. **Insights** - (Placeholder for Phase 9+)

---

## 🔒 Single-Shop Constraints

### Enforced by Backend Middleware:
- ✅ Only ONE shop can be created
- ✅ Only ONE wholesaler can exist
- ✅ Shop owner cannot be changed
- ✅ Wholesaler cannot self-register

### Helper Functions:
```typescript
// backend/src/utils/snapshot.ts
getSingleShopId()       // Returns THE shop ID
getSingleWholesalerId() // Returns THE wholesaler UID
```

### Used Everywhere:
- Order creation (auto-assign shop/wholesaler)
- Catalog display (fetch THE shop)
- Validation middleware
- Admin dashboard

---

## 🛠️ Common Tasks

### Create Admin Account
```bash
cd backend
npx ts-node scripts/setup-single-shop.ts
```

### Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### Deploy Firestore Indexes
```bash
firebase deploy --only firestore:indexes
```

### Build Backend
```bash
cd backend
npm run build
```

### Build Frontend
```bash
cd frontend
npm run build
```

### Run Tests (When Available)
```bash
cd backend
npm test
```

---

## 📝 Environment Variables

### Backend (`.env`)
```env
PORT=3001
NODE_ENV=development
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
BREVO_API_KEY=your-brevo-key
BREVO_SENDER_EMAIL=noreply@yourdomain.com
BREVO_SENDER_NAME=Your Platform
PHONEPE_MERCHANT_ID=your-merchant-id
PHONEPE_SALT_KEY=your-salt-key
PHONEPE_SALT_INDEX=1
PHONEPE_MODE=sandbox
FRONTEND_URL=http://localhost:3000
```

### Frontend (`.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

---

## 🐛 Troubleshooting

### Backend won't start
- Check `.env` file exists and has all variables
- Verify Firebase credentials are correct
- Check port 3001 is not in use

### Frontend won't start
- Check `.env.local` file exists
- Verify `NEXT_PUBLIC_API_URL` points to backend
- Check port 3000 is not in use

### Admin dashboard shows empty
- Run seed script to create shop
- Check Firestore has shop document
- Verify backend is running and accessible

### Catalog shows "No shop found"
- Verify shop exists in Firestore
- Check shop is verified and active
- Check browser console for errors

### Can't create order
- Verify retailer is logged in
- Check cart has items
- Verify shop ID is auto-assigned
- Check backend logs for errors

---

## 📚 Documentation Index

### Getting Started:
- `DEPLOYMENT-GUIDE.md` - Full deployment steps
- `NEXT-STEPS.md` - Testing instructions
- `QUICK-START-AFTER-MIGRATION.md` - Setup guide

### Architecture:
- `SINGLE-SHOP-ARCHITECTURE.md` - Architecture overview
- `PRD.md` - Product requirements
- `schema.md` - Database schema

### Phase 2.5:
- `PHASE-2.5-FINAL-STATUS.md` - Current status
- `PHASE-2.5-COMPLETED.md` - What was done
- `MIGRATION-SUMMARY.md` - Migration details

### Phase 3:
- `PHASE-3-IMPLEMENTATION-PLAN.md` - Implementation plan
- `PHASE-3-QUICK-REFERENCE.md` - Quick reference

### Reference:
- `progress.md` - Overall project progress
- `implementation-plan.md` - All phases
- `app-flow.md` - User flows
- `rules.md` - Engineering rules

---

## 🎯 Next Steps

### Immediate:
1. Complete manual E2E tests
2. Begin Phase 5: Delivery Assignment

### Long-term:
3. Phase 6: OTP Handoffs
4. Phase 7: COD Ledger
5. Phase 8: Disputes
6. Phase 9: Analytics
7. Phase 10: Launch

---

## ✨ Key Features

### Phase 0-1 (Complete):
- Authentication
- Role management
- User onboarding

### Phase 2 (Complete):
- Shop setup
- Product catalog
- Inventory management

### Phase 2.5 (100% Complete):
- Single-shop architecture
- Admin dashboard redesign
- Direct catalog access

### Phase 3 (100% Complete):
- Shopping cart
- Checkout flow
- PhonePe payments
- Order management
- Email notifications

### Phase 4 (100% Complete):
- Wholesaler approval / rejection
- Inventory locking
- Packing & Ready for Pickup flow
- Pickup OTP generation

### Phase 5+ (Not Started):
- Delivery assignment
- COD ledger
- Disputes

---

**Made with ❤️ by Kiro AI**  
**Platform:** B2B Wholesale Order Management  
**Architecture:** Single Wholesaler, Single Shop  
**Status:** Ready for Testing 🚀
