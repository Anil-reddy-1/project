git reset HEAD~20

git add backend/package.json backend/package-lock.json backend/src/index.js backend/QUICKSTART.md backend/README.md backend/SEED_ADMIN.md docker-compose.yaml .env.example
git commit -m "chore: setup backend core and configs"

git add backend/src/controller/userController.js backend/src/controller/authController.js backend/src/controller/signupController.js backend/src/models/userModel.js backend/src/models/createTables.js backend/src/services/userService.js backend/src/routes/user.routes.js backend/src/routes/auth.routes.js backend/src/routes/signup.routes.js backend/test/auth.test.js
git commit -m "feat: implement backend authentication and user models"

git add backend/src/middleware/ backend/src/utils/ backend/src/config/
git commit -m "feat: add backend middleware, utils, and configurations"

git add backend/src/controller/productController.js backend/src/models/productModel.js backend/src/routes/product.routes.js backend/src/controller/pricingController.js backend/src/routes/pricing.routes.js
git commit -m "feat: implement backend product and pricing endpoints"

git add backend/src/controller/orderController.js backend/src/models/orderModel.js backend/src/routes/order.routes.js backend/src/controller/deliveryController.js backend/src/models/deliveryModel.js backend/src/routes/delivery.routes.js
git commit -m "feat: implement backend order and delivery models"

git add backend/src/controller/stockController.js backend/src/models/stockModel.js backend/src/routes/stock.routes.js backend/src/controller/debtController.js backend/src/models/debtModel.js backend/src/routes/debt.routes.js backend/src/controller/wishlistController.js backend/src/models/wishlistModel.js backend/src/routes/wishlist.routes.js
git commit -m "feat: implement stock, debt, and wishlist controllers"

git add backend/src/controller/staffController.js backend/src/models/staffModel.js backend/src/routes/staff.routes.js backend/src/controller/roleController.js backend/src/routes/role.routes.js backend/src/controller/dashboardController.js backend/src/routes/dashboard.routes.js backend/src/controller/reportController.js backend/src/routes/report.routes.js backend/src/models/seedAdmin.js backend/src/controller/uploadController.js backend/src/routes/upload.routes.js
git commit -m "feat: add backend staff, roles, and admin dashboard services"

git add backend/migrations/ backend/scripts/ create_database.sql API_REFERENCE.md
git commit -m "chore: add database scripts and API references"

git add frontend/package.json frontend/package-lock.json frontend/vite.config.ts frontend/tailwind.config.js frontend/postcss.config.cjs frontend/README.md skills-lock.json
git commit -m "chore: setup frontend configuration and dependencies"

git add frontend/src/App.tsx frontend/src/index.css frontend/src/auth.css frontend/src/context/AuthContext.tsx frontend/src/firebase.ts frontend/src/utils/api.ts frontend/src/utils/productUtils.ts
git commit -m "feat: configure frontend core app, styling, and auth context"

git add frontend/src/pages/Login.tsx frontend/src/pages/Signup.tsx frontend/src/pages/ForgotPassword.tsx frontend/src/components/ProtectedRoute.tsx frontend/src/components/RoleBasedHome.tsx frontend/src/components/Navbar.tsx
git commit -m "feat: build frontend authentication pages and nav components"

git add frontend/src/pages/admin/Dashboard.tsx frontend/src/components/layout/ frontend/src/components/auth/
git commit -m "feat: implement frontend admin dashboard and layouts"

git add frontend/src/pages/admin/ProductManagement.tsx frontend/src/pages/admin/PricingManagement.tsx frontend/src/components/products/
git commit -m "feat: add frontend admin product and pricing management"

git add frontend/src/pages/admin/StockManagement.tsx frontend/src/pages/admin/DebtManagement.tsx
git commit -m "feat: add frontend admin stock and debt management pages"

git add frontend/src/pages/admin/StaffManagement.tsx frontend/src/pages/admin/RoleManagement.tsx frontend/src/pages/admin/UserManagement.tsx
git commit -m "feat: add frontend admin staff and role management interfaces"

git add frontend/src/pages/admin/DeliveryManagement.tsx frontend/src/pages/admin/Reports.tsx
git commit -m "feat: create frontend delivery and reports management pages"

git add frontend/src/pages/buyer/ frontend/src/pages/delivery/
git commit -m "feat: implement frontend buyer and delivery views"

git rm --ignore-unmatch frontend/src/pages/faculty/Dashboard.tsx frontend/src/pages/student/Dashboard.tsx 
git commit -m "refactor: remove obsolete frontend pages"

git add frontend/src/components/ui/ frontend/src/hooks/ frontend/src/lib/ frontend/src/services/ frontend/src/types/ frontend/public/
git commit -m "feat: add frontend ui components, hooks, and services"

git add -A
git commit -m "chore: include miscellaneous configuration and reference files"

git push --force
