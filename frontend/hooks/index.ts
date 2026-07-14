/**
 * Custom React hooks directory.
 *
 * Phase 3 hooks:
 * - useCheckout — Checkout state and order placement logic
 * - useOrders — Fetch and manage order list with filters
 * - useOrderDetails — Fetch single order details
 * - useAddresses — Manage delivery addresses
 * - usePayment — Payment status checking and retry logic
 *
 * Future hooks:
 * - useOrderStatus — real-time Firestore listener for order state
 * - useLiveLocation — Firestore onSnapshot listener for delivery partner GPS
 *   (live_locations/{partnerUid} — NOT RTDB; see lib/firebase/client.ts)
 * - useFirestoreDoc — generic Firestore document listener
 * - useFirestoreCollection — generic Firestore collection listener
 */

export { useCheckout } from './useCheckout';
export { useOrders } from './useOrders';
export { useOrderDetails } from './useOrderDetails';
export { useAddresses } from './useAddresses';
export { usePayment } from './usePayment';
