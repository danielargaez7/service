import { Injectable, signal } from '@angular/core';
import { Geolocation, type WatchPositionCallback } from '@capacitor/geolocation';

export interface GeoAnchor {
  lat: number;
  lng: number;
  radiusMeters: number;
  jobType: string;
  anchoredAt: Date;
}

/**
 * Departure radius per job type (in meters).
 * Roll-off jobs get a wider radius since drivers drop and go.
 * Residential routes get wider since the truck is always moving.
 */
const JOB_TYPE_RADIUS: Record<string, number> = {
  RESIDENTIAL_ROUTE: 4800,     // 3 miles — trucks move stop-to-stop
  ROLL_OFF_DELIVERY: 4800,     // 3 miles — drop and drive to next
  ROLL_OFF_PICKUP: 4800,       // 3 miles
  SEPTIC_PUMPING: 3200,        // 2 miles — parked for a while
  GREASE_TRAP: 3200,           // 2 miles
  EMERGENCY_SEPTIC: 3200,      // 2 miles
  YARD_MAINTENANCE: 1600,      // 1 mile — shouldn't leave the yard
  TRAINING_OFFICE: 1600,       // 1 mile
  EMERGENCY_CALL: 3200,        // 2 miles
};

const DEFAULT_RADIUS = 3200; // 2 miles
const CHECK_INTERVAL_MS = 150_000; // 2.5 minutes — battery friendly
const DEPARTURE_DELAY_MS = 180_000; // 3 minutes grace before notifying

/**
 * Monitors whether a driver has left a job site without completing the job.
 *
 * How it works:
 * 1. When the driver clocks in, call `anchor()` with their GPS + job type
 * 2. Service starts a low-frequency position watch (every ~2.5 min)
 * 3. If the driver moves beyond the job-type radius, waits 3 min grace period
 * 4. If still outside after grace period, fires `departed` signal
 * 5. Call `stop()` when the driver clocks out or marks job complete
 */
@Injectable({ providedIn: 'root' })
export class GeofenceDepartureService {
  /** True when driver has left the job site radius */
  readonly departed = signal(false);

  /** True when monitoring is active */
  readonly monitoring = signal(false);

  /** Current anchor point */
  readonly anchor$ = signal<GeoAnchor | null>(null);

  private watchId: string | null = null;
  private departureTimer: ReturnType<typeof setTimeout> | null = null;
  private outsideSince: Date | null = null;

  /**
   * Start monitoring departure from a job site.
   */
  async anchor(lat: number, lng: number, jobType: string): Promise<void> {
    // Clean up any existing watch
    await this.stop();

    const radiusMeters = JOB_TYPE_RADIUS[jobType] ?? DEFAULT_RADIUS;

    const geoAnchor: GeoAnchor = {
      lat,
      lng,
      radiusMeters,
      jobType,
      anchoredAt: new Date(),
    };

    this.anchor$.set(geoAnchor);
    this.departed.set(false);
    this.monitoring.set(true);
    this.outsideSince = null;

    // Start watching position at low frequency
    try {
      this.watchId = await Geolocation.watchPosition(
        { enableHighAccuracy: false, timeout: 30000, maximumAge: 120000 },
        (position, err) => {
          if (err || !position) return;
          this.checkDeparture(
            position.coords.latitude,
            position.coords.longitude,
            geoAnchor
          );
        }
      );
    } catch {
      // Geolocation watch not available (browser dev, permissions denied)
      // Fall back to interval-based checking
      this.startFallbackInterval(geoAnchor);
    }
  }

  /**
   * Stop monitoring. Call when driver clocks out or marks job complete.
   */
  async stop(): Promise<void> {
    if (this.watchId) {
      await Geolocation.clearWatch({ id: this.watchId });
      this.watchId = null;
    }
    if (this.departureTimer) {
      clearTimeout(this.departureTimer);
      this.departureTimer = null;
    }
    this.monitoring.set(false);
    this.departed.set(false);
    this.anchor$.set(null);
    this.outsideSince = null;
  }

  /**
   * Driver acknowledged the notification — reset departed state.
   */
  acknowledge(): void {
    this.departed.set(false);
    this.outsideSince = null;
  }

  /**
   * Get the configured radius for a job type (for display purposes).
   */
  getRadiusForJobType(jobType: string): number {
    return JOB_TYPE_RADIUS[jobType] ?? DEFAULT_RADIUS;
  }

  private checkDeparture(lat: number, lng: number, anchor: GeoAnchor): void {
    const distance = this.haversineMeters(lat, lng, anchor.lat, anchor.lng);

    if (distance > anchor.radiusMeters) {
      // Outside the radius
      if (!this.outsideSince) {
        this.outsideSince = new Date();
      }

      const elapsed = Date.now() - this.outsideSince.getTime();

      if (elapsed >= DEPARTURE_DELAY_MS && !this.departed()) {
        this.departed.set(true);
      }
    } else {
      // Back inside the radius — reset
      this.outsideSince = null;
      if (this.departed()) {
        this.departed.set(false);
      }
    }
  }

  private startFallbackInterval(anchor: GeoAnchor): void {
    // For browser/dev: poll every 2.5 minutes
    const interval = setInterval(async () => {
      if (!this.monitoring()) {
        clearInterval(interval);
        return;
      }
      try {
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: false,
          timeout: 15000,
        });
        this.checkDeparture(pos.coords.latitude, pos.coords.longitude, anchor);
      } catch {
        // Silently skip if GPS unavailable
      }
    }, CHECK_INTERVAL_MS);
  }

  /**
   * Haversine distance in meters between two lat/lng points.
   */
  private haversineMeters(
    lat1: number, lng1: number,
    lat2: number, lng2: number
  ): number {
    const R = 6_371_000; // Earth radius in meters
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
