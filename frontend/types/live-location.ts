/**
 * TypeScript type definitions for Live Location entity.
 * Derived from: schema.md §8 — Firestore `live_locations/{partnerUid}`
 *
 * High-frequency writes (every few seconds while online).
 * Active only while an order involving this partner is in
 * ASSIGNED / PICKED_UP / ON_THE_WAY state.
 *
 * Firestore is used (instead of RTDB) for consistency — all data lives in
 * one place and Firestore onSnapshot handles real-time delivery partner
 * location updates on the client.
 */

/** Live location shape — Firestore `live_locations/{partnerUid}` */
export interface LiveLocation {
  lat: number;
  lng: number;
  geohash: string;
  /** Firestore Timestamp or millisecond epoch for location freshness checks */
  updatedAt: number;
}
