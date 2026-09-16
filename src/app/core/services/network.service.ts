import { Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';

/** Phase 13/14 — online/offline */
@Injectable({ providedIn: 'root' })
export class NetworkService {
  readonly online = signal(true);
  private nativeListener: { remove: () => Promise<void> } | null = null;

  async init(): Promise<void> {
    if (typeof window !== 'undefined') {
      this.online.set(navigator.onLine !== false);
      window.addEventListener('online', () => this.online.set(true));
      window.addEventListener('offline', () => this.online.set(false));
    }

    try {
      if (Capacitor.isNativePlatform?.()) {
        const { Network } = await import('@capacitor/network');
        const status = await Network.getStatus();
        this.online.set(!!status.connected);
        this.nativeListener = await Network.addListener('networkStatusChange', s => {
          this.online.set(!!s.connected);
        });
      }
    } catch {
      /* optional plugin */
    }
  }

  /** Use before critical UI actions */
  assertOnline(actionLabel = 'This action'): boolean {
    if (this.online()) return true;
    // Caller may toast; we only report false
    console.warn(`${actionLabel} blocked: offline`);
    return false;
  }

  async destroy(): Promise<void> {
    try {
      await this.nativeListener?.remove();
    } catch { /* */ }
    this.nativeListener = null;
  }
}
