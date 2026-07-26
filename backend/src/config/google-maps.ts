import { Client } from '@googlemaps/google-maps-services-js';
import { env } from './env';

let client: Client | null = null;

/**
 * Get Google Maps API client instance
 */
export function getGoogleMapsClient(): Client {
  if (!client) {
    client = new Client({});
  }
  return client;
}

/**
 * Check if Google Maps API is configured
 */
export function isGoogleMapsConfigured(): boolean {
  return !!env.GOOGLE_MAPS_API_KEY && env.GOOGLE_MAPS_API_KEY.length > 0;
}

/**
 * Get API key
 */
export function getGoogleMapsApiKey(): string {
  if (!env.GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key not configured');
  }
  return env.GOOGLE_MAPS_API_KEY;
}
