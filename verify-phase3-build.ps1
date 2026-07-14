# Phase 3 Build Verification Script (PowerShell)
# Verifies that all Phase 3 backend components are in place

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Phase 3 Build Verification" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$ERRORS = 0
$WARNINGS = 0

function Check-File {
    param($Path)
    if (Test-Path $Path) {
        Write-Host "[OK] $Path" -ForegroundColor Green
    } else {
        Write-Host "[MISSING] $Path" -ForegroundColor Red
        $script:ERRORS++
    }
}

function Check-Dir {
    param($Path)
    if (Test-Path $Path -PathType Container) {
        Write-Host "[OK] $Path/" -ForegroundColor Green
    } else {
        Write-Host "[MISSING] $Path/" -ForegroundColor Red
        $script:ERRORS++
    }
}

function Warn-IfMissing {
    param($Path)
    if (Test-Path $Path) {
        Write-Host "[OK] $Path" -ForegroundColor Green
    } else {
        Write-Host "[OPTIONAL] $Path" -ForegroundColor Yellow
        $script:WARNINGS++
    }
}

Write-Host "Checking Backend Structure..." -ForegroundColor White
Write-Host "-------------------------------------" -ForegroundColor White
Check-Dir "backend\src\config"
Check-Dir "backend\src\services"
Check-Dir "backend\src\routes"
Check-Dir "backend\src\middleware"
Check-Dir "backend\src\utils"
Check-Dir "backend\src\types"
Write-Host ""

Write-Host "Checking Backend Config Files..." -ForegroundColor White
Write-Host "-------------------------------------" -ForegroundColor White
Check-File "backend\src\config\env.ts"
Check-File "backend\src\config\firebase.ts"
Check-File "backend\src\config\phonepe.ts"
Write-Host ""

Write-Host "Checking Backend Services..." -ForegroundColor White
Write-Host "-------------------------------------" -ForegroundColor White
Check-File "backend\src\services\phonepe.service.ts"
Check-File "backend\src\services\order.service.ts"
Check-File "backend\src\services\payment.service.ts"
Check-File "backend\src\services\cart-validation.service.ts"
Check-File "backend\src\services\notification.service.ts"
Write-Host ""

Write-Host "Checking Backend Routes..." -ForegroundColor White
Write-Host "-------------------------------------" -ForegroundColor White
Check-File "backend\src\routes\orders.routes.ts"
Check-File "backend\src\routes\payments.routes.ts"
Check-File "backend\src\routes\users.routes.ts"
Check-File "backend\src\routes\index.ts"
Write-Host ""

Write-Host "Checking Backend Middleware..." -ForegroundColor White
Write-Host "-------------------------------------" -ForegroundColor White
Check-File "backend\src\middleware\auth.ts"
Check-File "backend\src\middleware\requireRole.ts"
Check-File "backend\src\middleware\error.ts"
Check-File "backend\src\middleware\phonepe-webhook.ts"
Write-Host ""

Write-Host "Checking Backend Utilities..." -ForegroundColor White
Write-Host "-------------------------------------" -ForegroundColor White
Check-File "backend\src\utils\phonepe.utils.ts"
Write-Host ""

Write-Host "Checking Backend Types..." -ForegroundColor White
Write-Host "-------------------------------------" -ForegroundColor White
Check-File "backend\src\types\index.ts"
Write-Host ""

Write-Host "Checking Frontend Structure..." -ForegroundColor White
Write-Host "-------------------------------------" -ForegroundColor White
Check-Dir "frontend\lib\types"
Check-Dir "frontend\lib\api"
Write-Host ""

Write-Host "Checking Frontend Types..." -ForegroundColor White
Write-Host "-------------------------------------" -ForegroundColor White
Check-File "frontend\lib\types\order.ts"
Check-File "frontend\lib\types\payment.ts"
Check-File "frontend\lib\types\index.ts"
Write-Host ""

Write-Host "Checking Frontend API Clients..." -ForegroundColor White
Write-Host "-------------------------------------" -ForegroundColor White
Check-File "frontend\lib\api\client.ts"
Check-File "frontend\lib\api\orders.ts"
Check-File "frontend\lib\api\payments.ts"
Check-File "frontend\lib\api\addresses.ts"
Check-File "frontend\lib\api\index.ts"
Write-Host ""

Write-Host "Checking Infrastructure..." -ForegroundColor White
Write-Host "-------------------------------------" -ForegroundColor White
Check-File "firestore.indexes.json"
Check-File "backend\.env.example"
Check-File "frontend\.env.local.example"
Write-Host ""

Write-Host "Checking Documentation..." -ForegroundColor White
Write-Host "-------------------------------------" -ForegroundColor White
Check-File "reference-docs\PHASE-3-IMPLEMENTATION-PLAN.md"
Check-File "reference-docs\PHASE-3-QUICK-REFERENCE.md"
Check-File "reference-docs\PHASE-3-COMPLETION-SUMMARY.md"
Check-File "reference-docs\PHASE-3-NEXT-STEPS.md"
Check-File "reference-docs\progress.md"
Check-File "PHASE-3-STATUS-REPORT.md"
Write-Host ""

Write-Host "Checking Environment Configuration..." -ForegroundColor White
Write-Host "-------------------------------------" -ForegroundColor White
Warn-IfMissing "backend\.env"
Warn-IfMissing "frontend\.env.local"
Write-Host ""

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Verification Summary" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

if ($ERRORS -eq 0) {
    Write-Host "All required files present" -ForegroundColor Green
    Write-Host ""
    Write-Host "Backend: COMPLETE" -ForegroundColor Green
    Write-Host "Frontend: Types and API clients ready" -ForegroundColor Green
    Write-Host "Infrastructure: Configured" -ForegroundColor Green
    Write-Host ""
    Write-Host "Phase 3 Backend is READY for testing!" -ForegroundColor Green
    Write-Host ""
    
    if ($WARNINGS -gt 0) {
        Write-Host "Warnings: $WARNINGS" -ForegroundColor Yellow
        Write-Host "Note: Environment files (.env) are git-ignored." -ForegroundColor Yellow
        Write-Host "Copy from .env.example and configure before running." -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "  1. Configure backend\.env with PhonePe credentials"
    Write-Host "  2. Run: cd backend; npm install; npm run dev"
    Write-Host "  3. Test API endpoints with Postman/curl"
    Write-Host "  4. Start frontend development (see PHASE-3-NEXT-STEPS.md)"
    Write-Host ""
    exit 0
} else {
    Write-Host "ERRORS: $ERRORS required files missing" -ForegroundColor Red
    if ($WARNINGS -gt 0) {
        Write-Host "WARNINGS: $WARNINGS optional files missing" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "Please review the missing files above." -ForegroundColor Red
    Write-Host ""
    exit 1
}
