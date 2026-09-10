import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatchResultDto, RideRequestDto, RideRequestService } from '../../core/services/ride-request.service';
import { RideService } from '../../core/services/ride.service';

@Component({
  selector: 'app-match-results',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page">
      <div class="wrap">
        <div class="header">
          <h2>Matching Results</h2>
          <a routerLink="/app/rides" class="btn ghost">My Requests</a>
        </div>

        @if (request()) {
          <div class="req">
            <strong>{{ request()!.sourceAddress }} → {{ request()!.destinationAddress }}</strong>
            <span>{{ request()!.travelDate }} · {{ request()!.preferredDepartureTime }} · ±{{ request()!.timeToleranceMinutes }}m</span>
          </div>
        }

        @if (error()) { <div class="alert">{{ error() }}</div> }
        @if (message()) { <div class="ok">{{ message() }}</div> }

        <div class="actions">
          <button class="btn primary" (click)="rematch()" [disabled]="loading()">Re-run Matching</button>
        </div>

        @if (loading()) { <p class="muted">Loading...</p> }
        @else if (matches().length === 0) {
          <p class="muted">No matches found. Try a different time or route.</p>
        } @else {
          <div class="grid">
            @for (m of matches(); track m.matchId) {
              <div class="card">
                <div class="top">
                  <h3>{{ m.matchedUserName }}</h3>
                  <span class="score">{{ m.matchScore | number:'1.0-1' }}</span>
                </div>
                @if (m.isVerified) { <span class="badge">Verified</span> }
                <p class="meta">{{ m.gender }} · {{ m.vehicleInfo || 'No vehicle info' }}</p>
                <p class="meta">Seats: {{ m.seatingCapacity ?? '—' }}</p>
                <p class="route">{{ m.matchedRouteSource }} → {{ m.matchedRouteDestination }}</p>
                <p class="meta">Departs {{ m.matchedDepartureTime }}</p>
                <p class="breakdown">{{ m.scoreBreakdown }}</p>
                <p class="status">Status: {{ m.status }}</p>
                @if (m.status === 'Pending') {
                  <div class="row">
                    <button class="btn small ok" (click)="respond(m, true)">Accept</button>
                    <button class="btn small danger" (click)="respond(m, false)">Reject</button>
                  </div>
                }
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
    .header { display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; }
    .req { background:rgba(255,255,255,0.06); padding:0.75rem 1rem; border-radius:0.75rem; margin-bottom:1rem; display:flex; flex-direction:column; gap:0.25rem; }
    .actions { margin-bottom:1rem; }
    .btn { padding:0.5rem 1rem; border-radius:999px; border:none; cursor:pointer; font-weight:500; color:#fff; text-decoration:none; display:inline-block; }
    .btn.primary { background:#2563eb; }
    .btn.ghost { background:transparent; border:1px solid rgba(255,255,255,0.3); }
    .btn.small { padding:0.35rem 0.75rem; font-size:0.8rem; }
    .btn.ok { background:rgba(34,197,94,0.4); }
    .btn.danger { background:rgba(239,68,68,0.4); }
    .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:1rem; }
    .card { background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.12); border-radius:1rem; padding:1.25rem; }
    .top { display:flex; justify-content:space-between; align-items:center; }
    .score { background:#2563eb; border-radius:999px; padding:0.2rem 0.6rem; font-weight:700; font-size:0.9rem; }
    .badge { display:inline-block; background:rgba(34,197,94,0.25); padding:0.1rem 0.5rem; border-radius:999px; font-size:0.75rem; margin:0.35rem 0; }
    .meta, .muted, .breakdown, .status { color:#94a3b8; font-size:0.85rem; margin:0.25rem 0; }
    .route { font-size:0.9rem; margin:0.4rem 0; }
    .row { display:flex; gap:0.5rem; margin-top:0.75rem; }
    .alert { background:rgba(239,68,68,0.2); border:1px solid #ef4444; color:#fca5a5; padding:0.75rem; border-radius:0.5rem; margin-bottom:1rem; }
    .ok { background:rgba(34,197,94,0.2); border:1px solid #22c55e; color:#86efac; padding:0.75rem; border-radius:0.5rem; margin-bottom:1rem; }
  `]
})
export class MatchResultsComponent implements OnInit {
  private rideService = inject(RideRequestService);
  private lifecycle = inject(RideService);
  private route = inject(ActivatedRoute);

  request = signal<RideRequestDto | null>(null);
  matches = signal<MatchResultDto[]>([]);
  loading = signal(true);
  error = signal('');
  message = signal('');
  requestId = '';

  ngOnInit(): void {
    this.requestId = this.route.snapshot.paramMap.get('id') || '';
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.rideService.getById(this.requestId).subscribe({
      next: res => { if (res.success && res.data) this.request.set(res.data); }
    });
    this.rideService.getMatches(this.requestId).subscribe({
      next: res => {
        this.loading.set(false);
        if (res.success && res.data) this.matches.set(res.data);
        else this.error.set(res.message);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Failed to load matches');
      }
    });
  }

  rematch(): void {
    this.loading.set(true);
    this.message.set('');
    this.rideService.runMatch(this.requestId).subscribe({
      next: res => {
        this.loading.set(false);
        if (res.success && res.data) {
          this.matches.set(res.data);
          this.message.set(res.message);
        } else this.error.set(res.message);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Matching failed');
      }
    });
  }

  respond(m: MatchResultDto, accept: boolean): void {
    this.rideService.respond(m.matchId, accept).subscribe({
      next: res => {
        if (!res.success) { this.error.set(res.message); return; }
        this.message.set(res.message);
        if (accept) {
          this.lifecycle.createFromMatch(m.matchId).subscribe({
            next: rideRes => {
              if (rideRes.success && rideRes.data)
                window.location.href = '/app/rides/lifecycle/' + rideRes.data.id;
              else { this.message.set(res.message + ' — ' + rideRes.message); this.load(); }
            },
            error: () => this.load()
          });
        } else this.load();
      },
      error: err => this.error.set(err.error?.message || 'Failed')
    });
  }
}
