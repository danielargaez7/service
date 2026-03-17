import { haversineDistance } from './haversine';

export interface JobSite {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
}

export interface GeofenceResult {
  isInside: boolean;
  distanceMeters: number;
}

export interface NearestSiteResult {
  site: JobSite | null;
  distanceMeters: number;
}

/**
 * Determine whether a driver's current position falls within a job site's
 * circular geofence.
 */
export function isWithinGeofence(
  driverLat: number,
  driverLng: number,
  site: JobSite
): GeofenceResult {
  const distanceMeters = haversineDistance(driverLat, driverLng, site.lat, site.lng);

  return {
    isInside: distanceMeters <= site.radiusMeters,
    distanceMeters,
  };
}

/**
 * Find the nearest job site to the driver's current position.
 * Returns `null` for `site` when the sites array is empty.
 */
export function findNearestSite(
  driverLat: number,
  driverLng: number,
  sites: JobSite[]
): NearestSiteResult {
  if (sites.length === 0) {
    return { site: null, distanceMeters: Infinity };
  }

  let nearestSite: JobSite = sites[0];
  let nearestDistance = haversineDistance(driverLat, driverLng, sites[0].lat, sites[0].lng);

  for (let i = 1; i < sites.length; i++) {
    const distance = haversineDistance(driverLat, driverLng, sites[i].lat, sites[i].lng);
    if (distance < nearestDistance) {
      nearestSite = sites[i];
      nearestDistance = distance;
    }
  }

  return { site: nearestSite, distanceMeters: nearestDistance };
}
