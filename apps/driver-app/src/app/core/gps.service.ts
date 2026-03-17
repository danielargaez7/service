import { Injectable } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';

export interface GpsPosition {
  lat: number;
  lng: number;
  accuracy: number;
}

@Injectable({ providedIn: 'root' })
export class GpsService {
  async getCurrentPosition(): Promise<GpsPosition> {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });

      return {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };
    } catch (err: unknown) {
      // Fallback to browser geolocation API
      return this.browserFallback();
    }
  }

  private browserFallback(): Promise<GpsPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(
          new Error(
            'Location services are not available. Please enable GPS and try again.'
          )
        );
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              reject(
                new Error(
                  'Location permission denied. Please enable location access in your device settings.'
                )
              );
              break;
            case error.POSITION_UNAVAILABLE:
              reject(
                new Error(
                  'Unable to determine your location. Please check your GPS signal.'
                )
              );
              break;
            case error.TIMEOUT:
              reject(
                new Error(
                  'Location request timed out. Please try again.'
                )
              );
              break;
            default:
              reject(new Error('Unable to get your location.'));
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }
}
