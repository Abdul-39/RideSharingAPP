import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { DriverService, DriverProfile } from '../../core/services/driver.service';
import { VehicleService, Vehicle } from '../../core/services/vehicle.service';
import { RouteService, RouteDto } from '../../core/services/route.service';
import { RideService, RideDto } from '../../core/services/ride.service';
import { RideRequestService, RideRequestDto } from '../../core/services/ride-request.service';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page">
      <header class="hero" [class.driver]="isDriver()" [class.passenger]="!isDriver()">
        <div>
          <p class="eyebrow">{{ isDriver() ? 'DRIVER WORKSPACE' : 'PASSENGER WORKSPACE' }}</p>
          <h1>Hello, {{ firstName() }}</h1>
          <p class="sub">
            @if (isDriver()) {
              Manage availability, vehicle and today's passenger rides.
            } @else {
              Your daily commute — routes, matches and upcoming rides.
            }
          </p>
        </div>
        <div class="hero-actions">
          @if (isDriver()) {
            <a routerLink="/app/driver-profile" class="btn primary">Driver profile</a>
            <a routerLink="/app/vehicles" class="btn ghost">My vehicle</a>
          } @else {
            <a routerLink="/app/rides/find" class="btn primary">Find a ride</a>
            <a routerLink="/app/routes" class="btn ghost">My routes</a>
          }
        </div>
      </header>

      <!-- ===================== DRIVER DASHBOARD ===================== -->
      @if (isDriver()) {
        <section class="grid driver-grid">
          <article class="card status-card">
            <div class="card-top">
              <h2>Availability</h2>
              <span class="pill" [class.on]="driverProfile()?.isAvailable">
                {{ driverProfile()?.isAvailable ? 'Available' : 'Offline' }}
              </span>
            </div>
            @if (!driverProfile()) {
              <p class="muted">No driver profile yet. Passengers cannot match you until this is set up.</p>
              <a routerLink="/app/driver-profile" class="btn primary sm">Set up driver profile →</a>
            } @else {
              <ul class="kv">
                <li><span>License</span><strong>{{ driverProfile()!.licenseNumber || '—' }}</strong></li>
                <li><span>Experience</span><strong>{{ driverProfile()!.yearsOfExperience }} yrs</strong></li>
                <li><span>Verification</span><strong>{{ driverProfile()!.verificationStatus || 'Pending' }}</strong></li>
              </ul>
              <a routerLink="/app/driver-profile" class="link">Edit availability →</a>
            }
          </article>

          <article class="card">
            <h2>Vehicle</h2>
            @if (vehicles().length === 0) {
              <p class="muted">Add a vehicle or matching will find no drivers.</p>
              <a routerLink="/app/vehicles" class="btn primary sm">Add vehicle →</a>
            } @else {
              @for (v of vehicles(); track v.id) {
                <div class="row">
                  <strong>{{ v.make }} {{ v.model }}</strong>
                  <span>{{ v.registrationNumber }} · {{ v.seatingCapacity }} seats · {{ v.color }}</span>
                </div>
              }
              <a routerLink="/app/vehicles" class="link">Manage vehicles →</a>
            }
          </article>

          <article class="card span2">
            <h2>Today / upcoming rides (as driver)</h2>
            @if (driverRides().length === 0) {
              <p class="muted">No upcoming rides yet. Stay Available and keep your route active so passengers can match you.</p>
            } @else {
              @for (r of driverRides(); track r.id) {
                <a class="ride-row" [routerLink]="['/app/rides/lifecycle', r.id]">
                  <div>
                    <strong>{{ r.sourceAddress }} → {{ r.destinationAddress }}</strong>
                    <span>{{ r.travelDate }} · {{ r.scheduledDepartureTime }}</span>
                  </div>
                  <em>{{ r.status }}</em>
                </a>
              }
            }
          </article>

          <article class="card">
            <h2>Quick actions</h2>
            <div class="actions">
              <a routerLink="/app/driver-profile" class="chip">Toggle available</a>
              <a routerLink="/app/vehicles" class="chip">Vehicle</a>
              <a routerLink="/app/routes" class="chip">My routes</a>
              <a routerLink="/app/rides/lifecycle" class="chip">My rides</a>
              <a routerLink="/app/safety" class="chip">Safety / SOS</a>
            </div>
          </article>

          <article class="card">
            <h2>Tips for drivers</h2>
            <ol class="tips">
              <li>Set <strong>Available for rides</strong> on Driver Profile.</li>
              <li>Add an active vehicle with enough seats.</li>
              <li>Keep your daily route + schedule days correct.</li>
            </ol>
          </article>
        </section>
      }

      <!-- ===================== PASSENGER DASHBOARD ===================== -->
      @if (!isDriver()) {
        <section class="grid passenger-grid">
          <article class="card accent">
            <h2>Find your commute</h2>
            <p class="muted">Match with drivers on the same route and time window.</p>
            <a routerLink="/app/rides/find" class="btn primary sm">Find a ride →</a>
          </article>

          <article class="card">
            <h2>My routes</h2>
            @if (routes().length === 0) {
              <p class="muted">Save home → office once. Matching uses it every day.</p>
              <a routerLink="/app/routes/new" class="btn primary sm">Add route →</a>
            } @else {
              @for (rt of routes().slice(0, 3); track rt.id) {
                <div class="row">
                  <strong>{{ rt.sourceAddress }} → {{ rt.destinationAddress }}</strong>
                  <span>{{ rt.preferredDepartureTime }} · ±{{ rt.maximumTimeToleranceMinutes }}m</span>
                </div>
              }
              <a routerLink="/app/routes" class="link">All routes →</a>
            }
          </article>

          <article class="card span2">
            <h2>Open ride requests</h2>
            @if (requests().length === 0) {
              <p class="muted">No open requests. Start from Find a ride.</p>
            } @else {
              @for (req of requests().slice(0, 5); track req.id) {
                <a class="ride-row" [routerLink]="['/app/rides', req.id, 'matches']">
                  <div>
                    <strong>{{ req.sourceAddress || 'Route' }} → {{ req.destinationAddress || '' }}</strong>
                    <span>{{ req.travelDate }} · {{ req.preferredDepartureTime }}</span>
                  </div>
                  <em>{{ req.status }}</em>
                </a>
              }
            }
          </article>

          <article class="card span2">
            <h2>Upcoming rides (as passenger)</h2>
            @if (passengerRides().length === 0) {
              <p class="muted">No upcoming rides. After you accept a match and confirm, they show here.</p>
            } @else {
              @for (r of passengerRides(); track r.id) {
                <a class="ride-row" [routerLink]="['/app/rides/lifecycle', r.id]">
                  <div>
                    <strong>{{ r.sourceAddress }} → {{ r.destinationAddress }}</strong>
                    <span>{{ r.travelDate }} · {{ r.scheduledDepartureTime }}</span>
                  </div>
                  <em>{{ r.status }}</em>
                </a>
              }
            }
          </article>

          <article class="card">
            <h2>Quick actions</h2>
            <div class="actions">
              <a routerLink="/app/rides/find" class="chip">Find ride</a>
              <a routerLink="/app/routes" class="chip">Routes</a>
              <a routerLink="/app/rides/lifecycle" class="chip">My rides</a>
              <a routerLink="/app/wallet" class="chip">Wallet</a>
              <a routerLink="/app/safety" class="chip">Safety / SOS</a>
            </div>
          </article>

          <article class="card">
            <h2>Tips for passengers</h2>
            <ol class="tips">
              <li>Save your route once (source + destination).</li>
              <li>Find ride → accept match → confirm.</li>
              <li>Use Safety for women-only and SOS on active rides.</li>
            </ol>
          </article>
        </section>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 1100px; margin: 0 auto; padding: 0.5rem 0 2rem; }
    .hero {
      display: flex; flex-wrap: wrap; justify-content: space-between; gap: 1rem;
      padding: 1.4rem 1.5rem; border-radius: 1.25rem; margin-bottom: 1.25rem;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .hero.driver { background: linear-gradient(135deg, rgba(91,140,255,0.2), rgba(15,23,42,0.9)); }
    .hero.passenger { background: linear-gradient(135deg, rgba(124,92,255,0.22), rgba(15,23,42,0.9)); }
    .eyebrow { margin: 0; font-size: 0.72rem; letter-spacing: 0.12em; color: #93c5fd; font-weight: 700; }
    .hero.passenger .eyebrow { color: #c4b5fd; }
    h1 { margin: 0.25rem 0; font-size: 1.65rem; }
    .sub { margin: 0; color: #94a3b8; max-width: 36rem; font-size: 0.92rem; }
    .hero-actions { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
    .btn {
      display: inline-flex; align-items: center; padding: 0.55rem 1rem; border-radius: 999px;
      font-weight: 600; font-size: 0.88rem; text-decoration: none; border: none; cursor: pointer;
    }
    .btn.primary { background: linear-gradient(135deg,#5b8cff,#7c5cff); color: #fff; }
    .btn.ghost { background: rgba(255,255,255,0.06); color: #e2e8f0; border: 1px solid rgba(255,255,255,0.12); }
    .btn.sm { margin-top: 0.65rem; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 1rem; }
    .span2 { grid-column: span 2; }
    @media (max-width: 800px) {
      .grid { grid-template-columns: 1fr; }
      .span2 { grid-column: span 1; }
    }
    .card {
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
      border-radius: 1.1rem; padding: 1.15rem 1.2rem;
    }
    .card.accent { background: linear-gradient(160deg, rgba(124,92,255,0.18), rgba(255,255,255,0.03)); }
    .card-top { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
    h2 { margin: 0 0 0.65rem; font-size: 1rem; }
    .muted { color: #94a3b8; font-size: 0.88rem; margin: 0; }
    .pill {
      font-size: 0.75rem; padding: 0.25rem 0.65rem; border-radius: 999px;
      background: rgba(248,113,113,0.15); color: #fca5a5; border: 1px solid rgba(248,113,113,0.3);
    }
    .pill.on { background: rgba(52,211,153,0.15); color: #6ee7b7; border-color: rgba(52,211,153,0.35); }
    .kv { list-style: none; padding: 0; margin: 0.5rem 0; }
    .kv li { display: flex; justify-content: space-between; padding: 0.35rem 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 0.88rem; }
    .kv span { color: #94a3b8; }
    .row { padding: 0.45rem 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .row strong { display: block; font-size: 0.9rem; }
    .row span { font-size: 0.8rem; color: #94a3b8; }
    .ride-row {
      display: flex; justify-content: space-between; gap: 0.75rem; align-items: center;
      padding: 0.65rem 0; border-bottom: 1px solid rgba(255,255,255,0.06);
      text-decoration: none; color: inherit;
    }
    .ride-row strong { display: block; font-size: 0.9rem; }
    .ride-row span { font-size: 0.8rem; color: #94a3b8; }
    .ride-row em { font-style: normal; font-size: 0.78rem; color: #93c5fd; }
    .link { color: #93c5fd; font-size: 0.85rem; text-decoration: none; }
    .actions { display: flex; flex-wrap: wrap; gap: 0.45rem; }
    .chip {
      padding: 0.4rem 0.75rem; border-radius: 999px; font-size: 0.8rem;
      background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
      color: #e2e8f0; text-decoration: none;
    }
    .tips { margin: 0; padding-left: 1.1rem; color: #cbd5e1; font-size: 0.88rem; }
    .tips li { margin-bottom: 0.35rem; }
  `]
})
export class DashboardHomeComponent implements OnInit {
  private auth = inject(AuthService);
  private driverApi = inject(DriverService);
  private vehicleApi = inject(VehicleService);
  private routeApi = inject(RouteService);
  private rideApi = inject(RideService);
  private requestApi = inject(RideRequestService);

  driverProfile = signal<DriverProfile | null>(null);
  vehicles = signal<Vehicle[]>([]);
  routes = signal<RouteDto[]>([]);
  requests = signal<RideRequestDto[]>([]);
  allRides = signal<RideDto[]>([]);

  isDriver = computed(() => this.auth.hasRole('Driver') || this.auth.hasRole('Admin'));
  firstName = computed(() => {
    try {
      const u = JSON.parse(localStorage.getItem('rs_user') || '{}');
      return u.firstName || u.FirstName || 'there';
    } catch { return 'there'; }
  });

  driverRides = computed(() => {
    const uid = this.userId();
    return this.allRides().filter(r =>
      !['Completed', 'Cancelled'].includes(r.status) &&
      r.participants?.some(p => p.role === 'Driver' && p.userId === uid)
    );
  });

  passengerRides = computed(() => {
    const uid = this.userId();
    return this.allRides().filter(r =>
      !['Completed', 'Cancelled'].includes(r.status) &&
      r.participants?.some(p => p.role === 'Passenger' && p.userId === uid)
    );
  });

  private userId(): string {
    try { return JSON.parse(localStorage.getItem('rs_user') || '{}').id || ''; }
    catch { return ''; }
  }

  ngOnInit(): void {
    this.routeApi.getMyRoutes().pipe(catchError(() => of(null))).subscribe(r => {
      if (r?.success && r.data) this.routes.set(r.data);
    });
    this.rideApi.getMy().pipe(catchError(() => of(null))).subscribe(r => {
      if (r?.success && r.data) this.allRides.set(r.data);
    });

    if (this.isDriver()) {
      this.driverApi.getMe().pipe(catchError(() => of(null))).subscribe(r => {
        if (r?.success && r.data) this.driverProfile.set(r.data);
      });
      this.vehicleApi.getMyVehicles().pipe(catchError(() => of(null))).subscribe(r => {
        if (r?.success && r.data) this.vehicles.set(r.data);
      });
    } else {
      this.requestApi.getMy().pipe(catchError(() => of(null))).subscribe(r => {
        if (r?.success && r.data) this.requests.set(r.data);
      });
    }
  }
}
