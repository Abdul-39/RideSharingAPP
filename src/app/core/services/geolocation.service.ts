import { Injectable, signal } from '@angular/core';
import { Observable, Subscriber } from 'rxjs';

export interface BrowserPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class GeolocationService {
  readonly lastPosition = signal<BrowserPosition | null>(null);
  readonly error = signal<string>('');
  readonly permissionDenied = signal(false);

  isSupported(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.geolocation;
  }

  getCurrentPosition(options?: PositionOptions): Observable<BrowserPosition> {
    return new Observable((sub: Subscriber<BrowserPosition>) => {
      if (!this.isSupported()) {
        this.error.set('Geolocation is not supported by this browser.');
        sub.error(new Error('unsupported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        pos => {
          const p: BrowserPosition = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp
          };
          this.lastPosition.set(p);
          this.error.set('');
          this.permissionDenied.set(false);
          sub.next(p);
          sub.complete();
        },
        err => {
          const msg =
            err.code === err.PERMISSION_DENIED ? 'Location permission denied.' :
            err.code === err.POSITION_UNAVAILABLE ? 'Position unavailable.' :
            err.code === err.TIMEOUT ? 'Location request timed out.' :
            'Failed to get location.';
          this.error.set(msg);
          this.permissionDenied.set(err.code === err.PERMISSION_DENIED);
          sub.error(err);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000, ...options }
      );
    });
  }
}
