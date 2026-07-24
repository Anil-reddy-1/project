# Troubleshooting Guide

**Last Updated:** 2026-07-14  
**Platform:** B2B Wholesale Single-Shop Platform

---

## Common Issues & Solutions

### 1. "Failed to fetch catalog: Error: Failed to fetch shop information"

**Symptom:**
- Retailer catalog page shows error
- Browser console shows: `Failed to load resource: the server responded with a status of 404 (Not Found)`
- Error points to `/api/shops` endpoint

**Root Cause:**
- Frontend trying to call Next.js API route instead of backend Express server
- API route doesn't exist

**Solution:**
✅ **FIXED** - Use `apiClient` utility from `@/lib/api/client`

**Before (Incorrect):**
```typescript
const shopRes = await fetch('/api/shops', {
  credentials: 'include',
});
```

**After (Correct):**
```typescript
import { apiClient } from '@/lib/api/client';

const shopData = await apiClient<{ shops: Shop[] }>('/shops', {
  method: 'GET',
});
```

**Why This Works:**
- `apiClient` automatically adds Firebase ID token for authentication
- Uses `API_BASE_URL` from config (points to Express backend)
- Handles errors properly

---

### 2. Backend Not Running

**Symptom:**
- API requests fail with network errors
- `ECONNREFUSED` errors in console

**Solution:**
```bash
cd backend
npm run dev
```

**Verify:**
```bash
curl http://localhost:3001/health
# Should return: {"status":"ok","timestamp":"..."}
```

---

### 3. Shop Not Found in Database

**Symptom:**
- Catalog shows "Shop not found. Please contact administrator."
- Backend returns empty shops array

**Solution:**
Run the seed script to create the shop:
```bash
cd backend
npx ts-node scripts/setup-single-shop.ts
```

**Verify in Firestore:**
- Firebase Console → Firestore Database
- Check `shops` collection has 1 document
- Check shop has `verificationStatus: "verified"` and `isActive: true`

---

### 4. Authentication Issues

**Symptom:**
- 401 Unauthorized errors
- "No token provided" or "Invalid token" errors

**Common Causes:**
1. **Not logged in** - User needs to sign in first
2. **Expired token** - Refresh page or re-login
3. **Missing API client** - Use `apiClient` utility, not raw `fetch`

**Solution:**
```typescript
// Always use apiClient for authenticated requests
import { apiClient } from '@/lib/api/client';

const data = await apiClient('/endpoint', {
  method: 'GET'
});
```

---

### 5. CORS Errors

**Symptom:**
- Browser console shows CORS policy errors
- Requests blocked by CORS

**Solution:**
Check backend `.env` has correct `CORS_ORIGIN`:
```env
CORS_ORIGIN=http://localhost:3000
```

Or for multiple origins:
```env
CORS_ORIGIN=http://localhost:3000,https://yourdomain.com
```

**Restart backend after changing .env:**
```bash
cd backend
npm run dev
```

---

### 6. Environment Variables Not Loading

**Symptom:**
- `undefined` values for env variables
- API calls fail with incorrect URLs

**Backend Solution:**
```bash
cd backend
# Ensure .env file exists
cp .env.example .env
# Edit .env and add your values
```

**Frontend Solution:**
```bash
cd frontend
# Ensure .env.local file exists
cp .env.local.example .env.local
# Edit .env.local and add your values
# Restart dev server
npm run dev
```

**Important:** Environment variables starting with `NEXT_PUBLIC_` are exposed to the browser.

---

### 7. Firestore Rules Blocking Requests

**Symptom:**
- `permission-denied` errors
- Firestore operations fail

**Check Rules:**
1. Firebase Console → Firestore Database → Rules tab
2. Verify rules are deployed

**Deploy Rules:**
```bash
firebase deploy --only firestore:rules
```

**Note:** Client writes are blocked by design. All writes go through Express backend using Admin SDK.

---

### 8. Products Not Showing in Catalog

**Symptom:**
- Catalog loads but shows "No products found"
- Shop exists but products array is empty

**Possible Causes:**
1. **No products added** - Wholesaler needs to add products via catalog management
2. **Products not available** - Check `available: true` in Firestore
3. **Wrong shopId filter** - Products query might be filtering wrong shop

**Solution:**
1. Login as wholesaler
2. Navigate to catalog management
3. Add products with:
   - Name, description, price
   - Stock quantity
   - MOQ (minimum order quantity)
   - Set `available: true`

---

### 9. Admin Dashboard Not Loading

**Symptom:**
- Blank page or old dashboard still showing
- Changes not reflected

**Solution:**
```bash
# Hard refresh browser
# Windows: Ctrl + Shift + R
# Mac: Cmd + Shift + R

# Or clear Next.js cache
cd frontend
rm -rf .next
npm run dev
```

---

### 10. Seed Script Fails

**Symptom:**
- Error about Firebase Admin SDK
- Error about missing environment variables

**Solution:**
```bash
cd backend

# Check .env file exists and has Firebase credentials
cat .env | grep FIREBASE

# Verify these are set:
# FIREBASE_PROJECT_ID=your-project-id
# FIREBASE_CLIENT_EMAIL=service-account@...
# FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Private key must be a string with escaped newlines
# Copy the entire private key including header/footer from Firebase service account JSON

# Re-run seed script
npx ts-node scripts/setup-single-shop.ts
```

---

## Debugging Checklist

When encountering issues, check these in order:

### Frontend
- [ ] Is the dev server running? (`npm run dev`)
- [ ] Is `.env.local` configured?
- [ ] Is `NEXT_PUBLIC_API_URL` pointing to backend?
- [ ] Check browser console for errors (F12)
- [ ] Check Network tab for failed requests
- [ ] Using `apiClient` for API calls? (not raw `fetch`)

### Backend
- [ ] Is the backend running? (`npm run dev`)
- [ ] Is `.env` configured?
- [ ] Check terminal for errors
- [ ] Test health endpoint: `curl http://localhost:3001/health`
- [ ] Check Firebase credentials are valid
- [ ] Check CORS_ORIGIN matches frontend URL

### Database
- [ ] Firebase project selected? (`firebase projects:list`)
- [ ] Firestore rules deployed? (`firebase deploy --only firestore:rules`)
- [ ] Seed script run? (`npx ts-node scripts/setup-single-shop.ts`)
- [ ] Shop exists in Firestore? (Firebase Console → Firestore)
- [ ] Products exist? (Check `items` or `products` collection)

### Authentication
- [ ] User logged in?
- [ ] Token valid? (not expired)
- [ ] Using `apiClient` utility?
- [ ] Authorization header present in Network tab?

---

## Getting More Help

### Check Logs

**Backend Logs:**
```bash
cd backend
npm run dev
# Watch terminal output for errors
```

**Frontend Logs:**
```bash
cd frontend
npm run dev
# Watch terminal output
# Also check browser console (F12)
```

**Firebase Logs:**
- Firebase Console → Authentication → Users
- Firebase Console → Firestore Database → Data

### Useful Commands

```bash
# Check if ports are in use
# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# Check Firebase project
firebase projects:list
firebase use <project-id>

# Rebuild everything
cd backend && npm run build
cd frontend && npm run build

# Clear caches
cd frontend && rm -rf .next
cd backend && rm -rf dist
```

### Documentation

- `DEPLOYMENT-GUIDE.md` - Full deployment instructions
- `NEXT-STEPS.md` - Testing guide
- `QUICK-REFERENCE.md` - Quick reference
- `PHASE-2.5-FINAL-STATUS.md` - Current status

---

## Error Code Reference

| Code | Meaning | Common Cause | Solution |
|------|---------|--------------|----------|
| 400 | Bad Request | Invalid data sent | Check request payload |
| 401 | Unauthorized | Not logged in or invalid token | Login again |
| 403 | Forbidden | Insufficient permissions | Check user role |
| 404 | Not Found | Endpoint doesn't exist | Check URL/route |
| 500 | Internal Server Error | Backend error | Check backend logs |
| CORS | Cross-Origin | CORS not configured | Check CORS_ORIGIN env |
| ECONNREFUSED | Connection Refused | Backend not running | Start backend |

---

**Need more help?**  
Check the error message, review logs, and consult the documentation files listed above.

**Last Updated:** 2026-07-14  
**Status:** Living Document (update as new issues are discovered)
