import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RideRequestService, RideRequestDto, MatchResultDto } from '../../core/services/ride-request.service';
import { RideService } from '../../core/services/ride.service';

@Component({
  selector: 'app-match-results',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page">
      <header class="head">
        <h1>Matches</h1>
        <a routerLink="/app/rides/find" class="back">Find again</a>
      </header>

      @if (request()) {
        <div class="summary">
          <strong>{{ request()!.sourceAddress }} → {{ request()!.destinationAddress }}</strong>
          <span>{{ request()!.travelDate }} · {{ request()!.preferredDepartureTime }} · ±{{ request()!.timeToleranceMinutes }}m</span>
        </div>
      }

      @if (error()) { <div class="alert">{{ error() }}</div> }
      @if (message()) { <div class="ok">{{ message() }}</div> }

      <div class="toolbar">
        <button type="button" class="btn ghost" (click)="rematch()" [disabled]="loading()">
          {{ loading() ? 'Matching…' : 'Re-run matching' }}
        </button>
      </div>

      @if (loading() && !matches().length) {
        <p class="muted">Finding drivers…</p>
      } @else if (!matches().length) {
        <div class="card empty">
          <p>No matches found.</p>
          <p class="muted">Check driver is Available, has a vehicle, and a similar active route/time.</p>
        </div>
      } @else {
        @for (m of matches(); track m.matchId) {
          <article class="card">
            <div class="score">Score {{ m.matchScore | number:'1.0-1' }}</div>
            <h2>{{ m.matchedUserName || 'Driver' }}</h2>
            <p class="meta">{{ m.vehicleInfo || 'Vehicle' }}@if (m.seatingCapacity) { · {{ m.seatingCapacity }} seats}</p>
            <p class="meta">{{ m.matchedRouteSource || '—' }} → {{ m.matchedRouteDestination || '—' }}</p>
            <p class="meta">{{ m.matchedDepartureTime || '—' }}</p>
            @if (m.scoreBreakdown) {
              <p class="reasons">{{ m.scoreBreakdown }}</p>
            }
            <p class="status">{{ m.status }}@if (m.isVerified) { · Verified}</p>
            <div class="actions">
              @if (m.status === 'Pending' || m.status === 'pending') {
                <button type="button" class="btn" (click)="respond(m, true)">Accept</button>
                <button type="button" class="btn ghost" (click)="respond(m, false)">Reject</button>
              }
            </div>
          </article>
        }
      }
    </div>
  `,
  styles: [`
    .page { max-width: 480px; margin: 0 auto; padding: 0 0 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
    .head { display: flex; justify-content: space-between; align-items: center; }
    h1 { margin: 0; font-size: 1.35rem; font-weight: 800; }
    h2 { margin: 0.25rem 0; font-size: 1.05rem; }
    .back { color: #93c5fd; text-decoration: none; font-size: 0.85rem; }
    .summary {
      padding: 0.85rem 1rem; border-radius: 1rem;
      background: rgba(91,140,255,0.12); border: 1px solid rgba(91,140,255,0.25);
    }
    .summary strong { display: block; font-size: 0.9rem; }
    .summary span { font-size: 0.8rem; color: #94a3b8; }
    .toolbar { display: flex; }
    .card {
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 1.1rem; padding: 1rem 1.1rem;
    }
    .empty { text-align: center; }
    .score {
      display: inline-block; font-size: 0.72rem; font-weight: 700;
      padding: 0.2rem 0.55rem; border-radius: 999px;
      background: rgba(124,92,255,0.2); color: #c4b5fd;
    }
    .meta { margin: 0.2rem 0; font-size: 0.82rem; color: #94a3b8; }
    .reasons { margin: 0.4rem 0 0; font-size: 0.78rem; color: #93c5fd; }
    .status { margin: 0.4rem 0 0; font-size: 0.8rem; color: #cbd5e1; }
    .actions { display: flex; gap: 0.5rem; margin-top: 0.85rem; }
    .btn {
      flex: 1; min-height: 44px; border: none; border-radius: 999px;
      font-weight: 700; color: #fff; cursor: pointer;
      background: linear-gradient(135deg,#5b8cff,#7c5cff);
    }
    .btn.ghost {
      background: transparent; border: 1px solid rgba(255,255,255,0.15); color: #e2e8f0;
    }
    .btn:disabled { opacity: 0.55; }
    .alert { padding: 0.7rem; border-radius: 0.65rem; background: rgba(248,113,113,0.12); color: #fca5a5; }
    .ok { padding: 0.7rem; border-radius: 0.65rem; background: rgba(52,211,153,0.12); color: #6ee7b7; }
    .muted { color: #94a3b8; font-size: 0.85rem; }
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
        else this.error.set(res.message || 'Failed to load matches');
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
    this.error.set('');
    this.rideService.runMatch(this.requestId).subscribe({
      next: res => {
        this.loading.set(false);
        if (res.success && res.data) {
          this.matches.set(res.data);
          this.message.set(res.message || 'Matching complete');
        } else this.error.set(res.message || 'Matching failed');
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
              if (rideRes.success && rideRes.data) {
                window.location.href = '/app/rides/lifecycle/' + rideRes.data.id;
              } else {
                this.message.set((res.message || 'Accepted') + ' — ' + (rideRes.message || ''));
                this.load();
              }
            },
            error: () => this.load()
          });
        } else this.load();
      },
      error: err => this.error.set(err.error?.message || 'Failed')
    });
  }
}
