import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

/**
 * UI Phase 2 — RideShare.pk dashboard (light cards, real API data where available)
 */
@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="rs-page dash">
      <!-- Hero -->
      <section class="hero">
        <div class="hero-left">
          <div class="chips">
            <span class="chip role">{{ roleLabel() }}</span>
            @if (isVerified()) {
              <span class="chip verified">Verified Commuter</span>
            }
          </div>
          <h1>Hi, {{ firstName() }}</h1>
          <p class="sub">
            Availability, vehicle and today's repeat commute rides across Islamabad &amp; Rawalpindi.
          </p>
        </div>
        <div class="hero-right">
          <span class="dot" [class.on]="isAvailable()"></span>
          <div>
            <strong>{{ isAvailable() ? 'Available for rides' : 'Not available' }}</strong>
            <p>Turn availability on in Driver Profile so passengers can match your corridor.</p>
          </div>
        </div>
      </section>

      <!-- Stat cards -->
      <div class="stats">
        <a class="stat" routerLink="/app/driver-profile">
          <div class="stat-top">
            <span class="label">AVAILABILITY</span>
            <span class="pill" [class.ok]="isAvailable()">{{ isAvailable() ? 'Available' : 'Off' }}</span>
          </div>
          <div class="rows">
            <div><span>License</span><strong>{{ license() }}</strong></div>
            <div><span>Experience</span><strong>{{ experience() }}</strong></div>
            <div><span>Status</span><strong>{{ driverStatus() }}</strong></div>
          </div>
          <span class="more">Edit Profile →</span>
        </a>

        <a class="stat" routerLink="/app/vehicles">
          <div class="stat-top">
            <span class="label">VEHICLE</span>
            <span class="icon">🚐</span>
          </div>
          @if (primaryVehicle(); as v) {
            <h3>{{ v.make }} {{ v.model }}</h3>
            <p class="meta">{{ v.registrationNumber }} · {{ v.color || '—' }}</p>
            <div class="tags">
              <span class="tag">{{ v.seatingCapacity || '?' }} seats</span>
              @if (v.isActive !== false) { <span class="tag green">Active</span> }
            </div>
          } @else {
            <h3>No vehicle yet</h3>
            <p class="meta">Add a commute vehicle to appear in matching.</p>
          }
          <span class="more">My Vehicles →</span>
        </a>

        <a class="stat" routerLink="/app/routes">
          <div class="stat-top">
            <span class="label">ROUTES</span>
            <span class="icon">📍</span>
          </div>
          @if (topRoute(); as r) {
            <h3>{{ shortAddr(r.sourceAddress) }}</h3>
            <p class="meta">→ {{ shortAddr(r.destinationAddress) }}</p>
            <p class="meta">{{ formatTime(r.preferredDepartureTime) }} · ±{{ r.maximumTimeToleranceMinutes ?? 15 }} min</p>
          } @else {
            <h3>No routes yet</h3>
            <p class="meta">Publish your daily home → office corridor.</p>
          }
          <span class="more">Manage ({{ routeCount() }}) →</span>
        </a>

        <a class="stat" routerLink="/app/rides/lifecycle">
          <div class="stat-top">
            <span class="label">MY RIDES</span>
            <span class="pill star">★</span>
          </div>
          <h3>{{ rideCount() }} <small>trips</small></h3>
          <p class="meta">Open lifecycle for active, upcoming &amp; history.</p>
          <span class="more">Ride Lifecycle →</span>
        </a>
      </div>

      <!-- Active ride banner -->
      @if (activeRide(); as ar) {
        <section class="active">
          <div class="active-left">
            <span class="chip yellow">ACTIVE RIDE · {{ ar.status || 'In progress' }}</span>
            <h2>{{ shortAddr(ar.sourceAddress || ar.routeSource) }} → {{ shortAddr(ar.destinationAddress || ar.routeDestination) }}</h2>
            <p class="meta">
              @if (ar.id) { ID: {{ ar.id }} · }
              Open details for OTP, chat, GPS &amp; SOS
            </p>
          </div>
          <div class="active-actions">
            <a class="btn primary" [routerLink]="['/app/rides/lifecycle', ar.id]">Open ride</a>
            <a class="btn ghost" routerLink="/app/gps">Track GPS</a>
            <a class="btn danger" routerLink="/app/safety">SOS</a>
          </div>
        </section>
      } @else {
        <section class="active soft">
          <div>
            <span class="chip yellow">NO ACTIVE RIDE</span>
            <h2>Find a match or wait for today's commute</h2>
            <p class="meta">Use Find Ride or publish routes so matching can run.</p>
          </div>
          <div class="active-actions">
            <a class="btn primary" routerLink="/app/rides/find">Find Ride</a>
            <a class="btn ghost" routerLink="/app/routes">My Routes</a>
          </div>
        </section>
      }

      <!-- Shortcuts -->
      <div class="shortcuts">
        <a routerLink="/app/rides/find"><strong>Find Ride</strong><span>Request commute</span></a>
        <a routerLink="/app/routes"><strong>My Routes</strong><span>{{ routeCount() }} published</span></a>
        <a routerLink="/app/gps"><strong>Maps &amp; GPS</strong><span>Leaflet · OSM</span></a>
        <a routerLink="/app/wallet"><strong>PKR Wallet</strong><span>Deposit &amp; fare</span></a>
        <a routerLink="/app/safety"><strong>Safety &amp; SOS</strong><span>Emergency contacts</span></a>
        <a routerLink="/app/verification"><strong>Verification</strong><span>{{ isVerified() ? 'Verified' : 'Submit ID' }}</span></a>
      </div>

      @if (loadError()) {
        <p class="warn">{{ loadError() }}</p>
      }
    </div>
  `,
  styles: [`
    .dash { padding-top: 0.5rem; }
    .hero {
      display: flex; flex-wrap: wrap; justify-content: space-between; gap: 1rem;
      background: #fff; border: 1px solid #b7ebc9; border-radius: 18px;
      padding: 1.25rem 1.35rem; box-shadow: 0 8px 24px rgba(15,23,42,0.05);
      margin-bottom: 1rem;
    }
    .chips { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.45rem; }
    .chip {
      display: inline-flex; align-items: center; padding: 0.28rem 0.7rem;
      border-radius: 999px; font-size: 0.72rem; font-weight: 800;
    }
    .chip.role { background: #e8f8f1; color: #0b7f58; }
    .chip.verified { background: #fff7cc; color: #a16207; }
    .chip.yellow { background: #fff7cc; color: #a16207; }
    .hero h1 { margin: 0; font-size: 1.75rem; font-weight: 800; color: #0f172a; }
    .sub { margin: 0.35rem 0 0; color: #64748b; font-size: 0.92rem; max-width: 36rem; }
    .hero-right {
      display: flex; align-items: flex-start; gap: 0.65rem;
      background: #e8f8f1; border: 1px solid #b7ebc9; border-radius: 14px;
      padding: 0.85rem 1rem; min-width: 240px; max-width: 320px;
    }
    .hero-right strong { display: block; font-size: 0.9rem; color: #0f172a; }
    .hero-right p { margin: 0.2rem 0 0; font-size: 0.78rem; color: #64748b; line-height: 1.35; }
    .dot {
      width: 12px; height: 12px; border-radius: 50%; background: #94a3b8; margin-top: 4px; flex-shrink: 0;
    }
    .dot.on {
      background: #0d9f6e;
      box-shadow: 0 0 0 4px rgba(13,159,110,0.2);
    }

    .stats {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.85rem;
      margin-bottom: 1rem;
    }
    @media (max-width: 1000px) { .stats { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 560px) { .stats { grid-template-columns: 1fr; } }

    .stat {
      background: #fff; border: 1px solid #b7ebc9; border-radius: 16px;
      padding: 1rem 1.1rem; text-decoration: none; color: inherit;
      box-shadow: 0 6px 18px rgba(15,23,42,0.04);
      display: flex; flex-direction: column; gap: 0.45rem;
      transition: border-color 0.15s ease;
    }
    .stat:hover { border-color: #0d9f6e; }
    .stat-top { display: flex; justify-content: space-between; align-items: center; }
    .label { font-size: 0.7rem; font-weight: 800; letter-spacing: 0.04em; color: #64748b; }
    .icon { font-size: 1.1rem; }
    .pill {
      font-size: 0.7rem; font-weight: 800; padding: 0.2rem 0.55rem;
      border-radius: 999px; background: #f1f5f9; color: #64748b;
    }
    .pill.ok { background: #e8f8f1; color: #0b7f58; }
    .pill.star { background: #fff7cc; color: #a16207; }
    .stat h3 { margin: 0; font-size: 1.05rem; font-weight: 800; color: #0f172a; }
    .stat h3 small { font-size: 0.85rem; font-weight: 600; color: #64748b; }
    .meta { margin: 0; font-size: 0.82rem; color: #64748b; }
    .rows { display: flex; flex-direction: column; gap: 0.35rem; }
    .rows > div {
      display: flex; justify-content: space-between; gap: 0.5rem;
      font-size: 0.85rem;
    }
    .rows span { color: #64748b; }
    .rows strong { color: #0f172a; font-weight: 700; }
    .tags { display: flex; flex-wrap: wrap; gap: 0.3rem; }
    .tag {
      font-size: 0.7rem; font-weight: 700; padding: 0.2rem 0.5rem;
      border-radius: 999px; background: #f1f5f9; color: #475569;
    }
    .tag.green { background: #e8f8f1; color: #0b7f58; }
    .more { margin-top: auto; padding-top: 0.35rem; color: #0d9f6e; font-weight: 700; font-size: 0.85rem; }

    .active {
      display: flex; flex-wrap: wrap; justify-content: space-between; gap: 1rem;
      background: linear-gradient(90deg, #fff 0%, #fff8db 55%, #fff 100%);
      border: 1px solid #f5d76e; border-radius: 16px;
      padding: 1.1rem 1.25rem; margin-bottom: 1rem;
    }
    .active.soft {
      background: #fff;
      border-color: #b7ebc9;
    }
    .active h2 { margin: 0.4rem 0 0.25rem; font-size: 1.05rem; font-weight: 800; color: #0f172a; }
    .active-actions { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; }
    .btn {
      display: inline-flex; align-items: center; justify-content: center;
      min-height: 42px; padding: 0.45rem 1rem; border-radius: 999px;
      font-weight: 800; font-size: 0.85rem; text-decoration: none;
    }
    .btn.primary { background: #0d9f6e; color: #fff; }
    .btn.ghost { background: #fff; border: 1px solid #e2e8f0; color: #0f172a; }
    .btn.danger { background: #e11d48; color: #fff; }

    .shortcuts {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem;
    }
    @media (max-width: 800px) { .shortcuts { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 480px) { .shortcuts { grid-template-columns: 1fr; } }
    .shortcuts a {
      background: #fff; border: 1px solid #b7ebc9; border-radius: 14px;
      padding: 0.95rem 1rem; text-decoration: none; color: inherit;
      display: flex; flex-direction: column; gap: 0.2rem;
    }
    .shortcuts a:hover { border-color: #0d9f6e; }
    .shortcuts strong { font-size: 0.95rem; color: #0f172a; }
    .shortcuts span { font-size: 0.8rem; color: #64748b; }

    .warn { margin-top: 1rem; color: #b45309; font-size: 0.85rem; }
  `]
})
export class DashboardHomeComponent implements OnInit {
  private auth = inject(AuthService);
  private http = inject(HttpClient);

  private api = environment.apiUrl?.replace(/\/$/, '') || '/api/v1';

  driverProfile = signal<any>(null);
  vehicles = signal<any[]>([]);
  routes = signal<any[]>([]);
  rides = signal<any[]>([]);
  isVerified = signal(false);
  loadError = signal('');

  primaryVehicle = computed(() => {
    const list = this.vehicles();
    if (!list.length) return null;
    return list.find((v) => v.isPrimary || v.isActive) || list[0];
  });

  topRoute = computed(() => this.routes()[0] || null);
  routeCount = computed(() => this.routes().length);
  rideCount = computed(() => this.rides().length);

  activeRide = computed(() => {
    const activeStatuses = [
      'Confirmed', 'DriverArriving', 'DriverArrived', 'InProgress',
      'Matched', 'Matching', 'Requested'
    ];
    return (
      this.rides().find((r) =>
        activeStatuses.some(
          (s) => String(r.status || '').toLowerCase() === s.toLowerCase()
        )
      ) || null
    );
  });

  ngOnInit(): void {
    this.safeGet(`${this.api}/drivers/me`, (d) => this.driverProfile.set(d));
    this.safeGet(`${this.api}/vehicles`, (d) =>
      this.vehicles.set(Array.isArray(d) ? d : d?.items || d?.data || [])
    );
    this.safeGet(`${this.api}/routes/my`, (d) =>
      this.routes.set(Array.isArray(d) ? d : d?.items || [])
    );
    this.safeGet(`${this.api}/rides/my`, (d) =>
      this.rides.set(Array.isArray(d) ? d : d?.items || [])
    );
    this.safeGet(`${this.api}/verification/me`, (d) =>
      this.isVerified.set(!!(d?.isVerified ?? d?.data?.isVerified))
    );
  }

  private safeGet(url: string, apply: (data: any) => void): void {
    this.http.get<any>(url).subscribe({
      next: (r) => {
        const data = r?.data !== undefined ? r.data : r;
        apply(data);
      },
      error: () => {
        /* ignore missing endpoints for role */
      }
    });
  }

  private user(): any {
    const a: any = this.auth;
    return a.currentUser?.() ?? a.user?.() ?? a.getUser?.() ?? null;
  }

  private roles(): string[] {
    const a: any = this.auth;
    const r = a.roles?.();
    if (Array.isArray(r)) return r;
    return this.user()?.roles ?? [];
  }

  firstName(): string {
    return this.user()?.firstName || 'there';
  }

  roleLabel(): string {
    if (this.roles().includes('Admin')) return 'ADMIN';
    if (this.roles().includes('Driver')) return 'DRIVER';
    return 'PASSENGER';
  }

  isAvailable(): boolean {
    const p = this.driverProfile();
    return !!(p?.isAvailable ?? p?.isActive);
  }

  license(): string {
    return this.driverProfile()?.licenseNumber || this.driverProfile()?.license || '—';
  }

  experience(): string {
    const y = this.driverProfile()?.yearsOfExperience;
    return y != null ? `${y} yrs` : '—';
  }

  driverStatus(): string {
    const p = this.driverProfile();
    if (!p) return '—';
    const s = p.verificationStatus;
    if (s === 1 || s === 'Verified' || s === 'verified') return 'Verified';
    if (typeof s === 'string') return s;
    return 'Pending';
  }

  shortAddr(a?: string): string {
    if (!a) return '—';
    return a.length > 36 ? a.slice(0, 34) + '…' : a;
  }

  formatTime(t?: string): string {
    if (!t) return '—';
    // "08:00:00" or ISO
    if (/^\d{2}:\d{2}/.test(t)) return t.slice(0, 5);
    try {
      const d = new Date(t);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    } catch { /* */ }
    return t;
  }
}
