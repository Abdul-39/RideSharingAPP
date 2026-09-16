import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

type Tab = 'upcoming' | 'active' | 'history';

@Component({
  selector: 'app-ride-lifecycle-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="rs-page">
      <header class="head">
        <div>
          <div class="chips">
            <span class="chip">Ride Lifecycle</span>
            <span class="chip gold">PIN OTP Protected</span>
          </div>
          <h1>My Rides &amp; Lifecycle</h1>
          <p class="sub">Upcoming schedules, active transit cockpit, and completed commute history.</p>
        </div>
        <a routerLink="/app/rides/find" class="btn primary">Find Ride</a>
      </header>

      <div class="tabs">
        <button type="button" [class.on]="tab()==='upcoming'" (click)="tab.set('upcoming')">
          Upcoming <span class="n">{{ upcoming().length }}</span>
        </button>
        <button type="button" [class.on]="tab()==='active'" (click)="tab.set('active')">
          Active <span class="n">{{ active().length }}</span>
        </button>
        <button type="button" [class.on]="tab()==='history'" (click)="tab.set('history')">
          History <span class="n">{{ history().length }}</span>
        </button>
      </div>

      @if (err()) { <p class="err">{{ err() }}</p> }
      @if (loading()) { <p class="muted">Loading rides…</p> }

      <div class="list">
        @for (r of visible(); track r.id) {
          <article class="card" [class.active-card]="isActiveStatus(r.status)">
            <div class="top">
              <span class="status" [attr.data-s]="r.status">{{ prettyStatus(r.status) }}</span>
              <span class="id">Ride #{{ shortId(r.id) }}</span>
              @if (r.startPin || r.otp || r.tripPin) {
                <span class="otp">PIN {{ r.startPin || r.otp || r.tripPin }}</span>
              }
            </div>
            <h2>{{ src(r) }} → {{ dst(r) }}</h2>
            <p class="meta">
              {{ formatWhen(r) }}
              @if (r.fare != null) { · Rs. {{ r.fare }} }
            </p>
            <div class="actions">
              <a class="btn primary" [routerLink]="['/app/rides/lifecycle', r.id]">Open details</a>
              <a class="btn ghost" routerLink="/app/chat" [queryParams]="{ rideId: r.id }">Chat</a>
              @if (isActiveStatus(r.status)) {
                <a class="btn danger" routerLink="/app/safety">SOS</a>
              }
            </div>
          </article>
        } @empty {
          @if (!loading()) {
            <div class="empty card">
              <h3>No rides in this tab</h3>
              <p class="muted">Create a request from Find Ride or wait for a match confirmation.</p>
              <a routerLink="/app/rides/find" class="btn primary">Find Ride</a>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
    .chips { display: flex; gap: 0.35rem; flex-wrap: wrap; margin-bottom: 0.35rem; }
    .chip {
      font-size: 0.72rem; font-weight: 800; padding: 0.25rem 0.65rem; border-radius: 999px;
      background: #e8f8f1; color: #0b7f58;
    }
    .chip.gold { background: #fff7cc; color: #a16207; }
    h1 { margin: 0; font-size: 1.45rem; font-weight: 800; }
    .sub { margin: 0.3rem 0 0; color: #64748b; font-size: 0.9rem; }
    .tabs {
      display: flex; gap: 0.35rem; background: #fff; border: 1px solid #e2e8f0;
      border-radius: 999px; padding: 0.3rem; margin-bottom: 1rem; width: fit-content; flex-wrap: wrap;
    }
    .tabs button {
      border: none; background: transparent; padding: 0.45rem 0.95rem; border-radius: 999px;
      font-weight: 800; font-size: 0.85rem; color: #64748b; cursor: pointer;
    }
    .tabs button.on { background: #0d9f6e; color: #fff; }
    .tabs .n {
      display: inline-grid; place-items: center; min-width: 1.25rem; height: 1.25rem;
      margin-left: 0.25rem; border-radius: 999px; background: rgba(0,0,0,0.08);
      font-size: 0.7rem;
    }
    .tabs button.on .n { background: rgba(255,255,255,0.25); }
    .list { display: flex; flex-direction: column; gap: 0.75rem; }
    .card {
      background: #fff; border: 1px solid #b7ebc9; border-radius: 16px; padding: 1.1rem 1.15rem;
      box-shadow: 0 6px 18px rgba(15,23,42,0.04);
    }
    .active-card {
      border-color: #f5d76e;
      background: linear-gradient(90deg, #fff 0%, #fffdf3 100%);
    }
    .top { display: flex; flex-wrap: wrap; align-items: center; gap: 0.45rem; margin-bottom: 0.4rem; }
    .status {
      font-size: 0.72rem; font-weight: 800; padding: 0.25rem 0.65rem; border-radius: 999px;
      background: #e8f8f1; color: #0b7f58;
    }
    .id { font-size: 0.78rem; color: #94a3b8; margin-right: auto; }
    .otp {
      font-weight: 800; font-size: 0.8rem; padding: 0.3rem 0.7rem; border-radius: 10px;
      background: #fff7cc; color: #92400e; border: 1px solid #f5d76e; letter-spacing: 0.08em;
    }
    h2 { margin: 0 0 0.3rem; font-size: 1.05rem; font-weight: 800; color: #0f172a; }
    .meta { margin: 0 0 0.75rem; color: #64748b; font-size: 0.88rem; }
    .actions { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .btn {
      display: inline-flex; align-items: center; justify-content: center; min-height: 42px;
      padding: 0.45rem 1rem; border-radius: 999px; font-weight: 800; font-size: 0.85rem;
      text-decoration: none; border: none; cursor: pointer;
    }
    .btn.primary { background: #0d9f6e; color: #fff; }
    .btn.ghost { background: #fff; border: 1px solid #e2e8f0; color: #0f172a; }
    .btn.danger { background: #e11d48; color: #fff; }
    .empty { text-align: center; padding: 2rem 1rem; }
    .muted { color: #64748b; } .err { color: #e11d48; }
  `]
})
export class RideLifecycleListComponent implements OnInit {
  private http = inject(HttpClient);
  private api = (environment.apiUrl || '/api/v1').replace(/\/$/, '');

  rides = signal<any[]>([]);
  loading = signal(true);
  err = signal('');
  tab = signal<Tab>('active');

  private activeSet = new Set([
    'confirmed', 'driverarriving', 'driverarrived', 'inprogress',
    'matched', 'matching'
  ]);
  private histSet = new Set(['completed', 'cancelled', 'canceled']);

  upcoming = computed(() =>
    this.rides().filter((r) => {
      const s = String(r.status || '').toLowerCase();
      return s === 'requested' || s === 'matched' || s === 'confirmed';
    })
  );
  active = computed(() =>
    this.rides().filter((r) => this.isActiveStatus(r.status))
  );
  history = computed(() =>
    this.rides().filter((r) => this.histSet.has(String(r.status || '').toLowerCase()))
  );
  visible = computed(() => {
    const t = this.tab();
    if (t === 'upcoming') return this.upcoming();
    if (t === 'history') return this.history();
    return this.active();
  });

  ngOnInit(): void {
    this.http.get<any>(`${this.api}/rides/my`).subscribe({
      next: (r) => {
        const data = r?.data ?? r;
        this.rides.set(Array.isArray(data) ? data : data?.items ?? []);
        this.loading.set(false);
        if (this.active().length) this.tab.set('active');
        else if (this.upcoming().length) this.tab.set('upcoming');
        else this.tab.set('history');
      },
      error: (e) => {
        this.err.set(e.error?.message || 'Could not load rides');
        this.loading.set(false);
      }
    });
  }

  isActiveStatus(status?: string): boolean {
    const s = String(status || '').toLowerCase().replace(/\s/g, '');
    return this.activeSet.has(s) || s === 'driverarriving' || s === 'driverarrived';
  }

  prettyStatus(s?: string): string {
    if (!s) return 'Unknown';
    return String(s).replace(/([a-z])([A-Z])/g, '$1 $2');
  }

  shortId(id?: string): string {
    if (!id) return '—';
    return id.length > 8 ? id.slice(0, 8) : id;
  }

  src(r: any): string {
    return r.sourceAddress || r.routeSource || r.route?.sourceAddress || 'Source';
  }
  dst(r: any): string {
    return r.destinationAddress || r.routeDestination || r.route?.destinationAddress || 'Destination';
  }

  formatWhen(r: any): string {
    const t = r.scheduledAt || r.departureTime || r.preferredDepartureTime || r.createdAt;
    if (!t) return '';
    try {
      const d = new Date(t);
      if (!isNaN(d.getTime())) return d.toLocaleString();
    } catch { /* */ }
    return String(t);
  }
}
