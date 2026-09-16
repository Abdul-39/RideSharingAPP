import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RideRequestDto, RideRequestService } from '../../core/services/ride-request.service';

@Component({
  selector: 'app-ride-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page">
      <div class="wrap">
        <div class="header">
          <h2>My Ride Requests</h2>
          <div>
            <a routerLink="/app/rides/find" class="btn primary">Find Ride</a>
            <a routerLink="/" class="btn ghost">Home</a>
          </div>
        </div>
        @if (error()) { <div class="alert">{{ error() }}</div> }
        @if (loading()) { <p class="muted">Loading...</p> }
        @else if (items().length === 0) {
          <p class="muted">No ride requests yet.</p>
        } @else {
          <div class="grid">
            @for (r of items(); track r.id) {
              <div class="card">
                <h3>{{ r.sourceAddress }} → {{ r.destinationAddress }}</h3>
                <p class="meta">{{ r.travelDate }} · {{ r.preferredDepartureTime }} · {{ r.seatsNeeded }} seat(s)</p>
                <p class="meta">Pref: {{ r.genderPreference }} · ±{{ r.timeToleranceMinutes }}m</p>
                <p class="badge">{{ r.status }} · {{ r.matchCount }} matches</p>
                <div class="row">
                  <a [routerLink]="['/rides', r.id, 'matches']" class="btn small">Matches</a>
                  @if (r.status !== 'Cancelled' && r.status !== 'Completed') {
                    <button class="btn small danger" (click)="cancel(r)">Cancel</button>
                  }
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
    .btn { padding:0.5rem 1rem; border-radius:999px; border:none; cursor:pointer; font-weight:500; color:#fff; text-decoration:none; display:inline-block; margin-left:0.35rem; }
    .btn.primary { background:#2563eb; }
    .btn.ghost { background:transparent; border:1px solid rgba(255,255,255,0.3); }
    .btn.small { padding:0.35rem 0.75rem; font-size:0.8rem; background:rgba(255,255,255,0.1); }
    .btn.danger { background:rgba(239,68,68,0.35); }
    .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:1rem; }
    .card { background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.12); border-radius:1rem; padding:1.25rem; }
    .meta, .muted { color:#94a3b8; font-size:0.85rem; }
    .badge { display:inline-block; margin:0.5rem 0; padding:0.15rem 0.6rem; border-radius:999px; background:rgba(59,130,246,0.3); font-size:0.75rem; }
    .row { display:flex; gap:0.5rem; margin-top:0.5rem; }
    .alert { background:rgba(239,68,68,0.2); border:1px solid #ef4444; color:#fca5a5; padding:0.75rem; border-radius:0.5rem; }
  `]
})
export class RideListComponent implements OnInit {
  private rideService = inject(RideRequestService);
  items = signal<RideRequestDto[]>([]);
  loading = signal(true);
  error = signal('');

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.rideService.getMy().subscribe({
      next: res => {
        this.loading.set(false);
        if (res.success && res.data) this.items.set(res.data);
        else this.error.set(res.message);
      },
      error: err => { this.loading.set(false); this.error.set(err.error?.message || 'Failed'); }
    });
  }

  cancel(r: RideRequestDto): void {
    if (!confirm('Cancel this ride request?')) return;
    this.rideService.cancel(r.id).subscribe({
      next: res => { if (res.success) this.load(); else this.error.set(res.message); },
      error: err => this.error.set(err.error?.message || 'Cancel failed')
    });
  }
}
