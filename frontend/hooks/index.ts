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
 * Phase 5C hooks (WebSocket real-time):
 * - useWebSocket — WebSocket connection and event management
 * - useRealtimeLocation — Real-time partner location tracking
 * - useRealtimeOrder — Real-time order status updates
 * - useRealtimePartner — Real-time partner assignments and status
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
export { useOrderActions } from './useOrderActions';
export { useAddresses } from './useAddresses';
export { usePayment } from './usePayment';
export { useCart } from './useCart';

// Phase 5C WebSocket hooks
export { useWebSocket } from '../lib/hooks/useWebSocket';
export { useRealtimeLocation } from '../lib/hooks/useRealtimeLocation';
export { useRealtimeOrder } from '../lib/hooks/useRealtimeOrder';
export { useRealtimePartner } from '../lib/hooks/useRealtimePartner';
export { useFCM } from '../lib/hooks/useFCM';
