import { Component, OnInit, OnDestroy, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NotificationService } from '../core/services/notification.service';
import { SignalRService } from '../core/services/signalr.service';
import { AuthService } from '../core/services/auth.service';
import { ToastContainerComponent } from '../shared/components/toast-container.component';
import { ConfirmDialogComponent } from '../shared/components/confirm-dialog.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ToastContainerComponent, ConfirmDialogComponent],
  template: `
    <div class="shell">
      <header class="topbar">
        <a routerLink="/app/dashboard" class="brand">
          <span class="logo">RS</span>
          <span class="brand-name">RideSharing</span>
        </a>

        <button type="button" class="menu-btn" (click)="menuOpen.set(!menuOpen())" aria-label="Menu">
          <span></span><span></span><span></span>
        </button>

        <nav class="nav-desktop">
          @for (item of navItems(); track item.path) {
            <a [routerLink]="item.path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: item.exact === true }">
              {{ item.label }}
              @if (item.path === '/app/notifications' && unread() > 0) {
                <span class="nbadge">{{ unread() > 9 ? '9+' : unread() }}</span>
              }
            </a>
          }
          <span class="user-chip">{{ auth.currentUser()?.firstName }} · {{ roleLabel() }}</span>
          <button type="button" class="logout" (click)="logout()">Logout</button>
        </nav>
      </header>

      @if (menuOpen()) {
        <div class="drawer-backdrop" (click)="menuOpen.set(false)"></div>
        <nav class="drawer">
          @for (item of navItems(); track item.path) {
            <a [routerLink]="item.path" routerLinkActive="active"
               [routerLinkActiveOptions]="{ exact: item.exact === true }"
               (click)="menuOpen.set(false)">{{ item.label }}</a>
          }
          <button type="button" class="logout block" (click)="logout()">Logout</button>
        </nav>
      }

      <main class="content">
        <router-outlet />
      </main>

      <nav class="bottom-nav">
        @for (item of mobileNav(); track item.path) {
          <a [routerLink]="item.path" routerLinkActive="active"
             [routerLinkActiveOptions]="{ exact: item.exact === true }">
            <span class="ico">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
          </a>
        }
      </nav>

      <app-toast-container />
      <app-confirm-dialog />
    </div>
  `,
  styles: [`
    .shell { min-height: 100vh; background: #060b18; color: #f1f5f9; padding-bottom: 4.5rem; }
    @media (min-width: 900px) { .shell { padding-bottom: 0; } }

    .topbar {
      position: sticky; top: 0; z-index: 50;
      display: flex; align-items: center; justify-content: space-between; gap: 1rem;
      padding: 0.75rem 1.1rem;
      background: rgba(6,11,24,0.85); backdrop-filter: blur(14px);
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .brand { display: flex; align-items: center; gap: 0.55rem; text-decoration: none; color: inherit; }
    .logo {
      width: 36px; height: 36px; border-radius: 10px;
      background: linear-gradient(135deg,#5b8cff,#7c5cff);
      display: grid; place-items: center; font-weight: 800; font-size: 0.8rem;
      box-shadow: 0 6px 18px rgba(91,140,255,0.35);
    }
    .brand-name { font-weight: 700; letter-spacing: -0.02em; }

    .nav-desktop { display: none; align-items: center; gap: 0.35rem; flex-wrap: wrap; }
    @media (min-width: 900px) { .nav-desktop { display: flex; } .menu-btn { display: none; } }
    .nav-desktop a {
      padding: 0.4rem 0.75rem; border-radius: 999px; font-size: 0.82rem; font-weight: 500;
      color: #94a3b8; text-decoration: none; transition: 0.15s;
    }
    .nbadge {
      margin-left: 0.25rem; background: #ef4444; color: #fff; border-radius: 999px;
      font-size: 0.65rem; padding: 0.05rem 0.35rem; font-weight: 700;
    }
    .nav-desktop a:hover, .nav-desktop a.active {
      color: #fff; background: rgba(91,140,255,0.18);
    }
    .user-chip {
      margin-left: 0.35rem; padding: 0.3rem 0.7rem; border-radius: 999px;
      font-size: 0.75rem; background: rgba(255,255,255,0.06); color: #cbd5e1;
    }
    .logout {
      margin-left: 0.25rem; padding: 0.4rem 0.85rem; border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.12); background: transparent; color: #e2e8f0;
      cursor: pointer; font-size: 0.82rem;
    }
    .logout.block { width: 100%; margin: 0.75rem 0 0; }

    .menu-btn {
      display: flex; flex-direction: column; gap: 5px; background: none; border: none; cursor: pointer; padding: 0.4rem;
    }
    .menu-btn span { display: block; width: 22px; height: 2px; background: #e2e8f0; border-radius: 2px; }

    .drawer-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 60; }
    .drawer {
      position: fixed; top: 0; right: 0; bottom: 0; width: min(280px, 85vw); z-index: 70;
      background: #0c1224; border-left: 1px solid rgba(255,255,255,0.08);
      padding: 1.25rem; display: flex; flex-direction: column; gap: 0.35rem;
      animation: slide 0.2s ease;
    }
    .drawer a {
      padding: 0.75rem 0.9rem; border-radius: 0.75rem; color: #cbd5e1; text-decoration: none; font-weight: 500;
    }
    .drawer a.active, .drawer a:hover { background: rgba(91,140,255,0.15); color: #fff; }

    .content { max-width: 1100px; margin: 0 auto; padding: 1.25rem 1rem 2rem; }

    .bottom-nav {
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 40;
      display: flex; justify-content: space-around;
      background: rgba(8,13,28,0.94); backdrop-filter: blur(12px);
      border-top: 1px solid rgba(255,255,255,0.08); padding: 0.4rem 0.25rem calc(0.4rem + env(safe-area-inset-bottom));
    }
    @media (min-width: 900px) { .bottom-nav { display: none; } }
    .bottom-nav a {
      display: flex; flex-direction: column; align-items: center; gap: 0.15rem;
      font-size: 0.68rem; color: #64748b; text-decoration: none; padding: 0.35rem 0.5rem; min-width: 3.5rem;
    }
    .bottom-nav a.active { color: #93c5fd; }
    .bottom-nav .ico { font-size: 1.15rem; }

    @keyframes slide { from { transform: translateX(12px); opacity: 0; } to { transform: none; opacity: 1; } }
  `]
})
export class AppShellComponent implements OnInit, OnDestroy {
  auth = inject(AuthService);
  private notifApi = inject(NotificationService);
  private signalR = inject(SignalRService);
  unread = this.notifApi.unreadCount;
  menuOpen = signal(false);
  private notifSub: { unsubscribe(): void } | null = null;

  ngOnInit(): void {
    this.notifApi.refreshUnread();
    void this.signalR.connect().catch(() => {});
    this.notifSub = this.signalR.userNotification$.subscribe(() => this.notifApi.refreshUnread());
  }

  ngOnDestroy(): void {
    this.notifSub?.unsubscribe();
  }


  roleLabel(): string {
    const roles = this.auth.currentUser()?.roles || [];
    if (roles.includes('Admin')) return 'Admin';
    if (roles.includes('Driver')) return 'Driver';
    return 'Passenger';
  }

  isDriver(): boolean {
    return this.auth.hasRole('Driver') || this.auth.hasRole('Admin');
  }

  navItems() {
    const base = [
      { path: '/app/dashboard', label: 'Dashboard', exact: true },
      { path: '/app/routes', label: 'My Routes' },
      { path: '/app/rides', label: 'Rides' },
      { path: '/app/rides/lifecycle', label: 'My Rides' },
      { path: '/app/profile', label: 'Profile' },
    ];
    if (this.isDriver()) {
      base.push({ path: '/app/driver-profile', label: 'Driver Profile' });
      base.push({ path: '/app/vehicles', label: 'Vehicle' });
    }
    base.push(
      { path: '/app/gps', label: 'Maps' },
      { path: '/app/wallet', label: 'Wallet' },
      { path: '/app/payments', label: 'Payments' },
      { path: '/app/chat', label: 'Chat' },
      { path: '/app/notifications', label: 'Notifications' },
      { path: '/app/safety', label: 'Safety' },
      { path: '/app/settings', label: 'Settings' }
    );
    return base;
  }

  mobileNav() {
    const items = [
      { path: '/app/dashboard', label: 'Home', icon: '🏠', exact: true },
      { path: '/app/routes', label: 'Routes', icon: '🗺️' },
      { path: '/app/rides', label: 'Rides', icon: '🔍' },
      { path: '/app/rides/lifecycle', label: 'Trips', icon: '🚗' },
      { path: '/app/profile', label: 'Profile', icon: '👤' },
    ];
    return items;
  }

  logout(): void {
    this.menuOpen.set(false);
    this.auth.logout();
  }

  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth >= 900) this.menuOpen.set(false);
  }
}
