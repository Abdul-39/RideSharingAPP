import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { RideDto, RideService } from '../../core/services/ride.service';

@Component({
  selector: 'app-ride-lifecycle-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page">
      <div class="orb"></div>
      <div class="wrap">
        <header class="head animate-in">
          <div>
            <h1>{{ title() }}</h1>
            <p>Track upcoming, active, and past rides</p>
          </div>
          <a routerLink="/" class="home">Home</a>
        </header>

        <div class="tabs animate-in animate-in-delay-1">
          <a routerLink="/app/rides/lifecycle" [queryParams]="{filter:'upcoming'}" class="tab" [class.on]="filter()==='upcoming'">Upcoming</a>
          <a routerLink="/app/rides/lifecycle" [queryParams]="{filter:'active'}" class="tab" [class.on]="filter()==='active'">Active</a>
          <a routerLink="/app/rides/lifecycle" [queryParams]="{filter:'history'}" class="tab" [class.on]="filter()==='history'">History</a>
        </div>

        @if (error()) { <div class="toast err animate-in">{{ error() }}</div> }

        @if (loading()) {
          <div class="loader"><div class="spinner"></div></div>
        } @else if (!items().length) {
          <div class="empty glass animate-in">
            <div class="empty-icon">🚗</div>
            <h3>No rides here yet</h3>
            <p>When you accept a match, your rides will show up here.</p>
            <a routerLink="/app/rides/find" class="btn">Find a ride</a>
          </div>
        } @else {
          <div class="grid">
            @for (r of items(); track r.id; let i = $index) {
              <a class="ride-card glass animate-in" [style.animation-delay.ms]="i * 60"
                 [routerLink]="['/app/rides/lifecycle', r.id]">
                <div class="rc-top">
                  <span class="badge" [attr.data-s]="r.status">{{ r.status }}</span>
                  <span class="arrow">→</span>
                </div>
                <h3>{{ r.sourceAddress }}</h3>
                <p class="to">to {{ r.destinationAddress }}</p>
                <div class="meta">
                  <span>📅 {{ r.travelDate }}</span>
                  <span>🕐 {{ r.scheduledDepartureTime }}</span>
                </div>
              </a>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .page { min-height: 100vh; padding: 1.5rem 1rem 3rem; position: relative; font-family: var(--font); }
    .orb {
      position: absolute; width: 360px; height: 360px; border-radius: 50%;
      background: rgba(91,140,255,0.12); filter: blur(80px); top: -80px; left: -60px; pointer-events: none;
    }
    .wrap { max-width: 960px; margin: 0 auto; position: relative; z-index: 2; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem; gap: 1rem; }
    .head h1 { font-size: 1.75rem; font-weight: 800; letter-spacing: -0.02em; }
    .head p { color: #94a3b8; font-size: 0.9rem; margin-top: 0.25rem; }
    .home {
      padding: 0.45rem 0.9rem; border-radius: 999px; font-size: 0.85rem;
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #e2e8f0;
    }
    .tabs {
      display: inline-flex; gap: 0.35rem; padding: 0.3rem;
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
      border-radius: 999px; margin-bottom: 1.5rem;
    }
    .tab {
      padding: 0.5rem 1.1rem; border-radius: 999px; font-size: 0.85rem; font-weight: 500;
      color: #94a3b8; transition: all 0.2s;
    }
    .tab.on {
      background: linear-gradient(135deg, #5b8cff, #7c5cff); color: #fff;
      box-shadow: 0 6px 18px rgba(91,140,255,0.3);
    }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }
    .ride-card {
      display: block; padding: 1.25rem; transition: transform 0.25s, border-color 0.25s;
      text-decoration: none; color: inherit;
    }
    .ride-card:hover { transform: translateY(-4px); border-color: rgba(91,140,255,0.35); }
    .rc-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem; }
    .badge {
      font-size: 0.72rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 999px;
      background: rgba(91,140,255,0.2); color: #bfdbfe;
    }
    .badge[data-s="Completed"] { background: rgba(52,211,153,0.2); color: #6ee7b7; }
    .badge[data-s="InProgress"], .badge[data-s="DriverArriving"], .badge[data-s="DriverArrived"] {
      background: rgba(34,211,238,0.2); color: #a5f3fc;
    }
    .arrow { color: #475569; font-size: 1.1rem; transition: transform 0.2s; }
    .ride-card:hover .arrow { transform: translateX(4px); color: #5b8cff; }
    .ride-card h3 { font-size: 1.05rem; margin-bottom: 0.2rem; }
    .to { color: #94a3b8; font-size: 0.88rem; margin-bottom: 0.85rem; }
    .meta { display: flex; gap: 0.85rem; font-size: 0.8rem; color: #64748b; }
    .empty {
      text-align: center; padding: 3rem 1.5rem; max-width: 400px; margin: 2rem auto;
    }
    .empty-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
    .empty h3 { margin-bottom: 0.4rem; }
    .empty p { color: #94a3b8; font-size: 0.9rem; margin-bottom: 1.25rem; }
    .btn {
      display: inline-block; padding: 0.7rem 1.4rem; border-radius: 999px; font-weight: 600;
      background: linear-gradient(135deg, #5b8cff, #7c5cff); color: #fff;
    }
    .loader { display: flex; justify-content: center; padding: 3rem; }
    .spinner {
      width: 36px; height: 36px; border: 3px solid rgba(255,255,255,0.1);
      border-top-color: #5b8cff; border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    .toast.err {
      background: rgba(248,113,113,0.12); border: 1px solid rgba(248,113,113,0.3);
      color: #fca5a5; padding: 0.85rem; border-radius: 0.85rem; margin-bottom: 1rem;
    }
  `]
})
export class RideLifecycleListComponent implements OnInit {
  private rideService = inject(RideService);
  private route = inject(ActivatedRoute);
  items = signal<RideDto[]>([]);
  loading = signal(true);
  error = signal('');
  filter = signal('upcoming');
  title = signal('Upcoming Rides');

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(q => {
      const f = q.get('filter') || 'upcoming';
      this.filter.set(f);
      this.title.set(f === 'active' ? 'Active Rides' : f === 'history' ? 'Ride History' : 'Upcoming Rides');
      this.loading.set(true);
      this.rideService.getMy(f).subscribe({
        next: res => {
          this.loading.set(false);
          if (res.success && res.data) this.items.set(res.data);
          else this.error.set(res.message);
        },
        error: err => {
          this.loading.set(false);
          this.error.set(err.error?.message || 'Failed to load');
        }
      });
    });
  }
}
