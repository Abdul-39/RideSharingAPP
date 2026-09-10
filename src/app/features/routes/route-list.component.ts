import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RouteDto, RouteService } from '../../core/services/route.service';

@Component({
  selector: 'app-route-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page">
      <div class="wrap">
        <div class="header">
          <h2>My Routes</h2>
          <div class="actions">
            <a routerLink="/routes/add" class="btn primary">+ Add Route</a>
            <a routerLink="/" class="btn ghost">Home</a>
          </div>
        </div>
        @if (error()) { <div class="alert">{{ error() }}</div> }
        @if (loading()) { <p class="muted">Loading...</p> }
        @else if (routes().length === 0) {
          <p class="muted">No routes yet. Create your daily commute route.</p>
        } @else {
          <div class="grid">
            @for (r of routes(); track r.id) {
              <div class="card">
                <h3>{{ r.sourceAddress }}</h3>
                <p class="arrow">↓</p>
                <h3>{{ r.destinationAddress }}</h3>
                <p class="meta">Departure {{ r.preferredDepartureTime }} · ±{{ r.maximumTimeToleranceMinutes }} min</p>
                <p class="days">{{ formatDays(r) }}</p>
                <p class="badge" [class.off]="!r.isActive">{{ r.isActive ? 'Active' : 'Inactive' }}</p>
                <div class="row">
                  <a [routerLink]="['/routes/edit', r.id]" class="btn small">Edit</a>
                  <button class="btn small danger" (click)="remove(r)">Delete</button>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .page { min-height:100vh; background:linear-gradient(135deg,#0f172a,#1e3a8a); padding:2rem 1rem; color:#fff; }
    .wrap { max-width:960px; margin:0 auto; }
    .header { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-bottom:1.5rem; }
    .actions { display:flex; gap:0.5rem; }
    .btn { padding:0.5rem 1rem; border-radius:999px; border:none; cursor:pointer; font-weight:500; text-decoration:none; display:inline-block; font-size:0.9rem; color:#fff; }
    .btn.primary { background:#2563eb; }
    .btn.ghost { background:transparent; border:1px solid rgba(255,255,255,0.3); }
    .btn.small { padding:0.35rem 0.75rem; font-size:0.8rem; background:rgba(255,255,255,0.1); }
    .btn.danger { background:rgba(239,68,68,0.35); }
    .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:1rem; }
    .card { background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.12); border-radius:1rem; padding:1.25rem; }
    .card h3 { margin:0; font-size:1rem; }
    .arrow { color:#60a5fa; margin:0.25rem 0; }
    .meta, .days, .muted { color:#94a3b8; font-size:0.85rem; margin:0.35rem 0; }
    .badge { display:inline-block; padding:0.15rem 0.6rem; border-radius:999px; background:rgba(34,197,94,0.25); font-size:0.75rem; }
    .badge.off { background:rgba(148,163,184,0.3); }
    .row { display:flex; gap:0.5rem; margin-top:0.75rem; }
    .alert { background:rgba(239,68,68,0.2); border:1px solid #ef4444; color:#fca5a5; padding:0.75rem; border-radius:0.5rem; margin-bottom:1rem; }
  `]
})
export class RouteListComponent implements OnInit {
  private routeService = inject(RouteService);
  routes = signal<RouteDto[]>([]);
  loading = signal(true);
  error = signal('');

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.routeService.getMyRoutes().subscribe({
      next: res => {
        this.loading.set(false);
        if (res.success && res.data) this.routes.set(res.data);
        else this.error.set(res.message);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Failed to load routes');
      }
    });
  }

  formatDays(r: RouteDto): string {
    const s = r.schedules?.[0];
    if (!s) return 'No schedule';
    const days = [
      s.monday && 'Mon', s.tuesday && 'Tue', s.wednesday && 'Wed',
      s.thursday && 'Thu', s.friday && 'Fri', s.saturday && 'Sat', s.sunday && 'Sun'
    ].filter(Boolean);
    return days.length ? days.join(', ') : 'No days';
  }

  remove(r: RouteDto): void {
    if (!confirm(`Delete route ${r.sourceAddress} → ${r.destinationAddress}?`)) return;
    this.routeService.delete(r.id).subscribe({
      next: res => { if (res.success) this.load(); else this.error.set(res.message); },
      error: err => this.error.set(err.error?.message || 'Delete failed')
    });
  }
}
