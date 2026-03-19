const METERS_PER_MILE = 1_609.344;
const EARTH_RADIUS_M = 6_371_000;

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Determine whether a driver qualifies for the FMCSA short-haul exemption.
 *
 * Requirements:
 *  - The driver operates within a given air-mile radius of their home base
 *    (default 150 air-miles per FMCSA).
 *  - The driver returns to the reporting location within 14 hours of the
 *    shift start.
 */
export function isShortHaulExempt(
  homeBaseLat: number,
  homeBaseLng: number,
  maxDistanceMiles: number,
  farthestPointLat: number,
  farthestPointLng: number,
  shiftStartTime: Date,
  currentTime: Date
): boolean {
  const distanceMeters = haversineDistance(
    homeBaseLat,
    homeBaseLng,
    farthestPointLat,
    farthestPointLng
  );
  const distanceMiles = distanceMeters / METERS_PER_MILE;

  if (distanceMiles > maxDistanceMiles) {
    return false;
  }

  const elapsedHours =
    (currentTime.getTime() - shiftStartTime.getTime()) / (1000 * 60 * 60);
  const MAX_SHIFT_HOURS = 14;

  if (elapsedHours > MAX_SHIFT_HOURS) {
    return false;
  }

  return true;
}
