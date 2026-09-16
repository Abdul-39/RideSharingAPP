import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';

const PREFIX = 'rs_';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private memory = new Map<string, string>();
  private native = false;
  private ready: Promise<void>;

  constructor() {
    this.native = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform?.() === true;
    this.ready = this.hydrate();
  }

  whenReady(): Promise<void> {
    return this.ready;
  }

  get(key: string): string | null {
    const k = PREFIX + key;
    if (this.memory.has(k)) return this.memory.get(k)!;
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    const k = PREFIX + key;
    this.memory.set(k, value);
    try {
      localStorage.setItem(k, value);
    } catch { /* private mode */ }

    if (this.native) {
      try {
        const { Preferences } = await import('@capacitor/preferences');
        await Preferences.set({ key: k, value });
      } catch {
        /* plugin missing — localStorage still works */
      }
    }
  }

  async remove(key: string): Promise<void> {
    const k = PREFIX + key;
    this.memory.delete(k);
    try {
      localStorage.removeItem(k);
    } catch { /* */ }

    if (this.native) {
      try {
        const { Preferences } = await import('@capacitor/preferences');
        await Preferences.remove({ key: k });
      } catch { /* */ }
    }
  }

  async clearAuth(): Promise<void> {
    await Promise.all([
      this.remove('access_token'),
      this.remove('refresh_token'),
      this.remove('user')
    ]);
  }

  private async hydrate(): Promise<void> {
    if (!this.native) return;
    try {
      const { Preferences } = await import('@capacitor/preferences');
      for (const key of ['access_token', 'refresh_token', 'user']) {
        const k = PREFIX + key;
        const { value } = await Preferences.get({ key: k });
        if (value != null) {
          this.memory.set(k, value);
          try {
            localStorage.setItem(k, value);
          } catch { /* */ }
        }
      }
    } catch {
      /* Preferences not installed */
    }
  }
}