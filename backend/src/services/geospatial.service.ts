import { db } from '../config/firebase';
import * as geofire from 'geofire-common';

interface Location {
  latitude: number;
  longitude: number;
}

interface DeliveryPartner {
  uid: string;
  name: string;
  phone: string;
  status: 'available' | 'busy' | 'offline';
  isOnline: boolean;
  currentLocation: {
    latitude: number;
    longitude: number;
    geohash: string;
    accuracy: number;
    updatedAt: FirebaseFirestore.Timestamp;
  };
  maxConcurrentOrders: number;
  currentOrderCount: number;
  shopId: string;
  maxDeliveryRadius: number;
  fcmToken?: string;
}

interface PartnerFilters {
  status?: 'available' | 'busy' | 'offline';
  shopId?: string;
  maxResults?: number;
  excludePartnerIds?: string[];
  requireAvailableCapacity?: boolean;
}

export class GeospatialService {
  private readonly EARTH_RADIUS_KM = 6371;

  /**
   * Calculate distance between two points using Haversine formula
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = this.EARTH_RADIUS_KM * c;

    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Generate geohash for a location
   */
  generateGeohash(latitude: number, longitude: number): string {
    return geofire.geohashForLocation([latitude, longitude]);
  }

  /**
   * Find delivery partners within radius using geohash queries
   */
  async findNearbyPartners(
    centerLocation: Location,
    radiusKm: number,
    filters: PartnerFilters = {}
  ): Promise<Array<DeliveryPartner & { distance: number }>> {
    const center = [centerLocation.latitude, centerLocation.longitude];
    const radiusInM = radiusKm * 1000;

    // Generate geohash query bounds
    const bounds = geofire.geohashQueryBounds(center, radiusInM);
    const promises: Promise<FirebaseFirestore.QuerySnapshot>[] = [];

    // Query for each geohash range
    for (const b of bounds) {
      let query = db
        .collection('delivery_partners')
        .orderBy('currentLocation.geohash')
        .startAt(b[0])
        .endAt(b[1]);

      // Apply filters
      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      if (filters.shopId) {
        query = query.where('shopId', '==', filters.shopId);
      }

      promises.push(query.get());
    }

    // Await all queries
    const snapshots = await Promise.all(promises);

    const partners: Array<DeliveryPartner & { distance: number }> = [];
    const seenIds = new Set<string>();

    // Process results
    for (const snap of snapshots) {
      for (const doc of snap.docs) {
        // Avoid duplicates (geohash ranges can overlap)
        if (seenIds.has(doc.id)) continue;
        seenIds.add(doc.id);

        const partner = doc.data() as DeliveryPartner;

        // Skip if in exclude list
        if (filters.excludePartnerIds?.includes(partner.uid)) {
          continue;
        }

        // Skip if not online
        if (!partner.isOnline) {
          continue;
        }

        // Skip if at max capacity
        if (filters.requireAvailableCapacity !== false) {
          if (partner.currentOrderCount >= partner.maxConcurrentOrders) {
            continue;
          }
        }

        // Check if partner's location is stale (> 5 minutes)
        const locationAge =
          Date.now() - partner.currentLocation.updatedAt.toMillis();
        if (locationAge > 5 * 60 * 1000) {
          // Location is stale, skip this partner
          continue;
        }

        // Calculate actual distance
        const distance = this.calculateDistance(
          centerLocation.latitude,
          centerLocation.longitude,
          partner.currentLocation.latitude,
          partner.currentLocation.longitude
        );

        // Filter by actual distance (geohash is approximate)
        if (distance <= radiusKm) {
          // Check partner's max delivery radius
          if (distance <= partner.maxDeliveryRadius) {
            partners.push({ ...partner, distance });
          }
        }
      }
    }

    // Sort by distance (nearest first)
    partners.sort((a, b) => a.distance - b.distance);

    // Limit results
    if (filters.maxResults && partners.length > filters.maxResults) {
      return partners.slice(0, filters.maxResults);
    }

    return partners;
  }

  /**
   * Get partners sorted by proximity to a location
   */
  async getSortedPartnersByProximity(
    shopLocation: Location,
    filters: PartnerFilters = {}
  ): Promise<Array<DeliveryPartner & { distance: number }>> {
    // Start with a reasonable radius (10 km)
    let radius = 10;
    let partners = await this.findNearbyPartners(shopLocation, radius, filters);

    // If no partners found, expand search radius up to 50 km
    while (partners.length === 0 && radius < 50) {
      radius += 10;
      partners = await this.findNearbyPartners(shopLocation, radius, filters);
    }

    return partners;
  }

  /**
   * Update partner's current location
   */
  async updatePartnerLocation(
    partnerId: string,
    location: Location,
    accuracy: number
  ): Promise<void> {
    const geohash = this.generateGeohash(location.latitude, location.longitude);

    await db
      .collection('delivery_partners')
      .doc(partnerId)
      .update({
        currentLocation: {
          latitude: location.latitude,
          longitude: location.longitude,
          geohash,
          accuracy,
          updatedAt: new Date(),
        },
        lastSeen: new Date(),
      });
  }

  /**
   * Check if partner is within delivery radius of a location
   */
  async isPartnerInRange(
    partnerId: string,
    targetLocation: Location
  ): Promise<{ inRange: boolean; distance: number }> {
    const partnerDoc = await db
      .collection('delivery_partners')
      .doc(partnerId)
      .get();

    if (!partnerDoc.exists) {
      throw new Error('Partner not found');
    }

    const partner = partnerDoc.data() as DeliveryPartner;

    const distance = this.calculateDistance(
      partner.currentLocation.latitude,
      partner.currentLocation.longitude,
      targetLocation.latitude,
      targetLocation.longitude
    );

    return {
      inRange: distance <= partner.maxDeliveryRadius,
      distance,
    };
  }

  /**
   * Get estimated travel time (simple calculation)
   * Assumes average speed of 20 km/h for bike/scooter
   */
  getEstimatedTravelTime(distanceKm: number): number {
    const averageSpeedKmh = 20;
    const timeInHours = distanceKm / averageSpeedKmh;
    const timeInMinutes = Math.ceil(timeInHours * 60);
    return timeInMinutes;
  }

  /**
   * Batch update multiple partners' locations
   */
  async batchUpdateLocations(
    updates: Array<{ partnerId: string; location: Location; accuracy: number }>
  ): Promise<void> {
    const batch = db.batch();

    for (const update of updates) {
      const geohash = this.generateGeohash(
        update.location.latitude,
        update.location.longitude
      );

      const partnerRef = db.collection('delivery_partners').doc(update.partnerId);

      batch.update(partnerRef, {
        currentLocation: {
          latitude: update.location.latitude,
          longitude: update.location.longitude,
          geohash,
          accuracy: update.accuracy,
          updatedAt: new Date(),
        },
        lastSeen: new Date(),
      });
    }

    await batch.commit();
  }
}

export const geospatialService = new GeospatialService();
