import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-find-ride',
  standalone: true,
  imports: [CommonModule, FormsModule, ],
  template: `
    <div class="rs-page">
      <header class="head">
        <div>
          <div class="chips">
            <span class="chip">Find Daily Commute</span>
            <span class="chip gold">Save up to 60%</span>
          </div>
          <h1>Find Ride</h1>
          <p class="sub">Match daily repeat commuters &amp; verified institutional drivers.</p>
        </div>
      </header>

      <div class="layout">
        <section class="panel">
          <h2>Request a match</h2>

          <label class="lbl">Use saved route
            <select class="inp" [(ngModel)]="selectedRouteId" name="route" (ngModelChange)="onRoutePick()">
              <option value="">Select route (recommended)</option>
              @for (r of myRoutes(); track r.id) {
                <option [value]="r.id">{{ r.sourceAddress }} → {{ r.destinationAddress }}</option>
              }
            </select>
          </label>

          <label class="lbl">Pickup
            <input class="inp" [(ngModel)]="sourceAddress" name="src" placeholder="Source address" />
          </label>
          <label class="lbl">Destination
            <input class="inp" [(ngModel)]="destAddress" name="dst" placeholder="Destination address" />
          </label>

          <div class="row2">
            <label class="lbl">Date
              <input class="inp" type="date" [(ngModel)]="rideDate" name="date" />
            </label>
            <label class="lbl">Departure
              <input class="inp" type="time" [(ngModel)]="departureTime" name="time" />
            </label>
          </div>

          <div class="row2">
            <label class="lbl">Seats needed
              <select class="inp" [(ngModel)]="seats" name="seats">
                <option [ngValue]="1">1</option>
                <option [ngValue]="2">2</option>
                <option [ngValue]="3">3</option>
                <option [ngValue]="4">4</option>
              </select>
            </label>
            <label class="lbl">Gender preference
              <select class="inp" [(ngModel)]="genderPref" name="gp">
                <option value="0">Any Commuters</option>
                <option value="1">Male only</option>
                <option value="2">Female only</option>
                <option value="3">Women only</option>
              </select>
            </label>
          </div>

          @if (err()) { <p class="err">{{ err() }}</p> }
          @if (msg()) { <p class="ok">{{ msg() }}</p> }

          <button type="button" class="btn primary full" (click)="search()" [disabled]="busy()">
            ✨ Search Repeat Commuter Matches
          </button>
        </section>

        <section class="panel results">
          <div class="res-head">
            <h2>Available matches</h2>
            <span class="chip">{{ matches().length }} found</span>
          </div>

          @if (busy()) { <p class="muted">Searching…</p> }

          @for (m of matches(); track trackMatch(m)) {
            <article class="match">
              <div class="match-top">
                <div class="avatar">{{ initials(m) }}</div>
                <div class="info">
                  <strong>{{ matchName(m) }}</strong>
                  @if (m.isVerified || m.matchedUserIsVerified) {
                    <span class="chip">Verified</span>
                  }
                  <p class="muted">{{ vehicleLabel(m) }}</p>
                </div>
                <div class="score">
                  <span class="pct">{{ scoreLabel(m) }}</span>
                  <span class="muted">match</span>
                </div>
              </div>
              <p class="muted">
                Departure {{ formatTime(m.departureTime || m.preferredDepartureTime) }}
                @if (m.matchScore != null) { · score {{ m.matchScore | number:'1.0-2' }} }
              </p>
              <div class="match-actions">
                <button type="button" class="btn primary" (click)="accept(m)" [disabled]="busy()">Accept Match</button>
                <button type="button" class="btn ghost" (click)="reject(m)" [disabled]="busy()">Reject</button>
              </div>
            </article>
          } @empty {
            @if (!busy()) {
              <p class="muted">No matches yet. Select a route, set date/time, then search.</p>
            }
          }
        </section>
      </div>
    </div>
  `,
  styles: [`
    .head { margin-bottom: 1rem; }
    .chips { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0.35rem; }
    .chip {
      font-size: 0.72rem; font-weight: 800; padding: 0.25rem 0.65rem; border-radius: 999px;
      background: #e8f8f1; color: #0b7f58;
    }
    .chip.gold { background: #fff7cc; color: #a16207; }
    h1 { margin: 0; font-size: 1.45rem; font-weight: 800; }
    h2 { margin: 0 0 0.75rem; font-size: 1.05rem; font-weight: 800; }
    .sub { margin: 0.3rem 0 0; color: #64748b; font-size: 0.9rem; }
    .layout { display: grid; grid-template-columns: 1fr 1.1fr; gap: 1rem; }
    @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }
    .panel {
      background: #fff; border: 1px solid #b7ebc9; border-radius: 16px;
      padding: 1.15rem; box-shadow: 0 6px 18px rgba(15,23,42,0.04);
    }
    .lbl { display: block; margin-bottom: 0.65rem; font-size: 0.78rem; font-weight: 700; color: #64748b; }
    .inp {
      display: block; width: 100%; margin-top: 0.3rem; min-height: 44px;
      padding: 0.5rem 0.75rem; border-radius: 12px; border: 1px solid #e2e8f0;
      font-size: 0.95rem; background: #fff; color: #0f172a;
    }
    .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem; }
    @media (max-width: 500px) { .row2 { grid-template-columns: 1fr; } }
    .btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 0.35rem;
      min-height: 44px; padding: 0.5rem 1rem; border-radius: 999px; border: none;
      font-weight: 800; font-size: 0.88rem; cursor: pointer;
    }
    .btn.primary { background: #0d9f6e; color: #fff; }
    .btn.ghost { background: #fff; border: 1px solid #e2e8f0; color: #0f172a; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .full { width: 100%; margin-top: 0.35rem; }
    .res-head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.5rem; }
    .match {
      border: 1px solid #e2e8f0; border-radius: 14px; padding: 0.9rem; margin-bottom: 0.65rem;
      background: #fafdfb;
    }
    .match-top { display: flex; gap: 0.65rem; align-items: flex-start; margin-bottom: 0.35rem; }
    .avatar {
      width: 42px; height: 42px; border-radius: 999px; background: #0d9f6e; color: #fff;
      display: grid; place-items: center; font-weight: 800; flex-shrink: 0;
    }
    .info { flex: 1; min-width: 0; }
    .info strong { margin-right: 0.35rem; }
    .score { text-align: right; }
    .pct { display: block; font-weight: 800; color: #0d9f6e; font-size: 1.05rem; }
    .match-actions { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.5rem; }
    .muted { color: #64748b; font-size: 0.85rem; margin: 0.15rem 0; }
    .err { color: #e11d48; } .ok { color: #0d9f6e; }
  `]
})
export class FindRideComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private api = (environment.apiUrl || '/api/v1').replace(/\/$/, '');

  myRoutes = signal<any[]>([]);
  matches = signal<any[]>([]);
  selectedRouteId = '';
  sourceAddress = '';
  destAddress = '';
  rideDate = '';
  departureTime = '08:00';
  seats = 1;
  genderPref = '0';
  requestId = '';
  busy = signal(false);
  err = signal('');
  msg = signal('');

  ngOnInit(): void {
    const t = new Date();
    this.rideDate = t.toISOString().slice(0, 10);
    this.http.get<any>(`${this.api}/routes/my`).subscribe({
      next: (r) => {
        const data = r?.data ?? r;
        this.myRoutes.set(Array.isArray(data) ? data : data?.items ?? []);
      }
    });
  }

  onRoutePick(): void {
    const r = this.myRoutes().find((x) => String(x.id) === String(this.selectedRouteId));
    if (!r) return;
    this.sourceAddress = r.sourceAddress || '';
    this.destAddress = r.destinationAddress || '';
    if (r.preferredDepartureTime) {
      const t = String(r.preferredDepartureTime);
      this.departureTime = /^\d{2}:\d{2}/.test(t) ? t.slice(0, 5) : this.departureTime;
    }
  }

  search(): void {
    this.err.set('');
    this.msg.set('');
    if (!this.selectedRouteId) {
      this.err.set('Select a saved route from the dropdown first.');
      return;
    }

    const travelDate = this.normalizeDate(this.rideDate);
    const preferredDepartureTime = this.normalizeTime(this.departureTime);
    if (!travelDate) {
      this.err.set('Invalid date. Use a valid travel date.');
      return;
    }
    if (!preferredDepartureTime) {
      this.err.set('Invalid time. Use HH:mm (e.g. 08:00).');
      return;
    }

    this.busy.set(true);
    this.matches.set([]);

    // API CreateRideRequestDto — exact field names + enum as NUMBER
    const body = {
      routeId: this.selectedRouteId,
      travelDate,
      preferredDepartureTime,
      seatsNeeded: Number(this.seats) || 1,
      genderPreference: this.normalizeGender(this.genderPref),
      timeToleranceMinutes: 15
    };

    this.http.post<any>(`${this.api}/ride-requests`, body).subscribe({
      next: (r) => {
        if (r && r.success === false) {
          this.busy.set(false);
          this.err.set(r.message || 'Could not create ride request');
          return;
        }
        const data = r?.data ?? r;
        this.requestId = data?.id || data?.rideRequestId || '';
        this.msg.set(r?.message || 'Request created. Running matching…');
        this.runMatchThenLoad();
      },
      error: (e) => {
        this.busy.set(false);
        const p = e.error;
        let msg = p?.message || p?.title || 'Could not create ride request';
        if (p?.errors) {
          const parts: string[] = [];
          for (const k of Object.keys(p.errors)) {
            const v = p.errors[k];
            parts.push(`${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
          }
          if (parts.length) msg = parts.join(' | ');
        }
        this.err.set(msg);
      }
    });
  }

  /** yyyy-MM-dd from date input or MM/DD/YYYY */
  normalizeDate(v: string): string {
    if (!v) return '';
    v = String(v).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    const m = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) {
      const a = parseInt(m[1], 10);
      const b = parseInt(m[2], 10);
      const y = m[3];
      // If first > 12 treat as DD/MM/YYYY else assume MM/DD/YYYY (browser en-US)
      let month: number, day: number;
      if (a > 12) { day = a; month = b; }
      else { month = a; day = b; }
      return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    const d = new Date(v);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      return `${y}-${mo}-${da}`;
    }
    return '';
  }

  /** HH:mm from "08:00", "08:00:00", "08:00 AM", "8:00 PM" */
  normalizeTime(v: string): string {
    if (!v) return '';
    v = String(v).trim();
    const ampm = v.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
    if (ampm) {
      let h = parseInt(ampm[1], 10);
      const min = ampm[2];
      const ap = ampm[3].toUpperCase();
      if (ap === 'PM' && h < 12) h += 12;
      if (ap === 'AM' && h === 12) h = 0;
      return `${String(h).padStart(2, '0')}:${min}`;
    }
    const m = v.match(/^(\d{1,2}):(\d{2})/);
    if (m) return `${String(parseInt(m[1], 10)).padStart(2, '0')}:${m[2]}`;
    return '';
  }

  /** GenderPreference enum: Any=0, MaleOnly=1, FemaleOnly=2, WomenOnly=3 */
  normalizeGender(v: any): number {
    const s = String(v ?? '0').trim().toLowerCase();
    if (s === '0' || s === 'any' || s.includes('any')) return 0;
    if (s === '1' || s.includes('male only') || s === 'maleonly' || s === 'male') return 1;
    if (s === '2' || s.includes('female only') || s === 'femaleonly' || s === 'female') return 2;
    if (s === '3' || s.includes('women')) return 3;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 && n <= 3 ? n : 0;
  }

  runMatchThenLoad(): void {
    if (!this.requestId) {
      this.busy.set(false);
      return;
    }
    this.http.post<any>(`${this.api}/ride-requests/${this.requestId}/match`, {}).subscribe({
      next: (r) => {
        const data = r?.data ?? r;
        const list = Array.isArray(data) ? data : data?.matches || [];
        this.matches.set(list);
        this.busy.set(false);
        this.msg.set(
          list.length
            ? `Found ${list.length} match(es). Accept to notify the driver.`
            : (r?.message || 'No matches found. Check driver route, time ±15 min, seats, direction.')
        );
      },
      error: () => this.loadMatches()
    });
  }

  loadMatches(): void {
    if (!this.requestId) {
      this.busy.set(false);
      return;
    }
    // try common endpoints
    const urls = [
      `${this.api}/ride-requests/${this.requestId}/matches`,
      `${this.api}/rides/${this.requestId}/matches`,
      `${this.api}/matching/${this.requestId}`
    ];
    const tryUrl = (i: number) => {
      if (i >= urls.length) {
        this.busy.set(false);
        this.msg.set('Request created. Open Match Results from My Rides if list is empty.');
        return;
      }
      this.http.get<any>(urls[i]).subscribe({
        next: (r) => {
          const data = r?.data ?? r;
          const list = Array.isArray(data) ? data : data?.matches || data?.items || [];
          this.matches.set(list);
          this.busy.set(false);
          if (!list.length) this.msg.set('No matches found for this window. Try ±15 min or another route.');
        },
        error: () => tryUrl(i + 1)
      });
    };
    tryUrl(0);
  }

  
accept(m: any): void {
  const matchId = m.id || m.matchId;
  if (!matchId) return;
  this.busy.set(true);
  this.http.post<any>(`${this.api}/ride-requests/matches/${matchId}/respond`, { accept: true })
    .subscribe({
      next: (res) => {
        this.busy.set(false);
        this.msg.set(res?.message || 'Match accepted. Driver notified.');
        this.router.navigateByUrl('/app/rides/lifecycle');
      },
      error: (e) => {
        this.busy.set(false);
        this.err.set(e.error?.message || 'Accept failed');
      }
    });
}

reject(m: any): void {
  const matchId = m.id || m.matchId;
  if (!matchId) return;
  this.http.post(`${this.api}/ride-requests/matches/${matchId}/respond`, { accept: false })
    .subscribe({
      next: () => this.matches.update(list => list.filter(x => (x.id || x.matchId) !== matchId)),
      error: () => {}
    });
}


  trackMatch(m: any): string {
    return String(m.id || m.matchId || m.matchedUserId || Math.random());
  }

  matchName(m: any): string {
    return (
      m.matchedUserName ||
      m.driverName ||
      m.userName ||
      `${m.firstName || ''} ${m.lastName || ''}`.trim() ||
      'Commuter'
    );
  }

  initials(m: any): string {
    const n = this.matchName(m);
    return n.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() || '').join('') || 'C';
  }

  vehicleLabel(m: any): string {
    const v = m.vehicle || {};
    const parts = [m.vehicleLabel, v.make, v.model, v.registrationNumber || m.registrationNumber]
      .filter(Boolean);
    return parts.join(' ') || 'Vehicle details after accept';
  }

  scoreLabel(m: any): string {
    const s = m.matchScore ?? m.score;
    if (s == null) return '—';
    const n = Number(s);
    if (n <= 1) return `${Math.round(n * 100)}%`;
    if (n <= 100) return `${Math.round(n)}%`;
    return String(s);
  }

  formatTime(t?: string): string {
    if (!t) return '—';
    if (/^\d{2}:\d{2}/.test(t)) return t.slice(0, 5);
    return t;
  }
}
