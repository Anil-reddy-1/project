import { adminDb } from '../config/firebase';
import { pricingConfig, getDistanceTier, getCurrentPeakHourSurge, calculateBaseRate } from '../config/pricing';

interface PricingFactors {
  distanceKm: number;
  orderTime?: Date;
  currentDemand?: number; // Number of pending orders
  weather?: 'clear' | 'rain' | 'storm';
}

interface PricingBreakdown {
  baseRate: number;
  distanceTier: string;
  surgeMultiplier: number;
  factors: {
    timeSurge: number;
    demandSurge: number;
    weatherSurge: number;
  };
  totalEarnings: number;
  bonuses: number;
}

/**
 * Dynamic Pricing Service
 * Calculates delivery partner earnings based on multiple factors
 */
class DynamicPricingService {
  /**
   * Calculate delivery earnings with surge pricing
   */
  async calculateEarnings(factors: PricingFactors): Promise<PricingBreakdown> {
    const { distanceKm, orderTime = new Date(), currentDemand, weather } = factors;

    // Get base rate based on distance tier
    const tier = getDistanceTier(distanceKm);
    const baseRate = calculateBaseRate(distanceKm);

    // Calculate surge multipliers
    const timeSurge = this.calculateTimeSurge(orderTime);
    const demandSurge = await this.calculateDemandSurge(currentDemand);
    const weatherSurge = this.calculateWeatherSurge(weather);

    // Take the maximum surge (not additive)
    const surgeMultiplier = Math.min(
      Math.max(timeSurge, demandSurge, weatherSurge),
      pricingConfig.maxSurgeMultiplier
    );

    // Calculate final earnings
    const totalEarnings = Math.round(baseRate * surgeMultiplier);
    const bonuses = 0; // Future: add bonuses for performance

    return {
      baseRate: Math.round(baseRate),
      distanceTier: tier.label,
      surgeMultiplier,
      factors: {
        timeSurge,
        demandSurge,
        weatherSurge,
      },
      totalEarnings,
      bonuses,
    };
  }

  /**
   * Calculate time-based surge (peak hours)
   */
  private calculateTimeSurge(orderTime: Date): number {
    if (!pricingConfig.surgeEnabled) return 1.0;

    const peakHour = getCurrentPeakHourSurge();
    return peakHour ? peakHour.surgeMultiplier : 1.0;
  }

  /**
   * Calculate demand-based surge
   * High demand = more pending orders
   */
  private async calculateDemandSurge(currentDemand?: number): Promise<number> {
    if (!pricingConfig.surgeEnabled) return 1.0;

    try {
      // If demand not provided, fetch from Firestore
      let pendingOrders = currentDemand;
      
      if (pendingOrders === undefined) {
        const db = adminDb();
        const snapshot = await db
          .collection('orders')
          .where('status', 'in', ['READY_FOR_PICKUP', 'ASSIGNED'])
          .limit(50) // Cap at 50 for performance
          .get();
        
        pendingOrders = snapshot.size;
      }

      // Surge thresholds
      if (pendingOrders >= 20) return 2.0; // Very high demand
      if (pendingOrders >= 15) return 1.8;
      if (pendingOrders >= 10) return 1.5;
      if (pendingOrders >= 5) return 1.3;
      
      return 1.0; // Normal demand
    } catch (error) {
      console.error('[Dynamic Pricing] Error calculating demand surge:', error);
      return 1.0;
    }
  }

  /**
   * Calculate weather-based surge
   * Future: Integrate with weather API
   */
  private calculateWeatherSurge(weather?: 'clear' | 'rain' | 'storm'): number {
    if (!pricingConfig.surgeEnabled) return 1.0;
    if (!weather) return 1.0;

    switch (weather) {
      case 'storm':
        return 1.8;
      case 'rain':
        return 1.3;
      default:
        return 1.0;
    }
  }

  /**
   * Log pricing decision for analytics
   */
  async logPricingDecision(
    assignmentId: string,
    orderId: string,
    breakdown: PricingBreakdown
  ): Promise<void> {
    try {
      const db = adminDb();
      await db.collection('pricing_logs').add({
        assignmentId,
        orderId,
        timestamp: new Date(),
        ...breakdown,
      });
    } catch (error) {
      console.error('[Dynamic Pricing] Error logging pricing decision:', error);
      // Don't throw - logging failure shouldn't block assignment
    }
  }

  /**
   * Get current surge status (for display to partners)
   */
  async getCurrentSurgeStatus(): Promise<{
    isActive: boolean;
    multiplier: number;
    reason: string;
  }> {
    const timeSurge = this.calculateTimeSurge(new Date());
    const demandSurge = await this.calculateDemandSurge();
    const weatherSurge = this.calculateWeatherSurge();

    const maxSurge = Math.max(timeSurge, demandSurge, weatherSurge);
    const isActive = maxSurge > 1.0;

    let reason = 'Normal pricing';
    if (timeSurge === maxSurge && timeSurge > 1.0) {
      const peak = getCurrentPeakHourSurge();
      reason = peak?.label || 'Peak hours';
    } else if (demandSurge === maxSurge && demandSurge > 1.0) {
      reason = 'High demand';
    } else if (weatherSurge === maxSurge && weatherSurge > 1.0) {
      reason = 'Weather conditions';
    }

    return {
      isActive,
      multiplier: maxSurge,
      reason,
    };
  }

  /**
   * Calculate earnings for batch delivery
   */
  async calculateBatchEarnings(
    distancesKm: number[],
    orderTime?: Date
  ): Promise<PricingBreakdown> {
    const totalDistance = distancesKm.reduce((sum, d) => sum + d, 0);
    
    // Batch discount: 10% off for each additional delivery beyond the first
    const batchDiscount = distancesKm.length > 1 ? 0.9 : 1.0;
    
    const breakdown = await this.calculateEarnings({
      distanceKm: totalDistance,
      orderTime,
    });

    return {
      ...breakdown,
      baseRate: Math.round(breakdown.baseRate * batchDiscount),
      totalEarnings: Math.round(breakdown.totalEarnings * batchDiscount),
      bonuses: breakdown.bonuses + (distancesKm.length - 1) * 10, // ₹10 bonus per extra delivery
    };
  }
}

export const dynamicPricingService = new DynamicPricingService();
