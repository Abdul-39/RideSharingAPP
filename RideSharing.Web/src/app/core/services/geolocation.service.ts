import { Injectable, signal } from '@angular/core';
import { Observable, Subscriber, from, switchMap, of, catchError, throwError } from 'rxjs';
import { Capacitor } from '@capacitor/core';

export interface BrowserPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

/**
 * Phase 7 — Geolocation
 * Native (Capacitor Android): @capacitor/geolocation
 * Web / ng serve: browser navigator.geolocation
 */
@Injectable({ providedIn: 'root' })
export class GeolocationService {
  readonly lastPosition = signal<BrowserPosition | null>(null);
  readonly error = signal<string>('');
  readonly permissionDenied = signal(false);

  isNative(): boolean {
    try {
      return typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform?.() === true;
    } catch {
      return false;
    }
  }

  isSupported(): boolean {
    if (this.isNative()) return true;
    return typeof navigator !== 'undefined' && !!navigator.geolocation;
  }

  getCurrentPosition(options?: PositionOptions): Observable<BrowserPosition> {
    if (this.isNative()) {
      return from(this.getNativePosition()).pipe(
        catchError(err => {
          this.handleNativeError(err);
          return throwError(() => err);
        })
      );
    }
    return this.getBrowserPosition(options);
  }

  private async getNativePosition(): Promise<BrowserPosition> {
    const { Geolocation } = await import('@capacitor/geolocation');
    // Request permission on Android 6+
    try {
      const perm = await Geolocation.checkPermissions();
      if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') {
        const req = await Geolocation.requestPermissions();
        if (req.location !== 'granted' && req.coarseLocation !== 'granted') {
          this.permissionDenied.set(true);
          this.error.set('Location permission denied.');
          throw new Error('permission denied');
        }
      }
    } catch (e) {
      // Some platforms may not implement checkPermissions the same way
      if ((e as Error)?.message === 'permission denied') throw e;
    }

    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 10000
    });

    const p: BrowserPosition = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy ?? 0,
      timestamp: pos.timestamp ?? Date.now()
    };
    this.lastPosition.set(p);
    this.error.set('');
    this.permissionDenied.set(false);
    return p;
  }

  private handleNativeError(err: unknown): void {
    const msg = (err as Error)?.message || String(err);
    if (/permission/i.test(msg)) {
      this.permissionDenied.set(true);
      this.error.set('Location permission denied.');
    } else if (/timeout/i.test(msg)) {
      this.error.set('Location request timed out.');
    } else if (/unavailable/i.test(msg)) {
      this.error.set('Position unavailable. Enable GPS.');
    } else {
      this.error.set(msg || 'Failed to get location.');
    }
  }

  private getBrowserPosition(options?: PositionOptions): Observable<BrowserPosition> {
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
