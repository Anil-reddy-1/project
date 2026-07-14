# 🚀 Phase 2 Deployment Checklist

**Target:** Production deployment of Shop Setup & Catalog Management System  
**Date:** July 12, 2026  
**Status:** Ready for deployment ✅

---

## Pre-Deployment Verification

### 1. Environment Configuration

#### Backend (.env)
- [ ] `PORT` set correctly
- [ ] `NODE_ENV=production`
- [ ] `FRONTEND_URL` points to production frontend
- [ ] Firebase Admin SDK credentials present
- [ ] `FIREBASE_PROJECT_ID` correct
- [ ] `FIREBASE_PRIVATE_KEY` properly formatted (newlines escaped)
- [ ] `FIREBASE_CLIENT_EMAIL` correct
- [ ] Cloudinary credentials present (`CLOUDINARY_CLOUD_NAME`, `API_KEY`, `API_SECRET`)
- [ ] Brevo credentials present (`BREVO_API_KEY`, `BREVO_FROM_EMAIL`, `BREVO_FROM_NAME`)
- [ ] Razorpay credentials (Phase 3) - skip for now
- [ ] `CORS_ORIGIN` allows production frontend domain

#### Frontend (.env.local or production env)
- [ ] `NEXT_PUBLIC_FIREBASE_API_KEY` correct
- [ ] `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` correct
- [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID` correct
- [ ] `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` correct
- [ ] `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` correct
- [ ] `NEXT_PUBLIC_FIREBASE_APP_ID` correct
- [ ] `NEXT_PUBLIC_API_URL` points to production backend
- [ ] Firebase Admin SDK path correct for server-side
- [ ] Session cookie name and settings correct

### 2. Firebase Configuration

#### Firestore Indexes
```bash
# Deploy indexes (MUST run before app deployment)
firebase deploy --only firestore:indexes
```

**Expected indexes (6 total):**
- [ ] shops: verificationStatus + createdAt
- [ ] shops: verificationStatus + category
- [ ] shops: geohash
- [ ] products: isAvailable + updatedAt
- [ ] users: role + status
- [ ] users: role + createdAt

Verify in Firebase Console: Database → Firestore → Indexes

#### Firestore Security Rules
```bash
# Deploy security rules
firebase deploy --only firestore:rules
```

**Verify rules block:**
- [ ] Client writes to users collection
- [ ] Client writes to shops collection
- [ ] Client writes to products collection
- [ ] Client writes to orders collection (Phase 3)
- [ ] Allows reads with proper authentication

Test in Firebase Console: Rules Playground

#### Firebase Authentication
- [ ] Email/Password provider enabled
- [ ] Email templates customized (optional)
- [ ] Authorized domains include production domain
- [ ] Session cookie duration appropriate (14 days recommended)

### 3. Third-Party Services

#### Brevo Email Service
- [ ] API key is for production account (not test)
- [ ] Sender email verified in Brevo dashboard
- [ ] Sender domain authenticated (SPF/DKIM) for deliverability
- [ ] Test email sent successfully to real address
- [ ] Email templates rendered correctly in major clients (Gmail, Outlook)
- [ ] Unsubscribe link not required for transactional emails (verify compliance)

**Test Command:**
```bash
cd backend
node -e "require('./test-brevo.js')"
```

#### Cloudinary
- [ ] Production cloud name used
- [ ] Upload presets configured (if using unsigned uploads)
- [ ] Folder structure set up (shops/, products/)
- [ ] Transformation presets created (thumbnails, optimized)
- [ ] Media library organized
- [ ] Auto-backup enabled (optional but recommended)

### 4. Database State

#### Admin Account
- [ ] At least one admin account exists
- [ ] Admin account credentials known and documented
- [ ] Admin account email verified
- [ ] Admin custom claims set correctly (`role: 'admin'`)

#### Test Data
- [ ] Remove ALL test users (unless explicitly needed)
- [ ] Remove ALL test shops
- [ ] Remove ALL test items
- [ ] Verify collections are empty or contain only production seed data

**Clean Firestore collections:**
```bash
cd backend/scripts
npx ts-node delete-all-users.ts  # Review script first!
```

### 5. Code Quality

#### Backend
- [ ] No console.log statements in critical paths (use logger)
- [ ] All environment variables validated at startup
- [ ] Error messages don't leak sensitive info
- [ ] Rate limiting configured (if applicable)
- [ ] CORS properly restricted to frontend domain
- [ ] Helmet security headers enabled
- [ ] Request logging active (morgan)
- [ ] TypeScript compiled without errors (`npm run build`)
- [ ] No unused dependencies in package.json

#### Frontend
- [ ] Build completes without errors (`npm run build`)
- [ ] No console.error or console.warn in production code
- [ ] All API endpoints use production URL
- [ ] Loading states implemented for all async operations
- [ ] Error boundaries in place
- [ ] Responsive design verified on mobile/tablet/desktop
- [ ] Accessibility scan passed (lighthouse/axe)
- [ ] SEO meta tags present (if public pages exist)

### 6. Testing

#### Manual Testing (Critical Flows)

**Admin Flow:**
- [ ] Admin login works
- [ ] Can create new user accounts
- [ ] Email delivery confirmed for new accounts
- [ ] Can view all shops (pending/verified/rejected)
- [ ] Can verify shop
- [ ] Can reject shop
- [ ] Can suspend user
- [ ] Can reactivate user

**Wholesaler Flow:**
- [ ] Wholesaler login with admin-created account works
- [ ] Password reset link in email works
- [ ] Can access shop setup wizard
- [ ] Can detect location or enter coordinates manually
- [ ] Can upload shop photo
- [ ] Can save shop details
- [ ] Shop enters "pending" status after creation
- [ ] After admin verification, can access catalog page
- [ ] Can add new item with multiple images
- [ ] Can edit existing item
- [ ] Can delete item
- [ ] Can toggle item availability
- [ ] Search/filter works in catalog

**Retailer Flow:**
- [ ] Retailer self-signup works
- [ ] Can access shop discovery page
- [ ] Location-based search works
- [ ] Can filter by radius (5/10/20/50 km)
- [ ] Can search by shop name
- [ ] Can filter by category
- [ ] Distance display accurate
- [ ] Can click shop to view detail page
- [ ] Shop info displays correctly
- [ ] Catalog items load
- [ ] Can view item details (modal)
- [ ] Image carousel works
- [ ] Can add item to cart
- [ ] Cart drawer shows correct items
- [ ] Quantity controls work
- [ ] Stock limits enforced
- [ ] Cart total calculates correctly

**Email Delivery:**
- [ ] Admin-created account email received
- [ ] Password reset link works
- [ ] Email renders correctly in Gmail
- [ ] Email renders correctly in Outlook
- [ ] Fallback to console if Brevo fails (test by using invalid API key temporarily)

#### Performance Testing
- [ ] Shop list page loads in <2s
- [ ] Shop detail page loads in <2s
- [ ] Catalog page loads in <2s
- [ ] Image upload completes in <5s per image
- [ ] Geospatial queries return in <1s
- [ ] API endpoints respond in <500ms (average)

#### Load Testing (Optional but Recommended)
```bash
# Use Artillery, k6, or similar
# Test endpoints:
# - GET /shops (with geospatial query)
# - GET /shops/:shopId/items
# - POST /shops (authenticated)
# - POST /shops/:shopId/items (authenticated)
```

#### Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

### 7. Monitoring & Observability

#### Backend Monitoring
- [ ] Health check endpoint accessible: `GET /health`
- [ ] Logging configured (console or external service)
- [ ] Error tracking set up (Sentry, LogRocket, etc.) - optional
- [ ] Request metrics tracked (response times, status codes)

#### Frontend Monitoring
- [ ] Error boundary catches and logs React errors
- [ ] Failed API calls logged
- [ ] Performance metrics tracked (Web Vitals) - optional
- [ ] User analytics set up (Google Analytics, Mixpanel, etc.) - optional

#### Firebase Monitoring
- [ ] Firestore usage dashboard bookmarked
- [ ] Authentication logs accessible
- [ ] Budget alerts configured (optional)

#### Email Monitoring
- [ ] Brevo dashboard accessible
- [ ] Email delivery rate monitored
- [ ] Bounce/spam complaints tracked

### 8. Documentation

- [ ] API documentation current (if external consumers)
- [ ] Deployment runbook created (this checklist!)
- [ ] Incident response plan documented
- [ ] On-call rotation defined (if applicable)
- [ ] Admin credentials securely stored (password manager)
- [ ] Service credentials securely stored (1Password, Vault, etc.)

---

## Deployment Steps

### Step 1: Backend Deployment

#### Option A: Cloud Run (Google Cloud)
```bash
cd backend

# Build container
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/wholesale-backend

# Deploy to Cloud Run
gcloud run deploy wholesale-backend \
  --image gcr.io/YOUR_PROJECT_ID/wholesale-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "$(cat .env | grep -v '^#' | tr '\n' ',')"

# Note service URL for frontend configuration
```

#### Option B: Render
1. Connect GitHub repository
2. Select "Web Service"
3. Set build command: `npm install && npm run build`
4. Set start command: `npm start`
5. Add environment variables from `.env`
6. Deploy

#### Option C: Railway
1. Connect GitHub repository
2. Add environment variables
3. Deploy automatically on push

### Step 2: Firebase Infrastructure

```bash
# From project root
firebase use production  # Select production project
firebase deploy --only firestore:indexes,firestore:rules
```

**Wait for indexes to build** (can take 5-30 minutes for first deployment)

Check status: Firebase Console → Database → Firestore → Indexes

### Step 3: Frontend Deployment

#### Option A: Vercel (Recommended)
```bash
cd frontend

# Install Vercel CLI (if not already)
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard
# Project Settings → Environment Variables
```

#### Option B: Netlify
1. Connect GitHub repository
2. Build command: `npm run build`
3. Publish directory: `.next`
4. Add environment variables
5. Deploy

### Step 4: DNS & Domain Configuration

- [ ] Backend domain pointed to deployment (CNAME or A record)
- [ ] Frontend domain pointed to deployment (CNAME)
- [ ] SSL certificates issued and active
- [ ] CORS updated with production domain
- [ ] Firebase authorized domains updated

### Step 5: Post-Deployment Verification

#### Smoke Tests (Critical Path)
1. [ ] Visit production URL - homepage loads
2. [ ] Admin login works
3. [ ] Create test user account - email received
4. [ ] Test user can log in
5. [ ] Wholesaler can create shop
6. [ ] Admin can verify shop
7. [ ] Wholesaler can add item
8. [ ] Retailer can discover shop
9. [ ] Retailer can view shop detail
10. [ ] Retailer can add item to cart

#### Monitoring Check
- [ ] Backend health check responding
- [ ] No errors in backend logs (first 10 minutes)
- [ ] No errors in frontend console
- [ ] Firebase usage normal
- [ ] Email delivery working

---

## Rollback Plan

### If Deployment Fails

#### Backend Rollback
**Cloud Run:**
```bash
# Revert to previous revision
gcloud run services update-traffic wholesale-backend \
  --to-revisions PREVIOUS_REVISION=100
```

**Render/Railway:**
- Use platform dashboard to redeploy previous successful deployment

#### Frontend Rollback
**Vercel:**
```bash
# Revert to previous deployment
vercel rollback
```

#### Firebase Rollback
**Indexes:**
- Cannot rollback - indexes are additive (safe)
- Can delete indexes in console if needed

**Security Rules:**
```bash
# Redeploy previous rules
git checkout HEAD~1 firestore.rules
firebase deploy --only firestore:rules
git checkout main firestore.rules
```

---

## Post-Deployment Monitoring (First 24 Hours)

### Metrics to Watch

#### Backend
- [ ] Response times <500ms
- [ ] Error rate <1%
- [ ] Health check uptime 100%
- [ ] CPU usage <50%
- [ ] Memory usage stable

#### Frontend
- [ ] Page load times <2s
- [ ] JavaScript errors minimal
- [ ] API call success rate >99%

#### Firebase
- [ ] Firestore read/write within expected range
- [ ] No quota warnings
- [ ] Authentication success rate >98%

#### Email (Brevo)
- [ ] Delivery rate >99%
- [ ] Bounce rate <2%
- [ ] No spam complaints

### Alert Thresholds
- Backend down for >1 minute
- Error rate >5%
- Email delivery rate <95%
- Firestore quota at 80%

---

## Known Issues & Workarounds

### Issue: Firestore Index Build Pending
**Symptom:** Geospatial queries fail with "index required" error  
**Cause:** Indexes still building after deployment  
**Workaround:** Wait 5-30 minutes, monitor index status in Firebase Console  
**Resolution:** Once indexes complete, queries work automatically

### Issue: CORS Error on API Calls
**Symptom:** Frontend can't reach backend, browser console shows CORS error  
**Cause:** Backend CORS_ORIGIN doesn't include frontend domain  
**Workaround:** Temporarily set `CORS_ORIGIN=*` (NOT for production!)  
**Resolution:** Add frontend domain to CORS_ORIGIN, redeploy backend

### Issue: Email Not Received
**Symptom:** Admin creates account but user doesn't receive email  
**Cause:** Brevo API key invalid or sender email unverified  
**Workaround:** Check backend logs - fallback prints password reset link  
**Resolution:** Verify Brevo API key and sender email in dashboard

### Issue: Image Upload Fails
**Symptom:** Shop/item creation succeeds but images don't appear  
**Cause:** Cloudinary credentials incorrect  
**Workaround:** Upload images manually to Cloudinary, update URLs in Firestore  
**Resolution:** Verify Cloudinary credentials, test with `curl`

---

## Success Criteria

Deployment is considered successful when:

- ✅ All 4 user roles can log in
- ✅ Admin can create accounts and verify shops
- ✅ Wholesaler can create shop and manage catalog
- ✅ Retailer can discover shops and add items to cart
- ✅ Email delivery working (>95% delivery rate)
- ✅ No critical errors in logs
- ✅ All performance metrics within thresholds
- ✅ Monitoring dashboards green

---

## Support Contacts

### Internal
- **Backend Issues:** [Your Name/Team]
- **Frontend Issues:** [Your Name/Team]
- **Infrastructure:** [DevOps Team]

### External Services
- **Firebase Support:** https://firebase.google.com/support/contact
- **Brevo Support:** https://help.brevo.com/
- **Cloudinary Support:** https://support.cloudinary.com/

---

## Next Steps After Deployment

1. **Monitor for 24 hours** - Check logs, metrics, user reports
2. **Gather user feedback** - Especially from first wholesalers/retailers
3. **Run full testing checklist** - 170+ test cases in phase-2-testing-checklist.md
4. **Document any issues found** - Create tickets for bugs
5. **Plan Phase 3 kickoff** - Order Placement & Payment integration

---

## Phase 3 Prerequisites

Before starting Phase 3 development:

- [ ] Phase 2 stable in production for 7+ days
- [ ] No critical bugs reported
- [ ] Razorpay account created and keys obtained
- [ ] Payment gateway testing environment set up
- [ ] Legal review of payment terms (if applicable)
- [ ] Cart persistence strategy decided

---

**Deployment Checklist Complete!**  
**Last Updated:** July 12, 2026  
**Version:** 1.0  
**Status:** Ready for production deployment ✅
