# Requirements Extraction & Classification
### Source: Wholesale & Retail Bulk Commerce Platform — Complete Business, Functional, Operational, and System Documentation

This document is the intermediate extraction pass: every meaningful requirement from the source material, classified into categories, preserving original intent and wording where it matters. Nothing here is invented — items the source itself leaves configurable/unspecified are marked `OPEN DECISION` or `TBD`. This is the input the final `PRD.md` will be built from.

---

## 1. BUSINESS GOALS

- Enable businesses to sell and distribute products in bulk to wholesalers and retailers while maintaining centralized control over inventory, pricing, orders, deliveries, staff, users, roles, and financial records.
- Centralize product and inventory management.
- Provide one connected operational ecosystem (not three independent apps) spanning inventory → products/pricing → customer orders → payments → order processing → delivery assignment → delivery execution → completion → reporting/audit as a single source of operational truth.
- Give the business visibility: what it has (stock), what customers ordered, what needs fulfillment, what's been delivered, what remains pending, what financial obligations are outstanding.
- Maintain auditable financial and operational records (who changed what, when, previous/new value) — explicitly emphasized for price, stock, payment, debt, and status changes.
- Maintain operational visibility via reporting drawn from real transactional data, not manually entered statistics.
- No explicit numeric/measurable KPIs (e.g., revenue targets, growth %) are given anywhere in the source — none should be invented.

**Non-goals (implicit, not stated as explicit business goals):** the source never frames this as a consumer marketplace, a multi-vendor platform, or a subscription business.

---

## 2. BUSINESS MODEL

- Core business: the business maintains a stock of products and sells them **in bulk quantities** to wholesalers, retailers, and other business buyers (not individual consumers).
- Digital interface lets these business customers: browse, search, check availability, view pricing, select quantities, place orders, pay, track deliveries, view past orders.
- Business side (seller/admin) can: maintain inventory, manage pricing, manage customers/users, manage staff, manage roles/permissions, process orders, assign deliveries, monitor operations, manage internal pending debts, generate reports.
- Delivery partners execute physical delivery.
- The platform is explicitly **not** a conventional consumer retail e-commerce site — quantity/bulk purchasing is a first-class concept throughout (see §15 Bulk Ordering Rules extraction below).
- **Internal Pending Debt is explicitly NOT customer/buyer debt.** Source states directly: *"Pending debts are not customer/buyer debts unless the business explicitly decides to introduce customer credit in the future."* It is an internal business-financial record; the exact debt source is configurable per business process (`OPEN DECISION`: what triggers a debt / who it's owed to).
- Backend and database are shared across all three interfaces (Admin/Seller, Customer, Delivery Partner) — they are three views onto one system, not separate products.
- Complete business cycle (customer order side):
  ```
  PRODUCT PROCUREMENT/STOCK → INVENTORY MANAGEMENT → PRICE MANAGEMENT →
  CUSTOMER DISCOVERY → BULK ORDER → PAYMENT → ORDER PROCESSING →
  STOCK DEDUCTION/RESERVATION → DELIVERY ASSIGNMENT → DELIVERY EXECUTION →
  DELIVERY COMPLETION → CUSTOMER CONFIRMATION → REPORTING & AUDIT
  ```
- Separate internal financial cycle (debt side, independent of order flow):
  ```
  INTERNAL FINANCIAL OBLIGATION → PENDING DEBT → PAYMENT → BALANCE UPDATE → CLEARED
  ```

---

## 3. ACTORS

### 3.1 Administrator
- Highest level of control in the system.
- Responsibilities: user management, role management, permission management, product management, stock management, pricing management, order management, delivery management, staff management, debt management, reports, operational monitoring.
- Implicitly has all capabilities (superset of Seller).

### 3.2 Seller / Business Operator
- Operates the business day-to-day.
- Capabilities are **permission-dependent** (assigned by Administrator): manage products, update stock, manage prices, process orders, assign deliveries, view customers, view reports, manage operational activities.
- **Restriction:** should only access functions permitted by their assigned role — Seller is not automatically equal to Admin.

### 3.3 Wholesaler / Retailer (Customer)
- Primary customer of the platform.
- Capabilities: register/login, browse products, search products, filter products, view pricing, check stock availability, add to cart, enter bulk quantities, checkout, pay, view orders, track deliveries, manage profile, manage addresses, view order history.
- **Restriction:** must not have access to internal administration functions.

### 3.4 Delivery Partner
- Responsible for physical order fulfillment.
- Capabilities: login, view assigned deliveries, accept deliveries, start deliveries, view delivery address, contact recipient, navigate to location, update delivery status, complete delivery, report delivery problems, view delivery history, manage availability.
- **Restrictions:** must NOT have access to pricing management, stock management, user administration, role management, or internal financial information — *unless explicitly permitted by role.*
- Should only see information required to complete the delivery (recipient name, contact, address, order summary, delivery status) — sensitive internal business information must not be exposed to them.

---

## 4. ROLES / RBAC

- System must implement Role-Based Access Control (RBAC).
- A user does not get permissions merely by having application access — access flows: `User → Role → Permissions → Accessible Features`.
- Example role hierarchy given (illustrative, not exhaustive):
  - **Administrator:** Users, Roles, Products, Stock, Pricing, Orders, Deliveries, Staff, Debts, Reports.
  - **Seller:** Products, Stock, Pricing, Orders, Deliveries (subset, permission-gated).
  - **Delivery Partner:** Assigned Deliveries, Delivery Status, History, Profile.
  - **Customer:** Products, Cart, Checkout, Orders, Profile.
- Example role definition (Seller):
  ```
  ✓ View Products, ✓ Manage Stock, ✓ Manage Prices, ✓ View Orders,
  ✓ Process Orders, ✓ Assign Deliveries
  ✗ Manage Roles, ✗ System Administration
  ```
- **Critical:** permissions must be centrally enforced by the backend, not merely hidden on the frontend.

---

## 5. PERMISSIONS

Granular permission types the system should support:
- View
- Create
- Update
- Delete
- Assign
- Approve
- Export
- Manage

Admin capabilities re: roles/permissions:
- Create roles
- Edit roles
- Assign permissions (to roles)
- Assign roles (to users)

Admin capabilities re: users:
- Create users
- View users
- Edit users
- Activate users
- Deactivate users
- Assign roles

### Access Matrix (from source §63, verbatim structure preserved)

| Capability      | Admin/Seller | Customer   | Delivery Partner |
|-----------------|-------------:|-----------:|------------------:|
| Browse Products |     ✓        |    ✓       | Limited           |
| Manage Products |     ✓        |    ✗       | ✗                 |
| Manage Stock    |     ✓        |    ✗       | ✗                 |
| Manage Pricing  |     ✓        |    View    | ✗                 |
| Place Order     |  Optional    |    ✓       | ✗                 |
| View Orders     |     ✓        | Own Orders | Assigned Orders   |
| Assign Delivery |     ✓        |    ✗       | ✗                 |
| Update Delivery |     ✓        |    ✗       | Own Deliveries    |
| Manage Users    |     ✓        |    ✗       | ✗                 |
| Manage Roles    |     ✓        |    ✗       | ✗                 |
| Manage Staff    |     ✓        |    ✗       | ✗                 |
| Manage Debts    |     ✓        |    ✗       | ✗                 |
| View Reports    |     ✓        |    ✗       | Limited           |
| Manage Profile  |     ✓        |    ✓       | ✓                 |

Note: source collapses Admin and Seller into one column here even though §3.1–3.2 distinguish them (Admin = full authority, Seller = permission-gated subset). This is a genuine internal inconsistency in the source — flag as `OPEN DECISION`: exact seller permission subset needs role-level granularity beyond this table.

---

## 6. FEATURES (by module)

### Authentication
Registration, Login, Logout, Password management, Session/token management.

### User & Access
Users, Roles, Permissions, Staff.

### Catalog
Products, Categories, Product status, Product images.

### Inventory
Stock, Stock adjustments, Stock history, Low stock identification.

### Pricing
Current price, Price history, Price updates.

### Commerce (Customer-facing)
Product browsing, Cart, Checkout, Orders.

### Payment
Payment creation, Payment confirmation, Payment failure, Payment records.

### Delivery
Assignment, Partner availability, Delivery status, Delivery completion, Delivery issues, Delivery history.

### Debt
Debt creation, Payment recording, Balance management, Debt history.

### Notification
User (customer) notifications, Seller notifications, Delivery notifications.

### Reporting
Sales, Stock, Delivery, Staff, Debt reports; Daily Operations report.

### Audit
Activity tracking, Change history, Security-related records.

### Search & Filtering
Across Products (name, SKU, category, availability), Users (name, role, status), Orders (order ID, customer, date, status), Deliveries (delivery ID, partner, status, date), Debts (debt ID, status, date).

---

## 7. SCREENS

### Admin / Seller Frontend
```
Dashboard, Users, Roles, Staff, Products, Stock, Pricing, Orders, Deliveries, Debts, Reports
```

### Customer Frontend
```
Home, Products, Product Details, Cart, Checkout, Orders, Order Details, Wishlist, Profile, Addresses
```
Note: Wishlist appears in the frontend structure (§64) but is never otherwise defined/described anywhere else in the source (no wishlist behavior, rules, or screen content given). Flag `OPEN DECISION`: define wishlist behavior or mark out of scope.

### Delivery Partner Frontend
```
Login, Home, Deliveries, Delivery Details, History, Notifications, Profile
```
No explicit "Availability toggle" screen listed in §64's structure, though Availability Management is a defined feature (§37) and Delivery Partner capabilities include "manage availability" (§3.4/§4.4) — implies Availability lives on Home or Profile. `OPEN DECISION`: which screen hosts the availability toggle.

---

## 8. WORKFLOWS (end-to-end)

### 8.1 Complete End-to-End Business Flow (§51, master flow)
```
1. Seller adds products
2. Seller maintains stock
3. Seller sets product prices
4. Customer registers
5. Customer browses products
6. Customer chooses bulk quantities
7. Customer adds products to cart
8. Customer checks out
9. System validates stock
10. Payment processed
11. Order created
12. Stock reserved/updated
13. Seller receives order
14. Seller confirms/processes order
15. Order prepared
16. Seller assigns delivery partner
17. Delivery partner receives assignment
18. Partner accepts delivery
19. Partner starts delivery
20. Partner goes out for delivery
21. Partner reaches customer
22. Delivery confirmed
23. Order marked delivered
24. Customer receives confirmation
25. Reports/audit records updated
```

### 8.2 Customer / E-commerce Flow
Registration/Login → profile/address setup → product discovery (categories, search, filter, sort) → product details + quantity selection → cart (add/update/remove, line totals, subtotal + charges = final total, stock validated) → checkout (address selection, order review, payment method) → order creation.

### 8.3 Order Creation Flow
```
Cart → Checkout → Validation → Payment/Payment Authorization →
Order Created → Stock Reserved/Adjusted → Seller Processing
```
Order ID format example: `ORD-2026-000245`.

### 8.4 Seller Order Processing Flow
View order → review items → check stock → verify payment → process order → prepare for delivery → assign delivery partner.
Suggested order status workflow: `Order Placed → Confirmed → Processing → Ready for Delivery → Assigned → Out for Delivery → Delivered`. Cancelled orders follow a separate path.

### 8.5 Order-to-Delivery Flow
```
Order Confirmed → Order Prepared → Delivery Required → Delivery Partner Assigned →
Partner Accepts → Delivery Started → Out for Delivery → Delivered
```

### 8.6 Delivery Partner Workflow
```
Assigned → Accept → Accepted → Start Delivery → In Progress → Out for Delivery → Delivered
```
Partner must not be able to arbitrarily jump between statuses — transitions controlled by business rules.

### 8.7 Delivery Failure Flow
```
Delivery Assigned → Partner Accepts → Delivery Started → Delivery Attempt →
  Successful? → Yes → Delivered
             → No  → Failure Reason → Seller/Admin Review →
                     Reschedule / Reassign / Cancel / Other Action
```

### 8.8 Internal Debt Flow
```
Business identifies pending debt → Debt record created → Outstanding balance tracked →
Payment received → Payment recorded → Remaining balance recalculated →
Balance = 0? → No → Pending/Partial | Yes → Cleared
```

### 8.9 Customer Order Tracking (simplified/customer-visible view)
```
✓ Order Placed → ✓ Confirmed → ✓ Processing → ✓ Assigned for Delivery →
● Out for Delivery → ○ Delivered
```
Customer must not see internal operational detail beyond this simplified view.

### 8.10 Order Cancellation Flow
Cancellation allowed only before certain stages (source doesn't fix the exact cutoff stage — `OPEN DECISION`). After dispatch, cancellation "may require" seller/admin intervention (not firmly specified — `OPEN DECISION`: exact cutoff and required actor). On cancellation, system must determine: stock restoration, payment handling, delivery cancellation, notifications, audit logging.

### 8.11 Payment Failure Flow
```
Payment Attempt → Failed → Order remains unpaid/pending
```
System must not incorrectly mark an order as paid; customer receives an understandable message.

### 8.12 Debt Payment Flow
```
Original Amount → Payment Recorded → Remaining Balance Updated
```
Example: Original ₹50,000 → Payment 1 ₹20,000 → Remaining ₹30,000 → Payment 2 ₹30,000 → Remaining ₹0 → Status Cleared. Each payment creates a transaction record.

---

## 9. STATE TRANSITIONS / STATE MACHINES

### 9.1 Order Lifecycle (§57 — explicitly called "recommended", not final)
```
PLACED → CONFIRMED → PROCESSING → READY_FOR_DELIVERY → ASSIGNED → OUT_FOR_DELIVERY → DELIVERED
```
Alternate/branch paths:
```
PLACED → CANCELLED
CONFIRMED → CANCELLED
PROCESSING → CANCELLED
ASSIGNED → DELIVERY_FAILED
OUT_FOR_DELIVERY → DELIVERY_FAILED
```
Source explicitly states: *"The final state machine should be explicitly defined in the backend"* — i.e., this is a recommendation, not a locked spec. Mark exact transition table (who can trigger, preconditions, side effects for each edge) as `OPEN DECISION` beyond what's given above.

### 9.2 Delivery Partner Workflow States
`Assigned → Accepted → In Progress/Started → Out for Delivery → Delivered`, with a failure branch to `Delivery Failed` (from Delivery Attempt). Not able to skip states arbitrarily.

### 9.3 Payment States
`Pending, Paid, Failed, Refunded` — refund mechanics/policy not detailed anywhere (`TBD`).

### 9.4 Debt States
`Pending, Partially Paid, Cleared`, plus `Overdue, if required` (conditional/optional — `OPEN DECISION`: whether Overdue is implemented and what triggers it, e.g. an age threshold).

### 9.5 Product Lifecycle (§55)
```
Created → Active → Available for Sale → Low Stock → Out of Stock
```
Plus a side-state: `Inactive / Discontinued` (not shown as reachable from a specific point in the main chain — implies it can occur from any active state). Source doesn't say whether Low Stock/Out of Stock are persisted states or derived from quantity vs. threshold — must be marked `OPEN DECISION` per instructions (do not assume it must be manually stored).
Inactive product = not available for new purchase; historical orders must still retain product info.

### 9.6 User Lifecycle (§56)
```
Registered → Active → Inactive/Suspended
```
Deactivation ≠ deletion: prevents new login/access, preserves historical orders/deliveries/payments/audit records. Deletion should generally not physically destroy dependent business records — soft deletion/deactivation preferred (this is phrased as "should" / "use ... where appropriate" — mark implementation choice as `RECOMMENDATION`, not a hard mandate).

### 9.7 Stock Lifecycle (§54)
```
Stock Added → Available Inventory → Reserved for Order → Order Confirmed → Stock Deducted
```
Alternate path:
```
Reserved → Order Cancelled → Stock Released
```
Important for correctness under concurrent order processing.

---

## 10. DATA ENTITIES

All entities as given in §49 "Core Database Entities" (source explicitly frames this as "a potential database model" — i.e., a strong starting point, not necessarily final/exhaustive):

| Entity | Key Fields (as given) |
|---|---|
| Users | id, name, email, phone, password_hash/auth reference, role_id, status, created_at, updated_at |
| Roles | id, name, description |
| Permissions | id, name, description |
| Role Permissions | role_id, permission_id |
| Products | id, name, sku, category_id, description, unit, price, status, created_at, updated_at |
| Product Categories | id, name, description |
| Inventory | id, product_id, quantity, updated_at |
| Inventory Transactions | id, product_id, type, quantity, reason, actor_id, created_at |
| Price History | id, product_id, old_price, new_price, changed_by, changed_at |
| Addresses | id, user_id, address fields, is_default |
| Orders | id, user_id, status, total_amount, payment_status, delivery_status, delivery_address_snapshot, created_at, updated_at |
| Order Items | id, order_id, product_id, product_name_snapshot, quantity, unit_price, total |
| Payments | id, order_id, amount, method, status, transaction_reference, created_at |
| Deliveries | id, order_id, delivery_partner_id, status, assigned_at, accepted_at, started_at, delivered_at, failure_reason |
| Delivery Status History | id, delivery_id, status, changed_by, created_at, notes |
| Debts | id, description, original_amount, paid_amount, remaining_amount, status, created_by, created_at |
| Debt Payments | id, debt_id, amount, recorded_by, payment_date, notes |
| Notifications | id, user_id, type, title, message, read_at, created_at |
| Audit Logs | id, actor_id, action, entity_type, entity_id, old_value, new_value, created_at |

### Additional entity-level detail given elsewhere in the source (beyond §49's table):

**Product** (§6) should also carry: Product ID, Product name, SKU/product code, Category, Description, Product images, Unit, Price, Available quantity, **Minimum order quantity (if applicable)**, Stock status, Active/inactive status, Created date, Updated date.

**Order** (§14) header should carry: Order ID, Customer ID, Order date, Total amount, Payment status, Order status, Delivery status. Order Items carry: Product ID, Product name snapshot, Quantity, Unit price snapshot, Line total. Delivery info embedded: Delivery address, Assigned delivery partner, Delivery status, Delivery timestamps.

**Payment** (§29) record: Payment ID, Order ID, Amount, Payment method, Payment status, Transaction/reference ID, Created timestamp, Updated timestamp.

**Debt** (§31) record: Debt ID, Description, Original amount, Paid amount, Remaining amount, Status, Created date, Payment history, Notes.

**Customer** (§46): Customer ID, Name, Email, Phone, Addresses, Account status, Registration date. Orders must reference the customer but also preserve necessary historical info independent of later customer-record changes.

**Address** (§47): Name, Phone, Address line, Area, City, State, Postal code, Landmark (if required), Default address flag. Order must preserve the delivery address **used at checkout** — changing a saved address later must not alter historical orders (hence `delivery_address_snapshot` on Orders).

**Staff** (§36): Staff ID, Name, Contact information, Role, Status, Assigned work, Created date. Delivery staff additionally: Availability, Current delivery count, Active delivery.

**Delivery** (§24 detail visible to partner): Delivery ID, Recipient name, Contact number, Delivery address, Order summary, Delivery status.

**Delivery history** (§27) per delivery: Assigned time, Accepted time, Started time, Out-for-delivery time, Delivered time, Failed time (if applicable), Delivery partner, Failure reason.

**Stock adjustment record** (§19 example): Previous stock, Adjustment (+/-), New stock, Reason, Changed by, Date.

**Price history record** (§20 example): sequence of price + effective date pairs.

---

## 11. RELATIONSHIPS

### User-centric (§48)
```
User
 ├── Role
 ├── Addresses
 ├── Orders
 │      ├── Order Items → Product
 │      ├── Payment
 │      └── Delivery → Delivery Partner
 └── Activity / Audit Records
```

### Business-side (§48)
```
Product
 ├── Category
 ├── Price History
 ├── Stock
 └── Order Items

Staff
 ├── Role
 └── Deliveries

Debt
 └── Debt Payments
```

### Additional relational facts stated across the source
- Role ↔ Permissions is many-to-many via Role Permissions join entity.
- Delivery ↔ Delivery Status History is one-to-many (full history of status changes per delivery, each with changed_by/timestamp/notes).
- Order ↔ Payment: source implies one payment per order in the base model (no split/multiple-payment structure given) — `OPEN DECISION` if multiple partial payments per order need support.
- Order Items ↔ Product: item stores a name/price **snapshot**, not a live reference-only relationship — snapshot fields exist specifically so historical orders remain stable even if Product changes later.

---

## 12. BUSINESS RULES

Explicit rules stated in §60 "Business Rules" plus rules stated elsewhere in the doc, consolidated (duplicates removed):

**Product**
- Inactive products cannot be newly ordered.

**Stock**
- Stock cannot become negative.
- The system must never allow confirmed orders to exceed available inventory. (§18, repeated as core invariant)
- Stock restoration on cancellation must not create duplicate stock (§44).

**Order**
- Order items must reference valid products.
- Historical prices must not change once recorded on an order (§15, §20, §60).
- The order must preserve the price at time of purchase — even if the product's current price later changes, the historical order price stays as originally recorded.
- The order must preserve the delivery address used at checkout, even if the customer's saved address later changes (§47).

**Payment**
- A failed payment cannot mark an order as paid.
- The system must not incorrectly mark an order as paid (redundant restatement, §30).

**Delivery**
- Only assigned delivery partners can update their own deliveries.
- Delivery partner status transitions must be controlled by business rules, not arbitrary (no free jumping between states).

**Debt**
- Payment cannot exceed the remaining balance.
- `remaining_amount >= 0` (implied invariant, consistent with "cannot exceed remaining balance").
- `paid_amount <= original_amount` (implied, unless overpayment/refund process is later introduced — none is currently defined, so this holds as-is).

**Permissions**
- Users can only perform actions allowed by their assigned role.
- Frontend visibility is not security/authorization — every protected action must be validated server-side (§58, §65, restated multiple times as a cross-cutting principle).

**Data consistency / transactionality (§45)**
- The following operations must be transactional/atomic where appropriate: order creation, payment confirmation, stock updates, stock reservation, debt payment recording, delivery completion.
- Must avoid: payment marked successful but order not created; order created but stock not updated; debt payment recorded but remaining balance not updated.

---

## 13. VALIDATION RULES

From §59 "Data Validation":

**Product**
- Name required.
- Valid price.
- Valid quantity.

**Order**
- Valid product (must exist/be active).
- Valid quantity.
- Stock must be available.

**Payment**
- Valid amount.
- Valid order (must exist).
- Valid payment state (i.e., transition must be legal, e.g. cannot re-confirm an already-failed payment without a defined path).

**Debt**
- Positive amount.
- Payment cannot exceed remaining balance.

**Delivery**
- Valid order.
- Valid delivery partner.
- Valid status transition (must respect the delivery state machine — no arbitrary jumps).

**Stock validation touchpoints (§18):** must be validated at (1) cart/checkout stage, (2) order creation stage, (3) order confirmation stage. Exact reservation mechanism is left to implementation (`OPEN DECISION`).

---

## 14. FINANCIAL RULES

*(Covers Pricing, Payments, and Internal Debt — kept together since all three are financial-record concerns.)*

### Pricing
- Admin/Seller manages product price: create, update, review current, view previous, record who changed it, record when.
- Price history should be kept (example shown as date + price pairs).
- Historical orders must retain the price recorded at time of purchase — never recalculated from current product price.

### Payments
- Payment record fields: Payment ID, Order ID, Amount, Method, Status, Transaction/reference ID, timestamps.
- Statuses: Pending, Paid, Failed, Refunded.
- Payment methods possible per source: Online payment, Cash on Delivery, "other approved business payment methods" — no specific payment provider or gateway named anywhere (`OPEN DECISION`: exact provider/integration; do not invent one).
- Refund handling is mentioned only as a status value (`Refunded`) with no process defined — `TBD`.
- Duplicate payment protection required (mentioned as an edge case, §69), but no specific idempotency mechanism specified — `OPEN DECISION` on implementation detail (business requirement is clear: protect against duplicate transaction processing).

### Internal Pending Debt
- **Explicitly separate from customer/buyer debt** — this is the load-bearing distinction in the entire module; do not conflate.
- Debt fields: Debt ID, Description, Original amount, Paid amount, Remaining amount, Status, Created date, Payment history, Notes.
- Statuses: Pending, Partially Paid, Cleared, Overdue (conditional/optional per source wording "if required" — `OPEN DECISION`).
- Debt source/trigger is explicitly left "configurable according to the business process" — `OPEN DECISION`: what generates a debt record and to/from whom it is owed.
- Each debt payment creates its own transaction record (Debt Payments entity), preserving payment date, amount, recorded_by, and notes.
- Debt audit trail must preserve: who created the debt, who recorded each payment, payment date, amount paid, previous balance, remaining balance, notes. Financial records must not be overwritten in place.
- Invariants (derived, consistent with source): `remaining_amount >= 0`; `paid_amount <= original_amount` unless an overpayment/refund process is later introduced (none currently defined).

---

## 15. INVENTORY RULES

- Stock equation: `Current Stock = Opening Stock + Stock Added − Stock Sold − Stock Adjustments`.
- Supported operations: add stock, remove stock, adjust stock, view current stock, view stock history, identify low stock, identify out-of-stock products.
- **Stock reservation:** two users must never be able to successfully purchase the same unavailable quantity — i.e., no overselling under concurrency. Reservation mechanism itself is left to implementation (`OPEN DECISION`), but the outcome (never exceed available inventory on confirmed orders) is a hard, non-negotiable rule.
- Every meaningful stock modification must be traceable (Inventory Transactions / stock adjustment history) — capturing previous stock, adjustment delta, new stock, reason, changed-by actor, and date.
- Stock lifecycle: Added → Available → Reserved (for an order) → Deducted (on confirmation), OR Reserved → Released (on cancellation).
- Stock restoration after order cancellation must restore exactly the reserved/deducted quantity — and must not create duplicate stock (i.e., restoration logic must be idempotent / exactly-once).
- Low stock and out-of-stock are catalog-facing statuses tied to inventory quantity (see Product Lifecycle, §9.5 above) — whether these are persisted fields or derived at query time from quantity vs. a threshold is unspecified → `OPEN DECISION`.

---

## 16. DELIVERY RULES

- Delivery assignment: Admin/Seller assigns an order/delivery to a delivery partner; the assignment screen should show available partners, their current status, existing workload, and assigned deliveries — implying the seller needs real-time load visibility to choose sensibly.
- On assignment, Delivery Status = Assigned; the delivery partner receives a notification.
- Delivery Partner workflow is controlled and sequential (no skipping): Assigned → Accept → Accepted → Start Delivery → In Progress → Out for Delivery → Delivered.
- Delivery partner only sees the customer-safe delivery detail subset (recipient name, phone, address, order summary, status) — not internal business info (pricing internals, cost data, etc. are implied off-limits though not itemized explicitly).
- **Delivery completion:** partner marks "Delivered." Depending on business requirements, system *can* require OTP, signature, proof of delivery, or a delivery note — none of these is confirmed as mandatory; mark proof-of-delivery mechanism as `OPEN DECISION`/`TBD`. On successful completion: Delivery Status = Delivered AND Order Status = Delivered (both updated together), with a completion timestamp recorded.
- **Delivery failure:** possible reasons given — recipient unavailable, incorrect address, recipient unreachable, location inaccessible, other operational issue. Partner selects a reason and may add a note. Seller/Admin then reviews and resolves via: reschedule, reassign, cancel, or return to business. Exact resolution authority/workflow is controlled by seller/admin permission — no further granularity given (`OPEN DECISION` on exact reassignment/reschedule mechanics, e.g., automatic vs. manual, retry limits).
- **Delivery history** must preserve a full timeline per delivery: assigned time, accepted time, started time, out-for-delivery time, delivered time, failed time (if applicable), the delivery partner, and failure reason — for full operational traceability.
- **Customer-facing delivery view is intentionally simplified** — customer should not see full internal operational detail, only a high-level progress tracker (Placed/Confirmed/Processing/Assigned/Out for Delivery/Delivered).
- Availability states for delivery partners: Available, Busy, Offline — used by sellers to decide who gets a new assignment; UI should make this legible (e.g., partner + status + active delivery count).

---

## 17. REPORTING REQUIREMENTS

Report types explicitly named in the source (§38, §39):

| Report | Contents (as given) |
|---|---|
| Sales Report | Orders, products sold, quantities, revenue, date range |
| Stock Report | Current stock, low stock, out-of-stock, stock movements |
| Delivery Report | Assigned deliveries, completed deliveries, failed deliveries, delivery partner performance |
| Staff Report | Staff activity, delivery activity, assigned work |
| Debt Report | Total pending debt, payments received, remaining balance, cleared debts |
| Daily Operations Report | Filterable by date, staff, delivery status, product, order status, debt status (where applicable). Example metrics shown: Orders Created, Orders Completed, Products Sold (units), Deliveries Assigned/Completed/Failed, Pending Deliveries, Stock Adjustments, Debt Payments Recorded. Source explicitly states: *"The exact metrics should reflect the final business requirements"* — i.e., this is illustrative, not the final locked metric list. |

- Reports must be generated from real transactional data, not manual entry.
- Export behavior (formats, who can export) is not specified anywhere → `TBD`.
- Report audience: implied Admin/Seller primarily; Delivery Partner has "Limited" report access per the access matrix (§63) — exact scope of that limited access is unspecified (`OPEN DECISION`).

---

## 18. NOTIFICATION REQUIREMENTS

### Seller/Admin notifications
New order received, payment completed, delivery completed, delivery failed, low stock, new user registered.

### Customer notifications
Order confirmed, payment successful, order processing, delivery assigned, out for delivery, delivered.

### Delivery Partner notifications
New delivery assigned, delivery reassigned, delivery cancelled, important delivery update.

- Notification delivery channel (push, SMS, email, in-app only, etc.) is never specified anywhere in the source → `TBD`.
- Read/unread tracking is implied by the `Notifications` entity's `read_at` field but no explicit UI/UX behavior is described beyond that field's existence.

---

## 19. AUDIT REQUIREMENTS

- Audit log entry must contain: Actor, Action, Entity, Entity ID, Timestamp, and relevant previous/new values where appropriate.
- Explicitly called out as especially important for: Stock, Pricing, Payments, Debts, Roles, User status, Delivery status.
- Named audit-worthy example actions: Seller updated a product's price; Seller adjusted stock; Admin created a user; Admin changed role permissions; Delivery Partner marked an order delivered; Seller recorded a debt payment.
- Debt module specifically requires its own preserved trail (who created the debt, who recorded each payment, payment date, amount, previous/remaining balance, notes) — financial records must never be simply overwritten.
- Auditability is listed as a required system-wide quality: the business must always be able to answer who changed something, what was changed, when, and what the previous/new values were.

---

## 20. SECURITY REQUIREMENTS

From §58 (explicit) plus cross-cutting statements elsewhere:

- Secure authentication.
- Password hashing.
- Role-based authorization.
- Input validation (see §13 above for specifics by entity).
- Secure session/token handling.
- API-level authorization (every protected action validated server-side).
- Rate limiting "where appropriate" — no specific thresholds given (`OPEN DECISION`).
- Protection against unauthorized data access.
- Audit logging for important operations (cross-referenced with §19).
- **Core principle repeated multiple times across the doc: "Frontend visibility is not security" / "Hiding UI elements is not authorization."** Every protected action must be enforced server-side regardless of what the UI shows or hides.
- Delivery-partner-specific: only assigned partners may update their own deliveries (authorization boundary at the row/record level, not just role level).

---

## 21. UX REQUIREMENTS

### Shared design language (§70)
- Deep Navy primary color, white surfaces, soft gray backgrounds, clear typography, consistent spacing, subtle borders, minimal shadows, restrained semantic colors, clear status indicators, predictable navigation.
- Goal: the three applications should feel like parts of the same product while serving different purposes.

### Per-actor UI character (§71)
- **Admin/Seller:** information-rich, data-oriented, efficient, dashboard-oriented, table-heavy.
- **Customer:** product-oriented, simple, familiar, purchase-oriented, visual but restrained.
- **Delivery Partner:** mobile-first, operational, minimal, action-oriented, status-focused.

### Other UX statements found across the doc
- Customer product discovery must clearly surface: product name, price, availability, and relevant product info; system should prevent ordering unavailable products.
- Customer order tracking must be simplified relative to the internal operational view (§8.9 above).
- Errors must be understandable to normal (non-technical) users (§61) — with specific example message text given for: out-of-stock, payment failure, delivery assignment failure, unauthorized action, network failure.

*(Note: no specific color hex codes, typography scale, spacing tokens, or component-level design system values are given anywhere in this source document — unlike the PRD-generation instructions' own example palette, which was that document's own illustrative content, not sourced from this platform doc. Do not treat the instruction document's example hex codes as if they were part of this business's actual requirements — mark exact design tokens as `OPEN DECISION`/to be supplied separately.)*

---

## 22. NON-FUNCTIONAL REQUIREMENTS

From §62, qualitative only (no numeric SLAs given anywhere — none should be invented):

- **Reliable:** business-critical operations should not randomly fail.
- **Scalable:** architecture should support growth in products, users, orders, deliveries, staff.
- **Maintainable:** modules should have clear responsibilities.
- **Secure:** sensitive operations protected (cross-reference §20).
- **Responsive:** user-facing screens should respond quickly (no numeric target given).
- **Auditable:** important business actions traceable (cross-reference §19).

---

## 23. EDGE CASES

Explicitly enumerated in §69, consolidated with resolution guidance as given (none invented beyond source text):

| Edge Case | Source's Stated Handling |
|---|---|
| Product becomes out of stock during checkout | Revalidate stock before finalizing. |
| Product price changes while item is in cart | "Decide and display the applicable business rule before order confirmation" — i.e., the exact rule (lock price at add-to-cart vs. refresh at checkout) is **not decided** by the source → `OPEN DECISION`. |
| Delivery partner becomes unavailable after assignment | Allow seller/admin to reassign. |
| Customer cancels an eligible order | Restore stock and handle payment appropriately (exact refund/payment-reversal mechanics not detailed → `TBD`). |
| Payment succeeds but callback/request fails | Use payment verification before finalizing the order (i.e., don't trust the client-side success signal alone). |
| Delivery fails | Preserve the failed attempt and its reason. |
| User is deactivated with existing orders | Preserve historical orders. |
| Product is discontinued | Keep historical order information intact. |
| Debt receives partial payment | Update remaining balance. |
| Duplicate payment request | Protect against duplicate transaction processing. |
| Duplicate order submission | Protect against accidental duplicate order creation. |

No other edge cases are explicitly named in the source beyond this list (e.g., concurrent inventory modification is implied by the stock-reservation requirement in §18 but not listed as a standalone named edge case in §69 — cross-referenced above under Inventory Rules).

---

## 24. DEPENDENCIES

Inferred from the module/flow ordering the source itself uses repeatedly (§51 master flow, §64 frontend structure, §65 backend responsibilities) — not stated as an explicit "implementation order" section, but the sequencing is consistent everywhere it appears:

```
Authentication
   ↓
Users / Roles / Permissions
   ↓
Products (Catalog + Categories)
   ↓
Inventory + Pricing
   ↓
Customer-facing Commerce (Browse/Cart/Checkout)
   ↓
Orders
   ↓
Payments
   ↓
Delivery (Assignment → Partner workflow → Completion)
   ↓
Notifications + Reports + Audit (cross-cutting, layered throughout)
```

Debt Management is explicitly described as a **separate but shared financial domain** — not chained into the order pipeline; it can be built in parallel once Users/Audit exist. Its own dependency is minimal: Users (for created_by/recorded_by) and Audit.

Backend domains named directly (§66):
```
/auth /users /roles /permissions /products /categories /inventory
/pricing /cart /orders /payments /deliveries /staff /debts
/notifications /reports /audit-logs
```
No endpoint-level contracts are given — only domain/resource groupings.

---

## 25. OPEN DECISIONS (consolidated master list)

Every ambiguity flagged throughout this extraction, gathered in one place for the eventual PRD §42:

1. **Bulk/tiered pricing model** — source explicitly states *"the exact business rules for wholesale pricing can later be configured"*; no tiered or quantity-based pricing formula is defined.
2. **Minimum order quantity rules** — field exists on Product ("if applicable") but no numeric rule, per-product vs. global policy, or enforcement detail is given.
3. **Customer segmentation (wholesaler vs. retailer)** — both are named as customer types but no differentiated pricing, permissions, or behavior between them is defined anywhere.
4. **Cart price-lock vs. refresh-at-checkout** — explicitly left undecided by the source itself (§69).
5. **Payment provider/gateway** — never named; only payment method categories (Online, COD, "other approved") are given.
6. **Refund policy and mechanics** — `Refunded` exists as a payment status with no process defined.
7. **Order cancellation window/cutoff stage** — "may be allowed only before certain stages" without specifying which stage is the hard cutoff, and whether post-dispatch cancellation is even possible.
8. **Proof-of-delivery mechanism** (OTP / signature / photo / note) — explicitly conditional ("depending on business requirements") with no method chosen.
9. **Delivery reassignment/reschedule mechanics** — whether automatic or manual, retry limits, SLA for reassignment — not specified.
10. **Debt source/ownership** — what specifically generates an internal debt record and to/from whom it's owed is explicitly left "configurable according to the business process."
11. **Debt Overdue status** — conditional ("if required") with no aging threshold defined.
12. **Low-stock threshold** — mentioned repeatedly as a status but no numeric or per-product threshold rule is given; also unclear whether Low Stock/Out of Stock are persisted fields or derived at query time.
13. **Notification delivery channel(s)** — push/SMS/email/in-app not specified.
14. **Report export formats and permissions** — mentioned nowhere beyond the reports' existence.
15. **Wishlist feature** — appears once in the customer frontend structure list (§64) with zero supporting behavior defined elsewhere.
16. **Delivery-partner "Limited" report access** — exact scope of what "limited" means is undefined.
17. **Rate-limiting thresholds** — "where appropriate," no numbers given.
18. **Multiple/partial payments per order** — base data model implies one payment record per order; whether split/partial payments against a single order are supported is not addressed.
19. **Admin vs. Seller permission granularity** — §63's access matrix collapses Admin/Seller into one column even though §3.1–3.2 clearly separate them as full-authority vs. permission-gated; the exact seller permission subset needs to be defined at a finer grain.
20. **Overpayment/refund on Debt** — invariant `paid_amount <= original_amount` holds only "unless an overpayment/refund process is later introduced," which does not currently exist.
21. **Exact daily-operations-report metric list** — the example set given is explicitly called illustrative ("should reflect the final business requirements"), not final.
22. **Design system tokens** (colors/typography/spacing) — not specified anywhere in this source document at the implementation level, only qualitative direction (§70–71).

---

## Cross-Check Note

This extraction was built by reading the entire 2,597-line source document (all sections 1–75) in full, not from summary or partial excerpt. Every business rule, entity, workflow, and edge case explicitly stated in the source has a home in one of the categories above. Nothing has been invented to fill a gap — every gap found is listed in §25 as an Open Decision rather than resolved silently, per the governing instructions.

This document is the direct input for building the full `PRD.md`. Say the word when you want that generated from this extraction.
