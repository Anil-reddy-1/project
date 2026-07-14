# schema.md — Canonical Data Model
## B2B Wholesale Marketplace, Order Management & Delivery Dispatch Platform

**Purpose of this file:** This is the single source of truth for every collection, field, type, and enum in the system. Derived strictly from PRD.md, requirements.md, tech-spec.md, and app-flow.md — nothing here is invented. When writing code, always match field names and enum values exactly as listed here. If a needed field isn't listed here, add it here first, then use it in code — never the reverse.

**Store:** Firebase Firestore (primary) + Firebase Realtime Database (RTDB, high-frequency location only).

---

## 1. `users/{uid}`

| Field | Type | Required | Notes |
|---|---|---|---|
| `uid` | string (doc id) | yes | Firebase Auth UID |
| `role` | enum string | yes | `"retailer"` \| `"wholesaler"` \| `"delivery_partner"` \| `"admin"` |
| `status` | enum string | yes | `"active"` \| `"suspended"` \| ~~`"pending_approval"`~~ (removed - no wholesaler self-reg) |
| `name` | string | yes | |
| `phone` | string | yes | E.164 format recommended |
| `email` | string | no | required for email/password auth path |
| `shopId` | string (ref → `shops`) | conditional | present only if `role == "wholesaler"` — references THE single shop |
| `exclusiveShopIds` | array\<string\> (refs → `shops`) | conditional | present only if `role == "delivery_partner"` and partner is exclusive to THE shop; empty array = open-pool. **NOTE:** Since only one shop exists, this is effectively a boolean (has THE shop ID or empty) |
| `createdBy` | string (uid) | conditional | admin uid, present if account was admin-provisioned |
| `createdAt` | timestamp | yes | |
| `updatedAt` | timestamp | yes | |

**CRITICAL CONSTRAINTS:**
- **Exactly ONE user** with `role == "wholesaler"` must exist in the system
- Use `getSingleWholesalerId()` (backend/src/utils/snapshot.ts) to retrieve the wholesaler UID
- Wholesaler account is created via admin seed script, never through registration flow
- `status == "pending_approval"` is deprecated (no wholesaler self-registration)

**Auth custom claims (not a Firestore field, set via Firebase Admin SDK):**
```json
{ "role": "retailer" | "wholesaler" | "delivery_partner" | "admin", "status": "active" | "suspended" }
```

---

## 2. `shops/{shopId}` ⚠️ SINGLE SHOP ONLY

**CRITICAL CONSTRAINT:** The `shops` collection contains **EXACTLY ONE document** representing the single wholesale business.

**Helper Function:** Use `getSingleShopId()` (backend/src/utils/snapshot.ts) to retrieve the shop ID. Never hardcode shop IDs.

| Field | Type | Required | Notes |
|---|---|---|---|
| `shopId` | string (doc id) | yes | The ONE shop ID |
| `ownerUid` | string (ref → `users`) | yes | must be THE `wholesaler`-role user (exactly one exists) |
| `name` | string | yes | Business name |
| `address` | string | yes | Business address |
| `geopoint` | GeoPoint {lat, lng} | yes | Shop location (for delivery assignment) |
| `geohash` | string | yes | computed via `geofire-common`, used for delivery partner radius queries |
| `category` | string | yes | Business category |
| `operatingHours` | object | yes | `{ days: string[], open: string, close: string }` |
| `verificationStatus` | enum string | yes | Always `"verified"` for the single shop (no verification workflow) |
| `moqThreshold` | number | yes | minimum order value for the shop |
| `photoUrl` | string | no | shop photo, Firebase Storage URL |
| `createdAt` | timestamp | yes | |
| `updatedAt` | timestamp | yes | |

**Firestore Rules:** Must prevent creation of multiple shop documents. Only admins can create/update the shop.

---

## 3. `items/{shopId}/products/{itemId}` (subcollection under shop)

| Field | Type | Required | Notes |
|---|---|---|---|
| `itemId` | string (doc id) | yes | |
| `name` | string | yes | |
| `price` | number | yes | |
| `stockQty` | number | yes | decremented only at PLACED→APPROVED transition (see rules.md §2) |
| `unit` | string | yes | e.g. "kg", "box", "unit" |
| `isAvailable` | boolean | yes | toggled by wholesaler; hides from browsing without deleting |
| `updatedAt` | timestamp | yes | |

---

## 4. `orders/{orderId}`

| Field | Type | Required | Notes |
|---|---|---|---|
| `orderId` | string (doc id) | yes | |
| `retailerUid` | string (ref → `users`) | yes | |
| `shopId` | string (ref → `shops`) | yes | **Always references THE single shop** — automatically determined via `getSingleShopId()` |
| `wholesalerId` | string (ref → `users`) | yes | **Always references THE single wholesaler** — automatically determined via `getSingleWholesalerId()` |
| `items` | array\<{itemId, qty, price}\> | yes | price is snapshotted at order time, not live-referenced |
| `totalValue` | number | yes | |
| `paymentMethod` | enum string | yes | `"prepaid"` \| `"cod"` |
| `paymentStatus` | enum string | yes | values depend on `paymentMethod`: prepaid → `"pending"` \| `"paid"` \| `"failed"`; cod → tracked via `ledger_entries`, not this field alone — see rules.md §5 |
| `state` | enum string | yes | see full state list below |
| `assignedPartnerUid` | string (ref → `users`) | conditional | set once state reaches `ASSIGNED` |
| `pickupOtpHash` | string | conditional | bcrypt hash, set at `READY_FOR_PICKUP` |
| `dropOtpHash` | string | conditional | bcrypt hash, set at `PICKED_UP` |
| `otpExpiresAt` | timestamp | conditional | shared expiry field — confirm in implementation whether pickup and drop OTPs need separate expiry fields (`pickupOtpExpiresAt` / `dropOtpExpiresAt`) since they're generated at different times |
| `stateHistory` | array\<{state, timestamp, actorUid}\> | yes | append-only; this **is** the audit trail — never overwrite entries |
| `rejectionReason` | string/enum | conditional | set on `REJECTED`; reason codes: stock unavailable, MOQ unmet, suspicious order, other (exact enum values not finalized in source docs) |
| `createdAt` | timestamp | yes | |
| `updatedAt` | timestamp | yes | |

**`state` enum — full value set:**
```
PLACED | APPROVED | REJECTED | PACKED | READY_FOR_PICKUP | ASSIGNED |
PICKED_UP | ON_THE_WAY | DELIVERED | CANCELLED | DISPUTED | PAYMENT_SETTLED
```
Do not introduce new state values without updating this file and rules.md §2 first.

---

## 5. `ledger_entries/{entryId}`

| Field | Type | Required | Notes |
|---|---|---|---|
| `entryId` | string (doc id) | yes | |
| `orderId` | string (ref → `orders`) | yes | |
| `partnerUid` | string (ref → `users`) | yes | delivery partner who collected cash |
| `wholesalerUid` | string (ref → `users`) | yes | wholesaler who must confirm |
| `amount` | number | yes | exact amount, never rounded |
| `status` | enum string | yes | `"PENDING_CONFIRMATION"` \| `"CONFIRMED"` \| `"ESCALATED"` |
| `collectedAt` | timestamp | yes | |
| `confirmedAt` | timestamp | conditional | set on wholesaler confirmation |
| `escalatedAt` | timestamp | conditional | set by scheduled SLA job |

---

## 6. `disputes/{disputeId}`

| Field | Type | Required | Notes |
|---|---|---|---|
| `disputeId` | string (doc id) | yes | |
| `orderId` | string (ref → `orders`) | yes | must reference a `DELIVERED` order (or later state) |
| `raisedByUid` | string (ref → `users`) | yes | retailer in the current flow |
| `reason` | string/enum | yes | damage / shortage / wrong item / other — exact enum not finalized |
| `status` | enum string | yes | values not finalized in source docs — recommend: `"open"` \| `"responded"` \| `"resolved"`; flag before implementing |
| `resolutionNotes` | string | conditional | required by Admin on any resolution action (see app-flow.md §4.4) |
| `resolvedByUid` | string (ref → `users`) | conditional | must be an `admin`-role user |
| `createdAt` | timestamp | yes | |
| `updatedAt` | timestamp | yes | |

---

## 7. `delivery_partners_meta/{uid}`

| Field | Type | Required | Notes |
|---|---|---|---|
| `uid` | string (doc id, = users uid) | yes | |
| `isExclusive` | boolean | yes | |
| `linkedShopIds` | array\<string\> (refs → `shops`) | conditional | non-empty only if `isExclusive == true` |
| `isOnline` | boolean | yes | toggled by partner |
| `currentGeohash` | string | yes | mirrors RTDB location at lower frequency for query eligibility |
| `activeOrderIds` | array\<string\> (refs → `orders`) | yes | supports batching — multiple concurrent orders allowed |
| `rating` | number | no | |
| `acceptanceRate` | number | no | computed metric for Admin performance view |

---

## 8. RTDB: `live_locations/{partnerUid}`

| Field | Type | Notes |
|---|---|---|
| `lat` | number | |
| `lng` | number | |
| `geohash` | string | |
| `updatedAt` | timestamp (ms epoch) | high-frequency writes, every few seconds while online |

Active/subscribed only while an order involving this partner is in `ASSIGNED` / `PICKED_UP` / `ON_THE_WAY`.

---

## 9. Relationships Summary

```
users (wholesaler) ──1:1── shops
shops ──1:many── items/products
users (retailer) ──1:many── orders
shops ──1:many── orders
orders ──1:1── ledger_entries (COD orders only, created at DELIVERED)
orders ──1:1(optional)── disputes
users (delivery_partner) ──1:1── delivery_partners_meta
users (delivery_partner) ──1:1── live_locations (RTDB)
```

---

## 10. Fields Marked "Not Finalized" — Do Not Guess

Anywhere this file says a value set or structure is "not finalized" or "TBD," code should **not** invent a specific set of values. Stop and confirm with the user before hardcoding enums for: `operatingHours` structure, `verificationStatus` values, `rejectionReason` codes, `dispute.status` values, `dispute.reason` codes, and whether OTP expiry needs two separate timestamp fields.
