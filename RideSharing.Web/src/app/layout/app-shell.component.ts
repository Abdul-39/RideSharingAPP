import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { RsIconComponent } from '../shared/rs-icon.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, RsIconComponent],
  template: `
    <div class="shell">
      <header class="top">
        <!-- Brand row -->
        <div class="bar">
          <a routerLink="/app/dashboard" class="brand">
            <span class="logo">
              <app-rs-icon name="logo" [size]="20" color="#fff"></app-rs-icon>
            </span>
            <span class="brand-text">
              <strong>RideShare.pk</strong>
              <small>Daily Repeat Commutes</small>
            </span>
          </a>

          <div class="bar-right">
            <span class="role-pill">{{ roleLabel() }}</span>

            <!-- Desktop tools -->
            <div class="tools desk">
              <a routerLink="/app/safety" class="btn-sos" title="Emergency SOS">
                <app-rs-icon name="shield" [size]="15" color="#fff"></app-rs-icon>
                <span>SOS</span>
              </a>
              <a routerLink="/app/wallet" class="btn-chip" title="Wallet">
                <app-rs-icon name="wallet" [size]="15"></app-rs-icon>
                <span>Wallet</span>
              </a>
              <a routerLink="/app/notifications" class="btn-icon" title="Notifications">
                <app-rs-icon name="bell" [size]="17"></app-rs-icon>
              </a>
              <div class="profile">
                <span class="avatar">{{ initials() }}</span>
                <div class="profile-meta">
                  <strong>{{ displayName() }}</strong>
                  <small>{{ roleLabel() }}</small>
                </div>
                <button type="button" class="btn-chip" (click)="logout()" title="Logout">
                  <app-rs-icon name="logout" [size]="14"></app-rs-icon>
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Mobile tools strip -->
        <div class="tools mob">
          <a routerLink="/app/safety" class="btn-sos">
            <app-rs-icon name="shield" [size]="14" color="#fff"></app-rs-icon>
            SOS
          </a>
          <a routerLink="/app/wallet" class="btn-chip">
            <app-rs-icon name="wallet" [size]="14"></app-rs-icon>
            Wallet
          </a>
          <a routerLink="/app/notifications" class="btn-icon">
            <app-rs-icon name="bell" [size]="16"></app-rs-icon>
          </a>
          <span class="avatar sm">{{ initials() }}</span>
          <button type="button" class="btn-chip" (click)="logout()">
            <app-rs-icon name="logout" [size]="14"></app-rs-icon>
          </button>
        </div>
      </header>

      <nav class="tabs" aria-label="Main navigation">
        @for (t of tabs(); track t.path) {
          <a [routerLink]="t.path" routerLinkActive="active">
            <app-rs-icon [name]="t.icon" [size]="14"></app-rs-icon>
            <span>{{ t.label }}</span>
          </a>
        }
      </nav>

      <main class="main">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .shell {
      min-height: 100vh;
      background: linear-gradient(180deg, #eefaf4 0%, #f3faf6 120px, #f8fafc 100%);
      max-width: 100vw;
      overflow-x: hidden;
    }

    /* ========== HEADER ========== */
    .top {
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(13, 159, 110, 0.12);
      box-shadow: 0 4px 24px rgba(15, 23, 42, 0.04);
      padding: 0.65rem 0.85rem 0.55rem;
    }

    .bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.65rem;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      text-decoration: none;
      color: inherit;
      min-width: 0;
    }

    .logo {
      width: 40px;
      height: 40px;
      border-radius: 13px;
      display: grid;
      place-items: center;
      background: linear-gradient(145deg, #0d9f6e 0%, #12b981 55%, #14b8a6 100%);
      box-shadow:
        0 4px 12px rgba(13, 159, 110, 0.35),
        inset 0 1px 0 rgba(255, 255, 255, 0.25);
      flex-shrink: 0;
    }

    .brand-text strong {
      display: block;
      font-size: 1rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      background: linear-gradient(90deg, #0b7f58, #0d9f6e);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    .brand-text small {
      display: block;
      color: #64748b;
      font-size: 0.68rem;
      font-weight: 600;
      margin-top: 1px;
    }

    .bar-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    .role-pill {
      display: inline-flex;
      align-items: center;
      padding: 0.32rem 0.75rem;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 800;
      color: #0b7f58;
      background: linear-gradient(180deg, #f0fdf6, #e8f8f1);
      border: 1px solid #b7ebc9;
      box-shadow: 0 1px 2px rgba(13, 159, 110, 0.08);
      white-space: nowrap;
    }

    /* Buttons */
    .btn-sos {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.45rem 0.85rem;
      border-radius: 999px;
      background: linear-gradient(135deg, #e11d48, #f43f5e);
      color: #fff !important;
      font-weight: 800;
      font-size: 0.72rem;
      letter-spacing: 0.02em;
      text-decoration: none;
      box-shadow: 0 4px 14px rgba(225, 29, 72, 0.35);
      white-space: nowrap;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .btn-sos:active { transform: scale(0.97); }

    .btn-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.42rem 0.8rem;
      border-radius: 999px;
      background: #fff;
      border: 1px solid #e2e8f0;
      color: #0f172a;
      font-weight: 700;
      font-size: 0.78rem;
      text-decoration: none;
      cursor: pointer;
      font-family: inherit;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
      white-space: nowrap;
    }
    .btn-chip:hover {
      border-color: #b7ebc9;
      background: #f0fdf6;
    }

    .btn-icon {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      background: #fff;
      border: 1px solid #e2e8f0;
      color: #334155;
      text-decoration: none;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
      flex-shrink: 0;
    }
    .btn-icon:hover {
      border-color: #b7ebc9;
      color: #0d9f6e;
      background: #f0fdf6;
    }

    .profile {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      padding-left: 0.35rem;
      border-left: 1px solid #eef2f7;
      margin-left: 0.15rem;
    }

    .avatar {
      width: 36px;
      height: 36px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      font-weight: 800;
      font-size: 0.72rem;
      color: #fff;
      background: linear-gradient(145deg, #0d9f6e, #14b8a6);
      box-shadow: 0 2px 8px rgba(13, 159, 110, 0.3);
      flex-shrink: 0;
    }
    .avatar.sm { width: 34px; height: 34px; }

    .profile-meta strong {
      display: block;
      font-size: 0.8rem;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.2;
    }
    .profile-meta small {
      color: #64748b;
      font-size: 0.68rem;
      font-weight: 600;
    }

    /* Desktop / mobile tools visibility */
    .tools.desk { display: none; align-items: center; gap: 0.4rem; }
    .tools.mob {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin-top: 0.55rem;
      padding-top: 0.55rem;
      border-top: 1px solid #f1f5f9;
    }

    /* ========== TABS ========== */
    .tabs {
      display: flex;
      flex-wrap: nowrap;
      gap: 0.35rem;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      padding: 0.55rem 0.75rem 0.65rem;
      background: rgba(255, 255, 255, 0.85);
      border-bottom: 1px solid rgba(13, 159, 110, 0.08);
    }
    .tabs::-webkit-scrollbar { display: none; }

    .tabs a {
      display: inline-flex;
      align-items: center;
      gap: 0.32rem;
      flex: 0 0 auto;
      white-space: nowrap;
      padding: 0.48rem 0.85rem;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 700;
      color: #64748b;
      text-decoration: none;
      background: #fff;
      border: 1px solid #eef2f7;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
      transition: background 0.15s, color 0.15s, border-color 0.15s, box-shadow 0.15s;
    }
    .tabs a:hover {
      color: #0d9f6e;
      border-color: #c6f0d8;
      background: #f0fdf6;
    }
    .tabs a.active {
      color: #0b7f58;
      background: linear-gradient(180deg, #e8f8f1, #dcf7ea);
      border-color: #86efac;
      box-shadow: 0 2px 8px rgba(13, 159, 110, 0.15);
    }

    .main {
      min-height: 50vh;
      padding: 0.85rem 0.75rem 1.5rem;
      max-width: 1100px;
      margin: 0 auto;
    }

    /* ========== DESKTOP ========== */
    @media (min-width: 900px) {
      .top { padding: 0.75rem 1.25rem 0.65rem; }
      .logo { width: 44px; height: 44px; border-radius: 14px; }
      .brand-text strong { font-size: 1.1rem; }
      .brand-text small { font-size: 0.72rem; }
      .tools.desk { display: flex; }
      .tools.mob { display: none; }
      .tabs { padding: 0.55rem 1.25rem 0.7rem; gap: 0.4rem; }
      .tabs a { font-size: 0.82rem; padding: 0.5rem 0.95rem; }
      .main { padding: 1.1rem 1.25rem 2rem; }
    }

    @media (max-width: 380px) {
      .brand-text small { display: none; }
      .role-pill { padding: 0.28rem 0.55rem; font-size: 0.68rem; }
    }
  `]
})
export class AppShellComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  private roles(): string[] {
    const a: any = this.auth;
    const fromSignal = a.roles?.();
    if (Array.isArray(fromSignal)) return fromSignal;
    const u = a.currentUser?.() ?? a.user?.() ?? a.getUser?.();
    return u?.roles ?? [];
  }

  isAdmin(): boolean { return this.roles().includes('Admin'); }
  isDriver(): boolean { return this.roles().includes('Driver'); }

  tabs(): { path: string; label: string; icon: string }[] {
    const items: { path: string; label: string; icon: string }[] = [
      { path: '/app/dashboard', label: 'Dashboard', icon: 'home' },
      { path: '/app/routes', label: 'Routes', icon: 'route' },
      { path: '/app/rides/find', label: 'Find', icon: 'search' },
      { path: '/app/rides/lifecycle', label: 'Rides', icon: 'car' },
      { path: '/app/gps', label: 'Maps', icon: 'map-pin' }
    ];
    if (this.isDriver()) {
      items.push(
        { path: '/app/driver-profile', label: 'Driver', icon: 'user' },
        { path: '/app/vehicles', label: 'Vehicles', icon: 'car' }
      );
    }
    items.push(
      { path: '/app/wallet', label: 'Wallet', icon: 'wallet' },
      { path: '/app/chat', label: 'Chat', icon: 'chat' },
      { path: '/app/notifications', label: 'Alerts', icon: 'bell' },
      { path: '/app/safety', label: 'Safety', icon: 'shield' },
      { path: '/app/verification', label: 'Verify', icon: 'check' }
    );
    if (this.isAdmin()) {
      items.push({ path: '/app/admin/dashboard', label: 'Admin Dashboard', icon: 'settings' });
      items.push({ path: '/app/admin/verification', label: 'Review', icon: 'check' });
    }
    return items;
  }

  displayName(): string {
    const a: any = this.auth;
    const u = a.currentUser?.() ?? a.user?.() ?? a.getUser?.();
    if (!u) return 'User';
    const n = `${u.firstName || ''} ${u.lastName || ''}`.trim();
    return n || u.email || 'User';
  }

  initials(): string {
    return this.displayName()
      .split(/\s+/).filter(Boolean).slice(0, 2)
      .map((s) => s[0]?.toUpperCase() || '').join('') || 'U';
  }

  roleLabel(): string {
    if (this.isAdmin()) return 'Admin';
    if (this.isDriver()) return 'Driver';
    return 'Passenger';
  }

  logout(): void {
    (this.auth as any).logout?.();
    this.router.navigateByUrl('/auth');
  }
}