import { haversineDistance } from './haversine';
import { isWithinGeofence } from './geofence.service';
import type { JobSite } from './geofence.service';

describe('haversineDistance', () => {
  it('should return 0 for identical coordinates', () => {
    expect(haversineDistance(39.7392, -104.9903, 39.7392, -104.9903)).toBe(0);
  });

  it('should calculate the known distance between Denver and Boulder (~40 km)', () => {
    // Denver: 39.7392 N, 104.9903 W
    // Boulder: 40.015 N, 105.2705 W
    const distance = haversineDistance(39.7392, -104.9903, 40.015, -105.2705);

    // Accepted range: 38–42 km
    expect(distance).toBeGreaterThan(38_000);
    expect(distance).toBeLessThan(42_000);
  });

  it('should be symmetric (A->B equals B->A)', () => {
    const ab = haversineDistance(39.7392, -104.9903, 40.015, -105.2705);
    const ba = haversineDistance(40.015, -105.2705, 39.7392, -104.9903);
    expect(ab).toBeCloseTo(ba, 6);
  });
});

describe('isWithinGeofence', () => {
  const site: JobSite = {
    id: 'site-1',
    name: 'Denver Office',
    lat: 39.7392,
    lng: -104.9903,
    radiusMeters: 500,
  };

  it('should return isInside=true when driver is within the geofence radius', () => {
    // Driver at the exact site location
    const result = isWithinGeofence(39.7392, -104.9903, site);
    expect(result.isInside).toBe(true);
    expect(result.distanceMeters).toBe(0);
  });

  it('should return isInside=true for a driver just inside the radius', () => {
    // Shift latitude slightly (~100 m north)
    const result = isWithinGeofence(39.7401, -104.9903, site);
    expect(result.isInside).toBe(true);
    expect(result.distanceMeters).toBeLessThan(500);
  });

  it('should return isInside=false when driver is outside the geofence radius', () => {
    // Boulder is ~40 km away — well outside a 500 m radius
    const result = isWithinGeofence(40.015, -105.2705, site);
    expect(result.isInside).toBe(false);
    expect(result.distanceMeters).toBeGreaterThan(500);
  });
});
