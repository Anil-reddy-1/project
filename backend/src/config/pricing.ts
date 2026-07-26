import { env } from './env';

/**
 * Pricing Configuration
 * Dynamic delivery pricing based on demand, time, and distance
 */

export interface PricingConfig {
  baseRate: number; // Per km
  maxSurgeMultiplier: number;
  distanceTiers: DistanceTier[];
  peakHours: TimeRange[];
  surgeEnabled: boolean;
}

export interface DistanceTier {
  minKm: number;
  maxKm: number;
  ratePerKm: number;
  label: string;
}

export interface TimeRange {
  startHour: number;
  endHour: number;
  surgeMultiplier: number;
  label: string;
}

export const pricingConfig: PricingConfig = {
  baseRate: env.BASE_DELIVERY_RATE,
  maxSurgeMultiplier: env.MAX_SURGE_MULTIPLIER,
  surgeEnabled: env.SURGE_PRICING_ENABLED,
  
  // Distance-based pricing tiers
  distanceTiers: [
    {
      minKm: 0,
      maxKm: 5,
      ratePerKm: 15, // ₹15/km for short distances
      label: '0-5 km',
    },
    {
      minKm: 5,
      maxKm: 10,
      ratePerKm: 13, // ₹13/km for medium distances
      label: '5-10 km',
    },
    {
      minKm: 10,
      maxKm: Infinity,
      ratePerKm: 12, // ₹12/km for long distances
      label: '10+ km',
    },
  ],

  // Peak hours with surge pricing
  peakHours: [
    {
      startHour: 8,
      endHour: 10,
      surgeMultiplier: 1.5,
      label: 'Morning Rush (8-10 AM)',
    },
    {
      startHour: 12,
      endHour: 14,
      surgeMultiplier: 1.3,
      label: 'Lunch Hour (12-2 PM)',
    },
    {
      startHour: 18,
      endHour: 20,
      surgeMultiplier: 1.5,
      label: 'Evening Rush (6-8 PM)',
    },
  ],
};

/**
 * Get distance tier for a given distance
 */
export function getDistanceTier(distanceKm: number): DistanceTier {
  return pricingConfig.distanceTiers.find(
    tier => distanceKm >= tier.minKm && distanceKm < tier.maxKm
  ) || pricingConfig.distanceTiers[pricingConfig.distanceTiers.length - 1];
}

/**
 * Get current peak hour surge (if any)
 */
export function getCurrentPeakHourSurge(): TimeRange | null {
  const now = new Date();
  const currentHour = now.getHours();

  return pricingConfig.peakHours.find(
    peak => currentHour >= peak.startHour && currentHour < peak.endHour
  ) || null;
}

/**
 * Calculate base rate for distance
 */
export function calculateBaseRate(distanceKm: number): number {
  const tier = getDistanceTier(distanceKm);
  return tier.ratePerKm * distanceKm;
}
