# Single-Shop Wholesale Platform — Complete Implementation Plan V2

**Document Version:** 2.0  
**Last Updated:** July 13, 2026  
**Architecture:** Single Wholesaler, Single Shop, B2B Wholesale Platform

---

## Executive Summary

This document presents a complete implementation plan for a **Single-Shop B2B Wholesale Order Management & Delivery Platform**.

### Critical Architectural Constraints

**This is NOT a marketplace.**

The platform represents **one wholesale business** selling to multiple retailers through a single shop. There is:

- **Exactly one wholesaler** (the business owner)
- **Exactly one shop** (the business storefront)
- **Multiple retailers** (customers)
- **Multiple delivery partners** (logistics providers)
- **One admin** (platform administrator)

### Key Architectural Changes from Previous Design

**Removed:**
- Multi-tenant marketplace architecture
- Wholesaler registration/onboarding
- Shop discovery and selection
- Multiple shop management
- Tenant isolation via wholesaler IDs
- Marketplace seller concepts
- Razorpay payment integration

**Added:**
- Single wholesaler fixed account
- Single shop fixed configuration
- Premium retailer shopping experience
- PhonePe Business payment gateway
- Dedicated UI/UX enhancement phase
- Streamlined business workflows

### Technology Stack

**Frontend:** Next.js 14+, TypeScript, Tailwind CSS  
**Backend:** Node.js, Express, TypeScript  
**Database:** Firebase Firestore  
**Authentication:** Firebase Auth  
**Payments:** PhonePe Business Payment Gateway  
**Email:** Brevo (Sendinblue)  
**Storage:** Cloudinary  
**Hosting:** Firebase Hosting + Cloud Functions

---

## Phase 0: Project Foundation & Setup

**Duration:** 1-2 weeks  
**Objective:** Establish technical foundation and development environment


### Scope

- Repository structure
- Development environment configuration
- Firebase project setup
- Third-party service accounts
- CI/CD pipeline foundation
- Code quality tools
- Documentation structure

### Backend Tasks

1. **Repository & Project Structure**
   - Initialize monorepo structure (backend, frontend, shared)
   - Configure TypeScript for backend
   - Setup ESLint and Prettier
   - Configure environment variables structure
   - Create .env.example templates

2. **Firebase Project Configuration**
   - Create Firebase project
   - Enable Authentication (Email/Password, Phone)
   - Setup Firestore database
   - Configure security rules (restrictive by default)
   - Enable Cloud Functions
   - Setup Firebase Admin SDK credentials
   - Configure emulators for local development

3. **Backend Service Architecture**
   - Setup Express server structure
   - Configure CORS policies
   - Setup error handling middleware
   - Configure logging (structured logging)
   - Setup health check endpoints
   - Configure request validation middleware

4. **Database Schema Design**
   - Design Firestore collections structure
   - Define document schemas
   - Plan composite indexes
   - Design audit log structure
   - Plan data retention policies

### Frontend Tasks

1. **Next.js Project Setup**
   - Initialize Next.js 14+ with App Router
   - Configure TypeScript
   - Setup Tailwind CSS
   - Configure path aliases (@/)
   - Setup layout structure


2. **UI Foundation**
   - Configure design tokens (colors, spacing, typography)
   - Setup component library structure
   - Configure responsive breakpoints
   - Setup global styles
   - Create base layout components

3. **Firebase Integration**
   - Install Firebase SDK
   - Configure Firebase client initialization
   - Setup authentication context
   - Create authentication hooks

### External Integrations

- **Firebase:** Project setup and service enablement
- **Brevo:** Account creation, API key generation
- **Cloudinary:** Account setup, upload presets
- **PhonePe Business:** Merchant account registration (sandbox for dev)

### Dependencies

None (foundation phase)

### Risks

- Firebase project limits (quotas)
- Third-party service availability
- Environment configuration complexity

### Decisions Required

1. Environment strategy (dev, staging, production)
2. Logging and monitoring provider
3. Error tracking service (Sentry, etc.)
4. Backup and disaster recovery strategy

### Testing Strategy

- Manual verification of project setup
- Firebase emulator testing
- Environment configuration validation

### Exit Criteria

✓ Repository initialized with proper structure  
✓ All development tools configured  
✓ Firebase project created and configured  
✓ Third-party accounts created  
✓ Backend and frontend projects build successfully  
✓ Development environment documented  
✓ Team can run project locally

---

## Phase 1: Authentication & Role-Based Access Control

**Duration:** 1-2 weeks  
**Objective:** Implement secure authentication and role-based access system

### Scope

- User registration and login
- Role-based authentication
- Protected routes
- Session management
- User profile management
- Role-specific dashboards

**Roles in System:**
- `admin` - Platform administrator (one account)
- `wholesaler` - Business owner (one account)
- `retailer` - Customer (multiple accounts)
- `delivery_partner` - Delivery personnel (multiple accounts)

### Backend Tasks

1. **Authentication Service**
   - Implement Firebase Auth token verification middleware
   - Create JWT token validation
   - Build session management
   - Implement role extraction from custom claims
   - Create authentication error handling

2. **User Management Service**
   - User registration endpoints (POST /auth/register)
   - User login endpoint (POST /auth/login)
   - Profile management (GET/PUT /users/me)
   - Role validation service
   - User status management (active, suspended, pending_approval)

3. **Role-Based Access Control (RBAC)**
   - Create requireRole middleware
   - Implement role hierarchy
   - Build permission checking service
   - Create role-based route protection

4. **User Collection Schema**
   ```
   users/{uid}
   - uid: string
   - email: string
   - phone: string
   - name: string
   - role: 'admin' | 'wholesaler' | 'retailer' | 'delivery_partner'
   - status: 'active' | 'suspended' | 'pending_approval'
   - createdAt: timestamp
   - updatedAt: timestamp
   - profile: object (role-specific data)
   ```


5. **Initial Account Setup**
   - Create seed script for admin account
   - Create seed script for wholesaler account
   - Build user verification system
   - Implement password reset flow

### Frontend Tasks

1. **Authentication Pages**
   - Login page (email/password)
   - Registration page (retailers and delivery partners only)
   - Forgot password page
   - Password reset page
   - Phone verification (if using phone auth)

2. **Authentication Context & Hooks**
   - Create AuthProvider
   - Build useAuth hook
   - Implement useUser hook
   - Create useRole hook
   - Session persistence

3. **Protected Routing**
   - Create route protection HOC
   - Implement role-based redirects
   - Build middleware for auth checking
   - Create pending approval page
   - Build no-role fallback page

4. **Role-Specific Layouts**
   - Admin layout shell
   - Wholesaler layout shell
   - Retailer layout shell
   - Delivery partner layout shell

5. **Landing & Onboarding**
   - Public landing page
   - Role selection page (for registration)
   - Welcome pages per role

### External Integrations

- **Firebase Authentication:** User creation, token management
- **Brevo:** Welcome emails, verification emails

### Dependencies

- Phase 0 complete


### Risks

- Firebase Auth rate limits
- Email delivery issues
- Session management complexity
- Role synchronization between Firebase and Firestore

### Decisions Required

1. Retailer approval workflow (auto-approve or manual review)
2. Delivery partner onboarding process
3. Password policy requirements
4. Session timeout duration
5. Multi-device session handling

### Testing Strategy

- Unit tests for authentication middleware
- Integration tests for registration flow
- Manual testing of all auth flows
- Security testing for unauthorized access
- Role-based access testing

### Exit Criteria

✓ Users can register with email/password  
✓ Login works for all roles  
✓ Role-based routing works correctly  
✓ Protected routes are secure  
✓ Session management works  
✓ Admin and wholesaler seed accounts created  
✓ Password reset flow functional  
✓ All role-specific dashboards accessible  

---

## Phase 2: Single Shop Setup & Configuration

**Duration:** 1 week  
**Objective:** Create and configure the single shop that all retailers will use

### Scope

**Critical:** This phase implements the **single shop** that represents the wholesaler's business. This is NOT a marketplace shop creation tool.

- Wholesaler creates their one shop
- Shop configuration
- Business information
- Operating hours
- Shop settings

**What this phase does NOT include:**
- Shop discovery
- Shop selection
- Multiple shops
- Shop marketplace

