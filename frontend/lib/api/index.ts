/**
 * API Clients - Centralized exports
 * Phase 3: Order Placement & Checkout
 */

// Base client
export { apiClient, ApiError } from './client';

// Orders API
export {
  createOrder,
  getOrders,
  getOrderById,
  cancelOrder,
  approveOrder,
  rejectOrder,
  markOrderPacked,
  markOrderReadyForPickup,
} from './orders';

export type {
  CreateOrderRequest,
  CreateOrderResponse,
  OrderFilters,
  Order,
  OrderListResponse,
  OrderDetailsResponse,
  CancelOrderRequest,
  CancelOrderResponse,
  OrderRejectionReason,
  OrderActionResponse,
} from './orders';

// Payments API
export {
  retryPayment,
  getPaymentStatus,
  verifyPaymentCallback,
} from './payments';

export type {
  Payment,
  RetryPaymentResponse,
  PaymentStatusResponse,
  PaymentCallbackResponse,
} from './payments';

// Addresses API
export {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from './addresses';

export type {
  Address,
  CreateAddressRequest,
  UpdateAddressRequest,
  AddressListResponse,
  AddressResponse,
  DeleteAddressResponse,
} from './addresses';
