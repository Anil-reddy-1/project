// Export all services and types
export * from './api.service';
export { dashboardService } from './dashboard.service';
export type { DashboardStats } from './dashboard.service';
export { userService } from './user.service';
export type { User, CreateUserPayload, UpdateUserPayload } from './user.service';
export { roleService } from './role.service';
export type { Role, Permission, CreateRolePayload, UpdateRolePayload } from './role.service';
export { staffService } from './staff.service';
export type { Staff, CreateStaffPayload, UpdateStaffPayload } from './staff.service';
export { stockService } from './stock.service';
export type { StockItem, StockAdjustPayload } from './stock.service';
export { pricingService } from './pricing.service';
export type { PriceData, UpdatePricePayload } from './pricing.service';
export { orderService } from './order.service';
export type { Order, CreateOrderPayload, UpdateOrderStatusPayload } from './order.service';
export { deliveryService } from './delivery.service';
export type { Delivery, AssignDeliveryPayload } from './delivery.service';
export { debtService } from './debt.service';
export type { Debt, RecordPaymentPayload } from './debt.service';
export { reportService, scheduledReportService } from './report.service';
export type { Report, GenerateReportPayload } from './report.service';
export { productService } from './product.service';
export { wishlistService } from './wishlist.service';
export { uploadService } from './upload.service';
export { supervisorService } from './supervisor.service';
export { analyticsService } from './analytics.service';
export type { 
  SalesAnalytics, 
  StockAnalytics, 
  DeliveryAnalytics, 
  StaffAnalytics, 
  DebtAnalytics,
  DailyOperationsAnalytics,
  FinancialSummaryAnalytics 
} from './analytics.service';
