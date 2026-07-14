# Single-Shop Wholesale Platform — Architecture Summary V2

**Last Updated:** July 13, 2026  
**Critical Change:** Multi-tenant marketplace → Single wholesaler platform

---

## Core Business Model

**What the platform IS:**
- A **single wholesale business's** order management and delivery platform
- One wholesaler managing one shop selling to many retailers
- Direct B2B relationship (NOT a marketplace)

**What the platform IS NOT:**
- A marketplace connecting multiple wholesalers
- A multi-tenant SaaS platform
- A shop discovery/selection system

---

## System Actors

| Actor | Count | Description |
|-------|-------|-------------|
| **Admin** | 1 | Platform administrator |
| **Wholesaler** | 1 | Business owner (fixed account) |
| **Shop** | 1 | Business storefront (fixed entity) |
| **Retailers** | Many | Customers who purchase products |
| **Delivery Partners** | Many | Personnel who deliver orders |

---

## Architectural Constraints (MANDATORY)

### 1. Single Wholesaler Constraint

**The wholesaler is THE business, not one of many sellers.**

**Must NEVER implement:**
- Wholesaler registration
- Wholesaler onboarding
- Wholesaler approval workflow
- Wholesaler discovery
- Wholesaler switching
- Multi-tenant isolation via wholesalerId
- Wholesaler marketplace features

**Implementation approach:**
- Wholesaler account created via seed script
- Wholesaler ID can be hardcoded or fetched from single record
- No wholesaler selection UI anywhere
- All business logic assumes one wholesaler


### 2. Single Shop Constraint

**There is only one shop that all retailers purchase from.**

**Must NEVER implement:**
- Shop discovery/search
- Shop selection dropdown
- Nearby shops feature
- Shop verification workflow
- Shop marketplace
- Multiple shop management

**Implementation approach:**
- Shop created by wholesaler during initial setup
- Shop ID fetched from single record or hardcoded
- No shop selection UI for retailers
- All products belong to the single shop
- All orders go to the single shop

### 3. Retailer Experience Principle

**Retailers should experience a premium e-commerce storefront, not a marketplace.**

Think: **Flipkart/Amazon shopping experience**, not **Etsy seller browsing**.

Retailers should:
- Land directly on product catalog
- Browse/search products seamlessly
- Add to cart and checkout smoothly
- Never see "shop selection" or "seller selection"
- Get a consistent branded experience

---

## Complete Phase Breakdown

### Phase 0: Foundation (1-2 weeks)
- Repository setup
- Firebase configuration
- Development environment
- Third-party account creation
- CI/CD foundation

### Phase 1: Authentication & RBAC (1-2 weeks)
- User registration/login
- Role-based access control
- Protected routes
- Admin/Wholesaler seed accounts
- Session management

### Phase 2: Single Shop Setup (1 week)
- Wholesaler creates their shop
- Shop profile management
- Business hours configuration
- Shop settings
- **Note:** This is one-time configuration, not marketplace shop creation


### Phase 3: Product Catalog & Inventory (2 weeks)
- Product CRUD (wholesaler only)
- Category management
- Inventory tracking
- Pricing management
- MOQ (Minimum Order Quantity) configuration
- Product images (Cloudinary)
- Product availability toggles

### Phase 4: Retail Shopping Experience (2 weeks)
- Product browsing (retailers)
- Search and filters
- Product detail pages
- Shopping cart
- Cart persistence
- MOQ validation
- Stock availability checking

### Phase 5: Order Placement & PhonePe Payments (2-3 weeks)
- Checkout flow
- Delivery address management
- Payment method selection
- **PhonePe Business** integration
  - UPI
  - Cards (Credit/Debit)
  - Net Banking
  - Wallets
- Cash on Delivery (COD) option
- Order creation (PENDING_APPROVAL state)
- Payment verification
- Order confirmation
- Email notifications

**Critical:** Orders are created but inventory is NOT decremented yet. That happens after wholesaler approval in Phase 7.

### Phase 6: Premium Retail UI Enhancement (Phase 3.9) (1-2 weeks)
**Purpose:** Dedicated UI/UX improvement phase

**NO new business logic** — only visual and experience improvements:
- Redesign product cards
- Enhanced product detail pages
- Improved search/filter UI
- Better cart experience
- Premium checkout flow
- Loading states and skeletons
- Animations and transitions
- Mobile responsiveness
- Accessibility improvements
- Design system refinement
- Performance optimization

**Goal:** Make retailer experience match Flipkart/Amazon quality


### Phase 7: Order Approval & Inventory Lock (1 week)
- Wholesaler order dashboard
- Order details view
- Approve/Reject actions
- **Inventory decrement** (on approval only)
- Inventory rollback (on rejection)
- Order state transitions
- Approval notifications
- Rejection reasons

**State Flow:**
```
PENDING_APPROVAL → [Wholesaler Action] → APPROVED or REJECTED
                                           ↓
                                    Inventory Locked
```

### Phase 8: Delivery Assignment (1 week)
- Admin assigns delivery partner
- Delivery partner notification
- Assignment dashboard
- Order handoff
- Pickup OTP generation

**State Flow:**
```
APPROVED → PACKED → READY_FOR_PICKUP → ASSIGNED
```

### Phase 9: Delivery Execution & OTP (1-2 weeks)
- Delivery partner app/dashboard
- Pickup OTP verification
- Delivery status updates
- Drop OTP verification
- Real-time location tracking (optional)
- Delivery completion
- POD (Proof of Delivery)

**State Flow:**
```
ASSIGNED → PICKED_UP → ON_THE_WAY → DELIVERED
```

### Phase 10: COD Settlement & Ledger (1 week)
- COD cash collection tracking
- Delivery partner ledger
- Payment reconciliation
- Settlement workflow
- Payment status tracking
- Dispute management basics

### Phase 11: Support & Disputes (1 week)
- Order issue reporting
- Dispute creation (retailers)
- Dispute resolution (admin)
- Dispute state machine
- Communication system
- Attachment uploads


### Phase 12: Admin Dashboard & Analytics (1-2 weeks)
- User management
- Order analytics
- Revenue dashboard
- Inventory reports
- Delivery performance metrics
- System monitoring
- Configuration management

### Phase 13: Production Hardening (1-2 weeks)
- Security audit
- Performance optimization
- Error handling improvements
- Logging and monitoring
- Backup procedures
- Rate limiting
- DDoS protection
- Load testing
- Security penetration testing

### Phase 14: Launch Readiness (1 week)
- Production environment setup
- Domain configuration
- SSL certificates
- Email templates finalization
- Legal pages (Terms, Privacy)
- User documentation
- Training materials
- Go-live checklist
- Rollback plan

---

## Order State Machine

```
PENDING_APPROVAL (After payment)
    ↓ [Wholesaler approves]
APPROVED (Inventory locked)
    ↓ [Wholesaler packs]
PACKED
    ↓ [Wholesaler ready]
READY_FOR_PICKUP
    ↓ [Admin assigns]
ASSIGNED
    ↓ [Partner picks up with OTP]
PICKED_UP
    ↓ [Partner en route]
ON_THE_WAY
    ↓ [Partner delivers with OTP]
DELIVERED
    ↓ [COD collected]
PAYMENT_SETTLED

[Any state before READY_FOR_PICKUP can → CANCELLED]
[DELIVERED can → DISPUTED]
```

---

## Database Schema (Firestore Collections)

### Core Collections

**users** (Firebase Auth + Firestore)
- Admin (1 document)
- Wholesaler (1 document)
- Retailers (many documents)
- Delivery Partners (many documents)

**shops** (1 document total)
- The single shop configuration
- Owned by the wholesaler
- Contains business info, hours, settings

**items** (products)
- All products belong to the single shop
- No shopId needed for isolation (there's only one shop)
- Can include shopId for data model consistency

**orders**
- retailerId (who placed the order)
- shopId (always the single shop)
- wholesalerId (always the single wholesaler)
- items (product snapshots)
- pricing (immutable at order time)
- state (order state machine)
- payment info
- delivery info

**payments**
- PhonePe payment records
- COD payment records
- Status tracking
- Transaction IDs

**order_audit_log**
- Complete order history
- State transitions
- Actor information
- Timestamps

**deliveries**
- Assigned partner
- Pickup/Drop OTPs
- Status updates
- Location tracking (optional)

**ledger_entries**
- COD transactions
- Settlement records
- Payment reconciliation

---

## Payment Integration: PhonePe Business

### Supported Methods

✓ UPI  
✓ Credit Cards  
✓ Debit Cards  
✓ Net Banking  
✓ Wallets (PhonePe, Paytm, etc.)  
✓ Cash on Delivery


### Integration Flow

1. **Checkout:**
   - Retailer selects payment method
   - For prepaid: redirect to PhonePe
   - For COD: create order directly

2. **PhonePe Payment:**
   - Create payment request
   - Redirect to PhonePe gateway
   - Retailer completes payment
   - PhonePe redirects back with status

3. **Verification:**
   - Verify payment via PhonePe status API
   - Verify signature/checksum
   - Update payment status
   - Create order if payment successful

4. **Callbacks:**
   - Handle PhonePe webhooks
   - Idempotency checks
   - Retry logic for failed verifications

5. **COD Flow:**
   - Create order with PENDING status
   - Payment marked as COD
   - Actual collection tracked post-delivery

---

## Retailer Experience Journey

**Goal:** Premium e-commerce shopping experience

### 1. Discovery & Browsing
- Land directly on product catalog
- See featured products
- Browse by category
- Search with filters
- View product ratings (future)

### 2. Product Details
- High-quality images
- Detailed descriptions
- Pricing (with MOQ info)
- Stock availability
- Add to cart

### 3. Shopping Cart
- Cart summary
- Quantity adjustment
- Remove items
- MOQ validation
- Stock checking
- Estimated total

### 4. Checkout
- Delivery address (save multiple)
- Address validation
- Contact information
- Order review


### 5. Payment
- Payment method selection
- PhonePe integration (UPI, Cards, etc.)
- COD option
- Secure payment processing
- Payment confirmation

### 6. Post-Order
- Order confirmation page
- Order tracking
- Order history
- Order details
- Reorder option
- Support/Help

**UI Quality Standards:**
- Responsive (mobile-first)
- Fast loading (<2s)
- Smooth animations
- Intuitive navigation
- Clear CTAs
- Professional design
- Accessible (WCAG AA)

---

## Wholesaler Dashboard

### Key Features

1. **Shop Management**
   - Edit shop profile
   - Update operating hours
   - Configure settings

2. **Product Management**
   - Add/Edit/Delete products
   - Bulk upload
   - Inventory management
   - Pricing updates
   - Category management

3. **Order Management**
   - New order alerts
   - Pending approvals queue
   - Order details view
   - Approve/Reject actions
   - Order history
   - Fulfillment tracking

4. **Inventory Dashboard**
   - Stock levels
   - Low stock alerts
   - Reorder management
   - Stock history

5. **Analytics**
   - Sales overview
   - Revenue trends
   - Top products
   - Order statistics

---

## Delivery Partner Experience

### Mobile-First Interface

1. **Dashboard**
   - Available deliveries
   - Assigned deliveries
   - Delivery history
   - Earnings summary

2. **Delivery Flow**
   - Accept assignment
   - View order details
   - Get shop location (pickup)
   - Enter pickup OTP
   - Mark picked up
   - Navigate to delivery address
   - Enter drop OTP
   - Mark delivered
   - Upload POD (optional)

3. **Tracking**
   - Current delivery status
   - Route navigation
   - Customer contact (masked)
   - Support/Help

---

## Admin Dashboard

### Responsibilities

1. **User Management**
   - Approve retailers (if manual approval)
   - Approve delivery partners
   - Suspend/activate users
   - User support

2. **Delivery Management**
   - Assign deliveries
   - Monitor delivery status
   - Handle escalations
   - Partner performance

3. **System Monitoring**
   - Order flow monitoring
   - Payment reconciliation
   - Dispute resolution
   - System health

4. **Reports & Analytics**
   - Business overview
   - User analytics
   - Revenue reports
   - Performance metrics

5. **Configuration**
   - System settings
   - Email templates
   - Notification rules
   - Business rules

---

## Technical Architecture Principles

### 1. Modularity
- Separate services for distinct domains
- Clear service boundaries
- Reusable components

### 2. Single Responsibility
- Each service handles one concern
- Middleware for cross-cutting concerns
- Clear separation of business logic

### 3. Scalability Preparation
- Design allows future multi-shop expansion
- Stateless services where possible
- Horizontal scaling ready
- **Current implementation: Single wholesaler, single shop**

### 4. Security First
- Authentication on all protected routes
- Role-based access control
- Input validation everywhere
- SQL injection prevention (N/A for Firestore)
- XSS protection
- CSRF protection
- Rate limiting

### 5. Data Integrity
- Immutable order snapshots
- Audit logging for all state changes
- Transaction handling for critical operations
- Idempotency for payments

### 6. Performance
- Efficient Firestore queries
- Composite indexes
- Client-side caching
- Image optimization (Cloudinary)
- Code splitting (Next.js)
- CDN usage

### 7. Maintainability
- TypeScript everywhere
- Consistent code style
- Comprehensive documentation
- Clear naming conventions
- Self-documenting code

---

## Notification Strategy

### Email Notifications (Brevo)

**Retailers:**
- Welcome email
- Order confirmation
- Payment confirmation
- Order approved
- Order shipped
- Out for delivery
- Delivered
- Order cancelled/rejected


**Wholesaler:**
- New order alert
- Low stock alert
- Daily order summary

**Delivery Partners:**
- Delivery assigned
- Pickup reminder
- Delivery completed

**Admin:**
- System alerts
- Escalation notifications
- Daily summary

### In-App Notifications

- Real-time updates
- Order status changes
- New messages
- Important alerts

### Push Notifications (Future)

- Mobile app notifications
- Critical alerts
- Order updates

---

## Security Considerations

### Authentication & Authorization

✓ Firebase Auth with custom claims  
✓ Role-based middleware  
✓ Protected API routes  
✓ Session management  
✓ Token expiration handling  

### Payment Security

✓ PhonePe signature verification  
✓ No sensitive data storage  
✓ PCI DSS compliance (via PhonePe)  
✓ HTTPS only  
✓ Webhook signature validation  

### Data Protection

✓ Firestore security rules  
✓ User data encryption  
✓ Privacy compliance (GDPR ready)  
✓ Data retention policies  
✓ Audit logging  

### API Security

✓ Rate limiting  
✓ Input validation  
✓ Error handling (no sensitive data leaks)  
✓ CORS configuration  
✓ Request size limits  

---

## Testing Strategy

### Unit Testing

- Service layer functions
- Utility functions
- Validation logic
- Business rules
- State machine transitions

### Integration Testing

- API endpoints
- Payment flows
- Order workflows
- Authentication flows
- Notification delivery

### End-to-End Testing

- Complete user journeys
- Retailer shopping flow
- Order fulfillment flow
- Delivery execution flow
- Payment processing

### Manual Testing

- UI/UX testing
- Cross-browser testing
- Mobile responsiveness
- Accessibility testing
- Security testing

### Performance Testing

- Load testing
- Stress testing
- API response times
- Database query performance
- Frontend rendering performance

---

## Deployment Strategy

### Environments

1. **Development**
   - Local development
   - Firebase emulators
   - Sandbox payment gateway

2. **Staging**
   - Pre-production testing
   - QA environment
   - Sandbox integrations
   - Production-like data

3. **Production**
   - Live environment
   - Production Firebase project
   - Live payment gateway
   - Real data

### CI/CD Pipeline

- Automated testing on PR
- Build verification
- Staging deployment on merge to develop
- Production deployment on release tag
- Automated rollback capability


### Deployment Checklist

**Pre-Production:**
- [ ] All tests passing
- [ ] Security audit complete
- [ ] Performance benchmarks met
- [ ] Error handling tested
- [ ] Backup procedures verified
- [ ] Rollback plan documented
- [ ] Monitoring configured
- [ ] SSL certificates ready
- [ ] Domain configured
- [ ] Email templates verified

**Go-Live:**
- [ ] Production Firebase project
- [ ] PhonePe live credentials
- [ ] Cloudinary production account
- [ ] Brevo production account
- [ ] DNS configured
- [ ] Admin account created
- [ ] Wholesaler account created
- [ ] Shop configured
- [ ] Initial products loaded
- [ ] Legal pages live

**Post-Launch:**
- [ ] Monitoring active
- [ ] Error tracking working
- [ ] Backup running
- [ ] Support team ready
- [ ] Documentation complete

---

## Migration Strategy (If Applicable)

### From Multi-Tenant to Single-Shop

If migrating from a previous multi-tenant implementation:

1. **Data Migration**
   - Identify the primary wholesaler
   - Extract their shop data
   - Extract their products
   - Map retailer relationships
   - Migrate order history

2. **Code Refactoring**
   - Remove wholesaler selection logic
   - Remove shop discovery
   - Simplify data access patterns
   - Update UI to remove marketplace elements
   - Fix hardcoded assumptions

3. **Testing**
   - Verify data integrity
   - Test all user flows
   - Validate reports and analytics
   - Check payment flows


4. **User Communication**
   - Notify existing users
   - Update documentation
   - Provide training if needed
   - Support transition period

---

## Future Extensibility

### Designed for Growth

While the current implementation is **single wholesaler, single shop**, the architecture is designed to allow future expansion:

**Potential Future Enhancements:**

1. **Multiple Shops (Same Wholesaler)**
   - Wholesaler can create multiple storefronts
   - Branch management
   - Location-based routing
   - Inventory per location

2. **Multi-Wholesaler Platform**
   - Convert to marketplace
   - Add wholesaler onboarding
   - Implement shop discovery
   - Add tenant isolation
   - Revenue sharing system

3. **Advanced Features**
   - Product recommendations
   - Loyalty programs
   - Bulk ordering
   - Subscription orders
   - Credit management
   - Advanced analytics
   - Mobile apps (native)
   - WhatsApp integration

**Design Principles for Extensibility:**

- Modular service architecture
- Configurable business rules
- Flexible data model
- Scalable infrastructure
- Clear abstraction layers

**Current Implementation Rules:**

✓ Implement only single-wholesaler, single-shop  
✓ Keep code modular for future changes  
✓ Avoid hardcoding where possible  
✓ Use configuration over code where applicable  
✓ Document assumptions clearly  

---

## Critical Implementation Guidelines

### For Development Teams

**ALWAYS Remember:**

1. **There is ONE wholesaler**
   - Never build wholesaler selection
   - Never build wholesaler registration
   - Wholesaler ID can be fetched from config or single record
   - All orders go to the same wholesaler

2. **There is ONE shop**
   - Never build shop discovery
   - Never build shop selection
   - Shop ID can be fetched from config or single record
   - All products belong to this shop

3. **Retailers are customers**
   - They shop, not browse sellers
   - Premium e-commerce experience
   - No marketplace terminology in retailer UI
   - Direct product catalog access

4. **State Management**
   - Orders created as PENDING_APPROVAL
   - Inventory locked only after approval
   - All state transitions logged
   - Audit trail for compliance

5. **Payment Gateway**
   - PhonePe Business ONLY
   - No Razorpay
   - Support all PhonePe methods
   - COD as alternative

### Code Review Checklist

Before merging any code, verify:

- [ ] No wholesaler selection UI
- [ ] No shop discovery/selection UI
- [ ] No multi-tenant isolation logic
- [ ] Retailer UI is e-commerce focused
- [ ] No marketplace terminology
- [ ] PhonePe integration (not Razorpay)
- [ ] Single shop assumption respected
- [ ] Proper role-based access control
- [ ] Audit logging present
- [ ] Error handling implemented
- [ ] Tests written and passing
- [ ] Documentation updated

---

