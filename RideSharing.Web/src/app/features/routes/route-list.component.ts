import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-route-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="rs-page">
      <header class="head">
        <div>
          <div class="chips">
            <span class="chip">Daily Repeat Routes</span>
            <span class="chip gold">Core Commuter Schedule</span>
          </div>
          <h1>My Routes</h1>
          <p class="sub">Automated schedule for university and office corridors in Pakistan.</p>
        </div>
        <a routerLink="/app/routes/add" class="btn primary">+ Publish Repeat Route</a>
      </header>

      @if (err()) { <p class="err">{{ err() }}</p> }
      @if (loading()) { <p class="muted">Loading routes…</p> }

      <div class="grid">
        @for (r of routes(); track r.id) {
          <article class="card">
            <div class="top">
              <span class="badge">{{ roleBadge(r) }}</span>
              <span class="id">ID: {{ shortId(r.id) }}</span>
              <span class="fare">{{ fareLabel(r) }}</span>
            </div>
            <h2>{{ r.sourceAddress || 'Source' }} → {{ r.destinationAddress || 'Destination' }}</h2>
            <div class="stops">
              <div class="stop"><span class="g"></span>{{ r.sourceAddress || '—' }}</div>
              <div class="stop"><span class="d"></span>{{ r.destinationAddress || '—' }}</div>
            </div>
            <p class="time">
              🕒 {{ formatTime(r.preferredDepartureTime) }}
              · ±{{ r.maximumTimeToleranceMinutes ?? r.timeToleranceMinutes ?? 15 }} min
            </p>
            <div class="days">
              @for (day of week; track day.key) {
                <span class="day" [class.on]="isDayOn(r, day.key)">{{ day.label }}</span>
              }
            </div>
            <div class="actions">
              <a class="link" [routerLink]="['/app/routes/edit', r.id]">Edit</a>
              <button type="button" class="link danger" (click)="remove(r)">Delete</button>
            </div>
          </article>
        } @empty {
          @if (!loading()) {
            <div class="empty card">
              <h3>No routes yet</h3>
              <p class="muted">Publish your home → campus / office corridor once. Matching uses it every day.</p>
              <a routerLink="/app/routes/add" class="btn primary">Publish route</a>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 1rem; margin-bottom: 1.1rem; }
    .chips { display: flex; gap: 0.4rem; margin-bottom: 0.4rem; flex-wrap: wrap; }
    .chip {
      font-size: 0.72rem; font-weight: 800; padding: 0.28rem 0.7rem; border-radius: 999px;
      background: #e8f8f1; color: #0b7f58;
    }
    .chip.gold { background: #fff7cc; color: #a16207; }
    h1 { margin: 0; font-size: 1.45rem; font-weight: 800; color: #0f172a; }
    .sub { margin: 0.3rem 0 0; color: #64748b; font-size: 0.9rem; }
    .btn {
      display: inline-flex; align-items: center; min-height: 44px; padding: 0.5rem 1.1rem;
      border-radius: 999px; font-weight: 800; font-size: 0.88rem; text-decoration: none; border: none; cursor: pointer;
    }
    .btn.primary { background: #0d9f6e; color: #fff; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; }
    @media (max-width: 860px) { .grid { grid-template-columns: 1fr; } }
    .card {
      background: #fff; border: 1px solid #b7ebc9; border-radius: 16px; padding: 1.1rem 1.15rem;
      box-shadow: 0 6px 18px rgba(15,23,42,0.04);
    }
    .top { display: flex; flex-wrap: wrap; align-items: center; gap: 0.45rem; margin-bottom: 0.45rem; }
    .badge {
      font-size: 0.68rem; font-weight: 800; padding: 0.22rem 0.55rem; border-radius: 999px;
      background: #e8f8f1; color: #0b7f58;
    }
    .id { font-size: 0.75rem; color: #94a3b8; margin-right: auto; }
    .fare { font-weight: 800; color: #0d9f6e; font-size: 0.95rem; }
    h2 { margin: 0 0 0.55rem; font-size: 1.05rem; font-weight: 800; color: #0f172a; line-height: 1.35; }
    .stops { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 0.5rem; }
    .stop { display: flex; align-items: flex-start; gap: 0.45rem; font-size: 0.88rem; color: #334155; }
    .g, .d { width: 10px; height: 10px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }
    .g { background: #0d9f6e; }
    .d { background: #e11d48; }
    .time { margin: 0 0 0.65rem; font-size: 0.85rem; color: #64748b; }
    .days { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-bottom: 0.75rem; }
    .day {
      width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center;
      font-size: 0.7rem; font-weight: 800; background: #f1f5f9; color: #94a3b8;
    }
    .day.on { background: #0d9f6e; color: #fff; }
    .actions { display: flex; gap: 0.85rem; }
    .link {
      background: none; border: none; color: #0d9f6e; font-weight: 700; font-size: 0.85rem;
      cursor: pointer; padding: 0; text-decoration: none;
    }
    .link.danger { color: #e11d48; }
    .empty { text-align: center; padding: 2rem 1rem; grid-column: 1 / -1; }
    .muted { color: #64748b; }
    .err { color: #e11d48; }
  `]
})
export class RouteListComponent implements OnInit {
  private http = inject(HttpClient);
  private api = (environment.apiUrl || '/api/v1').replace(/\/$/, '');

  routes = signal<any[]>([]);
  loading = signal(true);
  err = signal('');

  week = [
    { key: 'monday', label: 'M' },
    { key: 'tuesday', label: 'T' },
    { key: 'wednesday', label: 'W' },
    { key: 'thursday', label: 'T' },
    { key: 'friday', label: 'F' },
    { key: 'saturday', label: 'S' },
    { key: 'sunday', label: 'S' }
  ];

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.http.get<any>(`${this.api}/routes/my`).subscribe({
      next: (r) => {
        const data = r?.data ?? r;
        this.routes.set(Array.isArray(data) ? data : data?.items ?? []);
        this.loading.set(false);
      },
      error: (e) => {
        this.err.set(e.error?.message || 'Could not load routes');
        this.loading.set(false);
      }
    });
  }

  isDayOn(r: any, key: string): boolean {
    const sched = r.schedules || r.rideSchedules || r.days || [];
    if (Array.isArray(sched) && sched.length && typeof sched[0] === 'object') {
      return sched.some((s: any) =>
        s[key] === true || s.dayOfWeek === key ||
        String(s.day || s.dayName || '').toLowerCase() === key
      );
    }
    if (r[key] === true) return true;
    // default weekdays highlight if no schedule data
    if (!sched.length && !r.monday && ['monday','tuesday','wednesday','thursday','friday'].includes(key)) {
      return true;
    }
    return !!r[key];
  }

  roleBadge(r: any): string {
    return r.roleLabel || r.routeType || 'ROUTE';
  }

  shortId(id: string): string {
    if (!id) return '—';
    return id.length > 8 ? id.slice(0, 8) : id;
  }

  fareLabel(r: any): string {
    if (r.estimatedFare != null) return `Rs. ${r.estimatedFare}`;
    return 'Corridor';
  }

  formatTime(t?: string): string {
    if (!t) return '—';
    if (/^\d{2}:\d{2}/.test(t)) return t.slice(0, 5);
    return t;
  }

  remove(r: any): void {
    if (!confirm('Delete this route?')) return;
    this.http.delete(`${this.api}/routes/${r.id}`).subscribe({
      next: () => this.load(),
      error: (e) => this.err.set(e.error?.message || 'Delete failed')
    });
  }
}
