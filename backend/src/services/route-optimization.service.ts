import { getGoogleMapsClient, getGoogleMapsApiKey, isGoogleMapsConfigured } from '../config/google-maps';
import { TravelMode } from '@googlemaps/google-maps-services-js';

interface Location {
  lat: number;
  lng: number;
  address?: string;
  label?: string;
}

interface RouteStop {
  location: Location;
  orderId?: string;
  sequence: number;
  estimatedArrival?: Date;
  distanceFromPrevious: number; // meters
  durationFromPrevious: number; // seconds
}

interface OptimizedRoute {
  stops: RouteStop[];
  totalDistance: number; // meters
  totalDuration: number; // seconds
  polyline?: string;
  optimizationMethod: 'nearest_neighbor' | '2-opt' | 'google_waypoint_optimization' | 'fallback';
}

/**
 * Route Optimization Service
 * Optimizes delivery routes for multiple stops using various algorithms
 */
class RouteOptimizationService {
  private cache: Map<string, { data: OptimizedRoute; timestamp: number }> = new Map();
  private readonly CACHE_TTL_MS: number;

  constructor() {
    const cacheTtlSeconds = parseInt(process.env.ROUTE_CACHE_TTL_SECONDS || '300', 10);
    this.CACHE_TTL_MS = cacheTtlSeconds * 1000;
  }

  /**
   * Optimize route for multiple delivery stops
   */
  async optimizeRoute(
    origin: Location,
    destinations: Location[],
    orderIds?: string[]
  ): Promise<OptimizedRoute> {
    // Check cache
    const cacheKey = this.getCacheKey(origin, destinations);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log('[Route Optimization] Returning cached route');
      return cached;
    }

    let optimizedRoute: OptimizedRoute;

    if (destinations.length === 0) {
      return {
        stops: [],
        totalDistance: 0,
        totalDuration: 0,
        optimizationMethod: 'fallback',
      };
    }

    if (destinations.length === 1) {
      // Single destination - no optimization needed
      optimizedRoute = await this.getSingleDestinationRoute(origin, destinations[0], orderIds?.[0]);
    } else if (destinations.length <= 3) {
      // 2-3 destinations - use nearest neighbor (fast)
      optimizedRoute = await this.nearestNeighborOptimization(origin, destinations, orderIds);
    } else if (destinations.length <= 10 && isGoogleMapsConfigured()) {
      // 4-10 destinations - use Google Maps waypoint optimization
      optimizedRoute = await this.googleWaypointOptimization(origin, destinations, orderIds);
    } else {
      // >10 destinations or no Google Maps - use 2-opt algorithm
      optimizedRoute = await this.twoOptOptimization(origin, destinations, orderIds);
    }

    // Cache the result
    this.setCache(cacheKey, optimizedRoute);

    return optimizedRoute;
  }

  /**
   * Get route for single destination
   */
  private async getSingleDestinationRoute(
    origin: Location,
    destination: Location,
    orderId?: string
  ): Promise<OptimizedRoute> {
    const distance = this.calculateDistance(origin, destination);
    const duration = this.estimateDuration(distance);

    return {
      stops: [
        {
          location: destination,
          orderId,
          sequence: 0,
          distanceFromPrevious: distance,
          durationFromPrevious: duration,
        },
      ],
      totalDistance: distance,
      totalDuration: duration,
      optimizationMethod: 'fallback',
    };
  }

  /**
   * Nearest Neighbor Algorithm - good for 2-3 stops
   * Simple greedy algorithm: always visit the nearest unvisited location
   */
  private async nearestNeighborOptimization(
    origin: Location,
    destinations: Location[],
    orderIds?: string[]
  ): Promise<OptimizedRoute> {
    const unvisited = [...destinations];
    const route: RouteStop[] = [];
    let currentLocation = origin;
    let totalDistance = 0;
    let totalDuration = 0;

    while (unvisited.length > 0) {
      // Find nearest unvisited location
      let nearestIndex = 0;
      let nearestDistance = this.calculateDistance(currentLocation, unvisited[0]);

      for (let i = 1; i < unvisited.length; i++) {
        const distance = this.calculateDistance(currentLocation, unvisited[i]);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = i;
        }
      }

      const nextLocation = unvisited[nearestIndex];
      const distance = nearestDistance;
      const duration = this.estimateDuration(distance);

      const originalIndex = destinations.indexOf(nextLocation);

      route.push({
        location: nextLocation,
        orderId: orderIds?.[originalIndex],
        sequence: route.length,
        distanceFromPrevious: distance,
        durationFromPrevious: duration,
      });

      totalDistance += distance;
      totalDuration += duration;
      currentLocation = nextLocation;
      unvisited.splice(nearestIndex, 1);
    }

    return {
      stops: route,
      totalDistance,
      totalDuration,
      optimizationMethod: 'nearest_neighbor',
    };
  }

  /**
   * 2-opt Algorithm - good for 4-10 stops
   * Iteratively improves the route by reversing segments
   */
  private async twoOptOptimization(
    origin: Location,
    destinations: Location[],
    orderIds?: string[]
  ): Promise<OptimizedRoute> {
    // Start with nearest neighbor
    let currentRoute = await this.nearestNeighborOptimization(origin, destinations, orderIds);
    let improved = true;
    let iterations = 0;
    const maxIterations = 100;

    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;

      // Try all possible 2-opt swaps
      for (let i = 0; i < currentRoute.stops.length - 1; i++) {
        for (let j = i + 2; j < currentRoute.stops.length; j++) {
          // Reverse segment between i and j
          const newRoute = this.reverse2OptSegment(currentRoute, i, j, origin);

          if (newRoute.totalDistance < currentRoute.totalDistance) {
            currentRoute = newRoute;
            improved = true;
          }
        }
      }
    }

    return {
      ...currentRoute,
      optimizationMethod: '2-opt',
    };
  }

  /**
   * Google Maps Waypoint Optimization - best accuracy for 4-10 stops
   * Uses Google's own optimization algorithm
   */
  private async googleWaypointOptimization(
    origin: Location,
    destinations: Location[],
    orderIds?: string[]
  ): Promise<OptimizedRoute> {
    try {
      const client = getGoogleMapsClient();
      const apiKey = getGoogleMapsApiKey();

      const waypoints = destinations.map(d => `${d.lat},${d.lng}`);

      const response = await client.directions({
        params: {
          origin: `${origin.lat},${origin.lng}`,
          destination: `${destinations[destinations.length - 1].lat},${destinations[destinations.length - 1].lng}`,
          waypoints,
          optimize: true, // Let Google optimize waypoint order
          mode: TravelMode.driving,
          key: apiKey,
        },
      });

      if (response.data.status !== 'OK' || !response.data.routes[0]) {
        console.warn('[Route Optimization] Google API failed, falling back to 2-opt');
        return this.twoOptOptimization(origin, destinations, orderIds);
      }

      const route = response.data.routes[0];
      const optimizedOrder = route.waypoint_order || destinations.map((_, i) => i);
      
      const stops: RouteStop[] = [];
      let totalDistance = 0;
      let totalDuration = 0;

      route.legs.forEach((leg, index) => {
        const distance = leg.distance?.value || 0;
        const duration = leg.duration?.value || 0;
        const destIndex = index < optimizedOrder.length ? optimizedOrder[index] : destinations.length - 1;

        stops.push({
          location: destinations[destIndex],
          orderId: orderIds?.[destIndex],
          sequence: index,
          distanceFromPrevious: distance,
          durationFromPrevious: duration,
        });

        totalDistance += distance;
        totalDuration += duration;
      });

      return {
        stops,
        totalDistance,
        totalDuration,
        polyline: route.overview_polyline?.points,
        optimizationMethod: 'google_waypoint_optimization',
      };
    } catch (error) {
      console.error('[Route Optimization] Google Maps API error:', error);
      console.log('[Route Optimization] Falling back to 2-opt algorithm');
      return this.twoOptOptimization(origin, destinations, orderIds);
    }
  }

  /**
   * Reverse a segment in 2-opt algorithm
   */
  private reverse2OptSegment(
    route: OptimizedRoute,
    i: number,
    j: number,
    origin: Location
  ): OptimizedRoute {
    const newStops = [...route.stops];
    
    // Reverse segment between i and j
    const segment = newStops.slice(i, j + 1).reverse();
    newStops.splice(i, j - i + 1, ...segment);

    // Recalculate distances
    let totalDistance = 0;
    let totalDuration = 0;
    let prevLocation = origin;

    newStops.forEach((stop, index) => {
      const distance = this.calculateDistance(prevLocation, stop.location);
      const duration = this.estimateDuration(distance);

      newStops[index] = {
        ...stop,
        sequence: index,
        distanceFromPrevious: distance,
        durationFromPrevious: duration,
      };

      totalDistance += distance;
      totalDuration += duration;
      prevLocation = stop.location;
    });

    return {
      stops: newStops,
      totalDistance,
      totalDuration,
      optimizationMethod: '2-opt',
    };
  }

  /**
   * Calculate distance between two points using Haversine formula
   * Returns distance in meters
   */
  private calculateDistance(point1: Location, point2: Location): number {
    const R = 6371000; // Earth's radius in meters
    const lat1 = point1.lat * Math.PI / 180;
    const lat2 = point2.lat * Math.PI / 180;
    const deltaLat = (point2.lat - point1.lat) * Math.PI / 180;
    const deltaLng = (point2.lng - point1.lng) * Math.PI / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Estimate duration based on distance
   * Assumes average speed of 20 km/h (urban driving with stops)
   */
  private estimateDuration(distanceMeters: number): number {
    const avgSpeedKmh = 20;
    const avgSpeedMs = avgSpeedKmh * 1000 / 3600; // meters per second
    return Math.round(distanceMeters / avgSpeedMs);
  }

  /**
   * Generate cache key from origin and destinations
   */
  private getCacheKey(origin: Location, destinations: Location[]): string {
    const key = `${origin.lat},${origin.lng}|${destinations.map(d => `${d.lat},${d.lng}`).join('|')}`;
    return key;
  }

  /**
   * Get route from cache
   */
  private getFromCache(key: string): OptimizedRoute | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.CACHE_TTL_MS) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Set route in cache
   */
  private setCache(key: string, data: OptimizedRoute): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    // Cleanup old cache entries (every 100 sets)
    if (this.cache.size > 1000) {
      const now = Date.now();
      for (const [k, v] of this.cache.entries()) {
        if (now - v.timestamp > this.CACHE_TTL_MS) {
          this.cache.delete(k);
        }
      }
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const routeOptimizationService = new RouteOptimizationService();
