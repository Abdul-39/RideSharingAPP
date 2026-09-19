import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-find-ride',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="rs-page">

      <header class="head">
        <div>
          <div class="chips">
            <span class="chip">Find Daily Commute</span>
            <span class="chip gold">Save up to 60%</span>
          </div>

          <h1>Find Ride</h1>

          <p class="sub">
            Match daily repeat commuters &amp; verified institutional drivers.
          </p>
        </div>
      </header>

      <div class="layout">

        <!-- REQUEST PANEL -->
        <section class="panel">

          <h2>Request a match</h2>

          <label class="lbl">
            Use saved route

            <select
              class="inp"
              [(ngModel)]="selectedRouteId"
              name="route"
              (ngModelChange)="onRoutePick()">

              <option value="">Select route (recommended)</option>

              @for (r of myRoutes(); track r.id) {
                <option [value]="r.id">
                  {{ r.sourceAddress }} → {{ r.destinationAddress }}
                </option>
              }

            </select>
          </label>

          <label class="lbl">
            Pickup

            <input
              class="inp"
              [(ngModel)]="sourceAddress"
              name="src"
              placeholder="Source address" />
          </label>

          <label class="lbl">
            Destination

            <input
              class="inp"
              [(ngModel)]="destAddress"
              name="dst"
              placeholder="Destination address" />
          </label>

          <div class="row2">

            <label class="lbl">
              Date

              <input
                class="inp"
                type="date"
                [(ngModel)]="rideDate"
                name="date" />
            </label>

            <label class="lbl">
              Departure

              <input
                class="inp"
                type="time"
                [(ngModel)]="departureTime"
                name="time" />
            </label>

          </div>

          <div class="row2">

            <label class="lbl">
              Seats needed

              <select
                class="inp"
                [(ngModel)]="seats"
                name="seats">

                <option [ngValue]="1">1</option>
                <option [ngValue]="2">2</option>
                <option [ngValue]="3">3</option>
                <option [ngValue]="4">4</option>

              </select>
            </label>

            <label class="lbl">
              Gender preference

              <select
                class="inp"
                [(ngModel)]="genderPref"
                name="gp">

                <option value="Any">Any Commuters</option>
                <option value="WomenOnly">Women Only</option>
                <option value="MenOnly">Men Only</option>

              </select>
            </label>

          </div>

          @if (err()) {
            <p class="err">{{ err() }}</p>
          }

          @if (msg()) {
            <p class="ok">{{ msg() }}</p>
          }

          <button
            type="button"
            class="btn primary full"
            (click)="search()"
            [disabled]="busy()">

            ✨ Search Repeat Commuter Matches

          </button>

        </section>


        <!-- RESULTS PANEL -->
        <section class="panel results">

          <div class="res-head">

            <h2>Available matches</h2>

            <span class="chip">
              {{ matches().length }} found
            </span>

          </div>

          @if (busy()) {
            <p class="muted">Searching…</p>
          }

          @for (m of matches(); track trackMatch(m)) {

            <article class="match">

              <div class="match-top">

                <div class="avatar">
                  {{ initials(m) }}
                </div>

                <div class="info">

                  <strong>
                    {{ matchName(m) }}
                  </strong>

                  @if (m.isVerified || m.matchedUserIsVerified) {
                    <span class="chip">
                      Verified
                    </span>
                  }

                  <p class="muted">
                    {{ vehicleLabel(m) }}
                  </p>

                </div>

                <div class="score">

                  <span class="pct">
                    {{ scoreLabel(m) }}
                  </span>

                  <span class="muted">
                    match
                  </span>

                </div>

              </div>

              <p class="muted">

                Departure
                {{ formatTime(m.departureTime || m.preferredDepartureTime) }}

                @if (m.matchScore != null) {
                  · score {{ m.matchScore | number:'1.0-2' }}
                }

              </p>

              @if (m.matchingMode || m.mode) {
                <p class="mode">
                  {{ m.matchingMode || m.mode }}
                </p>
              }

              @if (m.scoreBreakdown) {
                <p class="muted">
                  {{ m.scoreBreakdown }}
                </p>
              }

              <div class="match-actions">

                <button
                  type="button"
                  class="btn primary"
                  (click)="accept(m)"
                  [disabled]="busy()">

                  Accept Match

                </button>

                <button
                  type="button"
                  class="btn ghost"
                  (click)="reject(m)"
                  [disabled]="busy()">

                  Reject

                </button>

              </div>

            </article>

          } @empty {

            @if (!busy()) {

              <p class="muted">
                No matches yet. Select a route, set date/time, then search.
              </p>

            }

          }

        </section>

      </div>

    </div>
  `,

  styles: [`

    .head {
      margin-bottom: 1rem;
    }

    .chips {
      display: flex;
      gap: 0.4rem;
      flex-wrap: wrap;
      margin-bottom: 0.35rem;
    }

    .chip {
      font-size: 0.72rem;
      font-weight: 800;
      padding: 0.25rem 0.65rem;
      border-radius: 999px;
      background: #e8f8f1;
      color: #0b7f58;
    }

    .chip.gold {
      background: #fff7cc;
      color: #a16207;
    }

    h1 {
      margin: 0;
      font-size: 1.45rem;
      font-weight: 800;
    }

    h2 {
      margin: 0 0 0.75rem;
      font-size: 1.05rem;
      font-weight: 800;
    }

    .sub {
      margin: 0.3rem 0 0;
      color: #64748b;
      font-size: 0.9rem;
    }

    .layout {
      display: grid;
      grid-template-columns: 1fr 1.1fr;
      gap: 1rem;
    }

    @media (max-width: 900px) {
      .layout {
        grid-template-columns: 1fr;
      }
    }

    .panel {
      background: #fff;
      border: 1px solid #b7ebc9;
      border-radius: 16px;
      padding: 1.15rem;
      box-shadow: 0 6px 18px rgba(15,23,42,0.04);
    }

    .lbl {
      display: block;
      margin-bottom: 0.65rem;
      font-size: 0.78rem;
      font-weight: 700;
      color: #64748b;
    }

    .inp {
      display: block;
      width: 100%;
      margin-top: 0.3rem;
      min-height: 44px;
      padding: 0.5rem 0.75rem;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      font-size: 0.95rem;
      background: #fff;
      color: #0f172a;
      box-sizing: border-box;
    }

    .row2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.65rem;
    }

    @media (max-width: 500px) {
      .row2 {
        grid-template-columns: 1fr;
      }
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      min-height: 44px;
      padding: 0.5rem 1rem;
      border-radius: 999px;
      border: none;
      font-weight: 800;
      font-size: 0.88rem;
      cursor: pointer;
    }

    .btn.primary {
      background: #0d9f6e;
      color: #fff;
    }

    .btn.ghost {
      background: #fff;
      border: 1px solid #e2e8f0;
      color: #0f172a;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .full {
      width: 100%;
      margin-top: 0.35rem;
    }

    .res-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .match {
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 0.9rem;
      margin-bottom: 0.65rem;
      background: #fafdfb;
    }

    .match-top {
      display: flex;
      gap: 0.65rem;
      align-items: flex-start;
      margin-bottom: 0.35rem;
    }

    .avatar {
      width: 42px;
      height: 42px;
      border-radius: 999px;
      background: #0d9f6e;
      color: #fff;
      display: grid;
      place-items: center;
      font-weight: 800;
      flex-shrink: 0;
    }

    .info {
      flex: 1;
      min-width: 0;
    }

    .info strong {
      margin-right: 0.35rem;
    }

    .score {
      text-align: right;
    }

    .pct {
      display: block;
      font-weight: 800;
      color: #0d9f6e;
      font-size: 1.05rem;
    }

    .match-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      margin-top: 0.5rem;
    }

    .muted {
      color: #64748b;
      font-size: 0.85rem;
      margin: 0.15rem 0;
    }

    .err {
      color: #e11d48;
    }

    .ok {
      color: #0d9f6e;
    }

    .mode {
      display: inline-block;
      margin: 0.35rem 0;
      padding: 0.25rem 0.55rem;
      border-radius: 999px;
      background: #e8f8f1;
      color: #0b7f58;
      font-size: 0.72rem;
      font-weight: 800;
    }

  `]
})
export class FindRideComponent implements OnInit {

  private http = inject(HttpClient);
  private router = inject(Router);

  private api = (environment.apiUrl || '/api/v1')
    .replace(/\/$/, '');

  myRoutes = signal<any[]>([]);
  matches = signal<any[]>([]);

  selectedRouteId = '';
  sourceAddress = '';
  destAddress = '';

  rideDate = '';
  departureTime = '08:00';

  seats = 1;
  genderPref = 'Any';

  requestId = '';

  busy = signal(false);
  err = signal('');
  msg = signal('');


  // ==========================================
  // INITIAL LOAD
  // ==========================================

  ngOnInit(): void {

    const t = new Date();

    this.rideDate = t.toISOString().slice(0, 10);

    this.http
      .get<any>(`${this.api}/routes/my`)
      .subscribe({

        next: (r) => {

          const data = r?.data ?? r;

          this.myRoutes.set(
            Array.isArray(data)
              ? data
              : data?.items ?? []
          );

        },

        error: (e) => {

          console.error(
            'Failed to load saved routes:',
            e
          );

        }

      });
  }


  // ==========================================
  // SAVED ROUTE SELECT
  // ==========================================

  onRoutePick(): void {

    const r = this.myRoutes()
      .find(
        (x) =>
          String(x.id) ===
          String(this.selectedRouteId)
      );

    if (!r) {
      return;
    }

    this.sourceAddress =
      r.sourceAddress || '';

    this.destAddress =
      r.destinationAddress || '';

    if (r.preferredDepartureTime) {

      const t =
        String(r.preferredDepartureTime);

      if (/^\d{2}:\d{2}/.test(t)) {

        this.departureTime =
          t.slice(0, 5);

      }
    }
  }


  // ==========================================
  // GENDER MAPPING
  // ==========================================

  private mapGender(v: string): number {

    if (v === 'WomenOnly') {
      return 3;
    }

    if (
      v === 'MenOnly' ||
      v === 'MaleOnly'
    ) {
      return 1;
    }

    if (v === 'FemaleOnly') {
      return 2;
    }

    return 0;
  }


  // ==========================================
  // SEARCH / CREATE REQUEST
  // ==========================================

  search(): void {
  this.err.set('');
  this.msg.set('');

  if (!this.selectedRouteId) {
    this.err.set('Please select a saved route.');
    return;
  }

  this.busy.set(true);
  this.matches.set([]);

  const body: any = {
    routeId: this.selectedRouteId,
    travelDate: this.rideDate,
    preferredDepartureTime:
      this.departureTime?.length === 5
        ? this.departureTime + ':00'
        : this.departureTime,
    seatsNeeded: this.seats,
    genderPreference: this.mapGender(this.genderPref),
    timeToleranceMinutes: 15
  };

  // STEP 1: Create request
  this.http.post<any>(`${this.api}/ride-requests`, body).subscribe({

    next: (r) => {

      const data = r?.data ?? r;

      this.requestId =
        data?.id ||
        data?.rideRequestId ||
        '';

      if (!this.requestId) {
        this.busy.set(false);
        this.err.set('Ride request was created but request ID was not returned.');
        return;
      }

      this.msg.set('Request created. Loading matches...');

      // IMPORTANT:
      // POST /ride-requests already performs automatic matching.
      // DO NOT call /match again here.
      //
      // Instead load the matches that automatic matching already created.

      this.loadMatches();

    },

    error: (e) => {

      this.busy.set(false);

      this.err.set(
        e?.error?.message ||
        e?.error?.data?.message ||
        'Could not create ride request'
      );

    }

  });
}
  // ==========================================
  // RUN MATCHING
  // ==========================================

  private runMatching(): void {

    if (!this.requestId) {

      this.busy.set(false);

      this.err.set(
        'Ride request ID is missing.'
      );

      return;
    }


    console.log(
      'Running matching for:',
      this.requestId
    );


    this.http
      .post<any>(
        `${this.api}/ride-requests/${this.requestId}/match`,
        {}
      )
      .subscribe({

        next: (response) => {

          console.log(
            'Matching API response:',
            response
          );


          const data =
            response?.data ??
            response;


          // Some backend versions return
          // matches directly.
          if (Array.isArray(data)) {

            this.setMatches(data);

            return;
          }


          // Other backend versions return
          // success/message/data wrapper.
          if (
            Array.isArray(response?.data)
          ) {

            this.setMatches(
              response.data
            );

            return;
          }


          // If matching endpoint only starts
          // matching, load results separately.
          this.loadMatches();

        },

        error: (e) => {

          console.error(
            'Matching endpoint failed:',
            e
          );

          // Even if /match fails,
          // try fetching already-created matches.
          this.loadMatches();

        }

      });
  }


  // ==========================================
  // LOAD MATCHES
  // ==========================================

  loadMatches(): void {

    if (!this.requestId) {

      this.busy.set(false);

      return;
    }


    console.log(
      'Loading matches:',
      this.requestId
    );


    this.http
      .get<any>(
        `${this.api}/ride-requests/${this.requestId}/matches`
      )
      .subscribe({

        next: (r) => {

          console.log(
            'Matches API response:',
            r
          );


          const data =
            r?.data ?? r;


          const list =
            Array.isArray(data)
              ? data
              : data?.matches ||
                data?.items ||
                [];


          this.setMatches(list);

        },

        error: (e) => {

          console.error(
            'Load matches failed:',
            e
          );

          this.busy.set(false);

          this.err.set(
            e.error?.message ||
            e.error?.data?.message ||
            'Request created but could not load matches.'
          );

        }

      });
  }


  // ==========================================
  // SET MATCHES
  // ==========================================

  private setMatches(list: any[]): void {

    const safeList =
      Array.isArray(list)
        ? list
        : [];


    console.log(
      'Final matches:',
      safeList
    );


    this.matches.set(
      safeList
    );

    this.busy.set(false);


    if (!safeList.length) {

      this.msg.set(
        'No matches found for this window. Try another time or route.'
      );

    } else {

      this.msg.set(
        `Found ${safeList.length} match(es)!`
      );

    }
  }


  // ==========================================
  // ACCEPT MATCH
  // ==========================================

  accept(m: any): void {

    const matchId =
      m.matchId ||
      m.id;

    if (!matchId) {

      this.err.set(
        'Match ID is missing.'
      );

      return;
    }


    this.busy.set(true);


    this.http
      .post<any>(
        `${this.api}/ride-requests/matches/${matchId}/respond`,
        {
          accept: true
        }
      )
      .subscribe({

        next: () => {

          this.busy.set(false);

          this.msg.set(
            'Match accepted — creating ride…'
          );

          this.router.navigateByUrl(
            '/app/rides'
          );

        },

        error: (e) => {

          console.error(
            'Accept match failed:',
            e
          );

          this.busy.set(false);

          this.err.set(
            e.error?.message ||
            e.error?.data?.message ||
            'Accept failed'
          );

        }

      });
  }


  // ==========================================
  // REJECT MATCH
  // ==========================================

  reject(m: any): void {

    const matchId =
      m.matchId ||
      m.id;

    if (!matchId) {
      return;
    }


    this.http
      .post<any>(
        `${this.api}/ride-requests/matches/${matchId}/respond`,
        {
          accept: false
        }
      )
      .subscribe({

        next: () => {

          this.matches.update(
            (list) =>
              list.filter(
                (x) =>
                  (x.matchId || x.id) !==
                  matchId
              )
          );

        },

        error: (e) => {

          console.error(
            'Reject match failed:',
            e
          );

          // Remove from UI anyway
          this.matches.update(
            (list) =>
              list.filter(
                (x) =>
                  (x.matchId || x.id) !==
                  matchId
              )
          );

        }

      });
  }


  // ==========================================
  // TRACK MATCH
  // ==========================================

  trackMatch(m: any): string {

    return String(
      m.id ||
      m.matchId ||
      m.matchedUserId ||
      ''
    );
  }


  // ==========================================
  // MATCH NAME
  // ==========================================

  matchName(m: any): string {

    const fullName =
      `${m.firstName || ''} ${m.lastName || ''}`
        .trim();


    return (
      m.matchedUserName ||
      m.driverName ||
      m.userName ||
      fullName ||
      'Commuter'
    );
  }


  // ==========================================
  // INITIALS
  // ==========================================

  initials(m: any): string {

    const n =
      this.matchName(m);


    return (
      n
        .split(/\s+/)
        .slice(0, 2)
        .map(
          (s) =>
            s[0]?.toUpperCase() || ''
        )
        .join('') ||
      'C'
    );
  }


  // ==========================================
  // VEHICLE
  // ==========================================

  vehicleLabel(m: any): string {

    const v =
      m.vehicle || {};


    const parts = [

      m.vehicleLabel,

      m.vehicleInfo,

      v.make,

      v.model,

      v.registrationNumber,

      m.registrationNumber

    ].filter(Boolean);


    return (
      parts.join(' ') ||
      'Vehicle details after accept'
    );
  }


  // ==========================================
  // SCORE
  // ==========================================

  scoreLabel(m: any): string {

    const s =
      m.matchScore ??
      m.score;


    if (s == null) {
      return '—';
    }


    const n =
      Number(s);


    if (n <= 1) {

      return `${Math.round(n * 100)}%`;

    }


    if (n <= 100) {

      return `${Math.round(n)}%`;

    }


    return String(s);
  }


  // ==========================================
  // FORMAT TIME
  // ==========================================

  formatTime(t?: string): string {

    if (!t) {
      return '—';
    }


    if (/^\d{2}:\d{2}/.test(t)) {

      return t.slice(0, 5);

    }


    return t;
  }

}