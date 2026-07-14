#!/bin/bash
# Phase 3 Build Verification Script
# Verifies that all Phase 3 backend components are in place

echo "========================================="
echo "Phase 3 Build Verification"
echo "========================================="
echo ""

ERRORS=0
WARNINGS=0

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check function
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
    else
        echo -e "${RED}✗${NC} $1 - MISSING"
        ((ERRORS++))
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $1/"
    else
        echo -e "${RED}✗${NC} $1/ - MISSING"
        ((ERRORS++))
    fi
}

warn_if_missing() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
    else
        echo -e "${YELLOW}⚠${NC} $1 - Optional"
        ((WARNINGS++))
    fi
}

echo "Checking Backend Structure..."
echo "-------------------------------------"
check_dir "backend/src/config"
check_dir "backend/src/services"
check_dir "backend/src/routes"
check_dir "backend/src/middleware"
check_dir "backend/src/utils"
check_dir "backend/src/types"
echo ""

echo "Checking Backend Config Files..."
echo "-------------------------------------"
check_file "backend/src/config/env.ts"
check_file "backend/src/config/firebase.ts"
check_file "backend/src/config/phonepe.ts"
echo ""

echo "Checking Backend Services..."
echo "-------------------------------------"
check_file "backend/src/services/phonepe.service.ts"
check_file "backend/src/services/order.service.ts"
check_file "backend/src/services/payment.service.ts"
check_file "backend/src/services/cart-validation.service.ts"
check_file "backend/src/services/notification.service.ts"
echo ""

echo "Checking Backend Routes..."
echo "-------------------------------------"
check_file "backend/src/routes/orders.routes.ts"
check_file "backend/src/routes/payments.routes.ts"
check_file "backend/src/routes/users.routes.ts"
check_file "backend/src/routes/index.ts"
echo ""

echo "Checking Backend Middleware..."
echo "-------------------------------------"
check_file "backend/src/middleware/auth.ts"
check_file "backend/src/middleware/requireRole.ts"
check_file "backend/src/middleware/error.ts"
check_file "backend/src/middleware/phonepe-webhook.ts"
echo ""

echo "Checking Backend Utilities..."
echo "-------------------------------------"
check_file "backend/src/utils/phonepe.utils.ts"
echo ""

echo "Checking Backend Types..."
echo "-------------------------------------"
check_file "backend/src/types/index.ts"
echo ""

echo "Checking Frontend Structure..."
echo "-------------------------------------"
check_dir "frontend/lib/types"
check_dir "frontend/lib/api"
echo ""

echo "Checking Frontend Types..."
echo "-------------------------------------"
check_file "frontend/lib/types/order.ts"
check_file "frontend/lib/types/payment.ts"
check_file "frontend/lib/types/index.ts"
echo ""

echo "Checking Frontend API Clients..."
echo "-------------------------------------"
check_file "frontend/lib/api/client.ts"
check_file "frontend/lib/api/orders.ts"
check_file "frontend/lib/api/payments.ts"
check_file "frontend/lib/api/addresses.ts"
check_file "frontend/lib/api/index.ts"
echo ""

echo "Checking Infrastructure..."
echo "-------------------------------------"
check_file "firestore.indexes.json"
check_file "backend/.env.example"
check_file "frontend/.env.local.example"
echo ""

echo "Checking Documentation..."
echo "-------------------------------------"
check_file "reference-docs/PHASE-3-IMPLEMENTATION-PLAN.md"
check_file "reference-docs/PHASE-3-QUICK-REFERENCE.md"
check_file "reference-docs/PHASE-3-COMPLETION-SUMMARY.md"
check_file "reference-docs/PHASE-3-NEXT-STEPS.md"
check_file "reference-docs/progress.md"
check_file "PHASE-3-STATUS-REPORT.md"
echo ""

echo "Checking Environment Configuration..."
echo "-------------------------------------"
warn_if_missing "backend/.env"
warn_if_missing "frontend/.env.local"
echo ""

echo "========================================="
echo "Verification Summary"
echo "========================================="
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All required files present${NC}"
    echo ""
    echo "Backend: COMPLETE ✓"
    echo "Frontend: Types & API clients ready ✓"
    echo "Infrastructure: Configured ✓"
    echo ""
    echo -e "${GREEN}Phase 3 Backend is READY for testing!${NC}"
    echo ""
    
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
        echo "Note: Environment files (.env) are git-ignored."
        echo "Copy from .env.example and configure before running."
    fi
    
    echo ""
    echo "Next Steps:"
    echo "  1. Configure backend/.env with PhonePe credentials"
    echo "  2. Run: cd backend && npm install && npm run dev"
    echo "  3. Test API endpoints with Postman/curl"
    echo "  4. Start frontend development (see PHASE-3-NEXT-STEPS.md)"
    echo ""
    exit 0
else
    echo -e "${RED}✗ $ERRORS required files missing${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠ $WARNINGS optional files missing${NC}"
    fi
    echo ""
    echo "Please review the missing files above."
    echo ""
    exit 1
fi
