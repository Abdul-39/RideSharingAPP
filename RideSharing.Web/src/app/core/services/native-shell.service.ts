import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';

/**
 * Phase 13 — Status bar + splash (native only; no-op on web)
 */
@Injectable({ providedIn: 'root' })
export class NativeShellService {
  async init(): Promise<void> {
    if (!Capacitor.isNativePlatform?.()) return;

    try {
      const { StatusBar, Style } = await import('@capacitor/status-bar');
      await StatusBar.setStyle({ style: Style.Dark });
      // Dark app chrome
      try {
        await StatusBar.setBackgroundColor({ color: '#060b18' });
      } catch { /* iOS may ignore */ }
    } catch {
      /* @capacitor/status-bar not installed */
    }

    try {
      const { SplashScreen } = await import('@capacitor/splash-screen');
      // Hide after Angular is ready
      await SplashScreen.hide({ fadeOutDuration: 300 });
    } catch {
      /* optional */
    }
  }
}
