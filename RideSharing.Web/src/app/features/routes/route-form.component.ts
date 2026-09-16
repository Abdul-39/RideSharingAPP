import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-route-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="rs-page">
      <header class="head">
        <div>
          <div class="chips"><span class="chip">{{ id ? 'Edit' : 'Publish' }} route</span></div>
          <h1>{{ id ? 'Edit route' : 'Publish repeat route' }}</h1>
          <p class="sub">Set once — matching uses this every day.</p>
        </div>
        <a routerLink="/app/routes" class="btn ghost">My routes</a>
      </header>

      <section class="card">
        @if (err()) { <p class="err">{{ err() }}</p> }

        <label class="lbl">Source address
          <input class="inp" [(ngModel)]="sourceAddress" name="src" />
        </label>
        <div class="row2">
          <label class="lbl">Source lat
            <input class="inp" type="number" step="any" [(ngModel)]="sourceLatitude" name="slat" />
          </label>
          <label class="lbl">Source lng
            <input class="inp" type="number" step="any" [(ngModel)]="sourceLongitude" name="slng" />
          </label>
        </div>
        <button type="button" class="btn ghost sm" (click)="fillSourceFromGps()">Use my location as source</button>

        <label class="lbl">Destination address
          <input class="inp" [(ngModel)]="destinationAddress" name="dst" />
        </label>
        <div class="row2">
          <label class="lbl">Dest lat
            <input class="inp" type="number" step="any" [(ngModel)]="destinationLatitude" name="dlat" />
          </label>
          <label class="lbl">Dest lng
            <input class="inp" type="number" step="any" [(ngModel)]="destinationLongitude" name="dlng" />
          </label>
        </div>

        <div class="row2">
          <label class="lbl">Departure time
            <input class="inp" type="time" [(ngModel)]="preferredDepartureTime" name="time" />
          </label>
          <label class="lbl">Tolerance (minutes)
            <input class="inp" type="number" [(ngModel)]="tolerance" name="tol" />
          </label>
        </div>

        <p class="lbl">Days</p>
        <div class="days">
          @for (d of dayKeys; track d.key) {
            <label class="day">
              <input type="checkbox" [(ngModel)]="days[d.key]" [name]="d.key" />
              {{ d.label }}
            </label>
          }
        </div>

        <button type="button" class="btn primary" (click)="save()" [disabled]="busy()">
          {{ id ? 'Update route' : 'Publish route' }}
        </button>
      </section>
    </div>
  `,
  styles: [`
    .head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
    .chip {
      font-size: 0.72rem; font-weight: 800; padding: 0.25rem 0.65rem; border-radius: 999px;
      background: #e8f8f1; color: #0b7f58;
    }
    h1 { margin: 0.35rem 0 0; font-size: 1.35rem; font-weight: 800; }
    .sub { margin: 0.3rem 0 0; color: #64748b; font-size: 0.9rem; }
    .card {
      background: #fff; border: 1px solid #b7ebc9; border-radius: 16px; padding: 1.2rem;
      max-width: 600px; box-shadow: 0 6px 18px rgba(15,23,42,0.04);
    }
    .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem; }
    @media (max-width: 560px) { .row2 { grid-template-columns: 1fr; } }
    .lbl { display: block; font-size: 0.78rem; font-weight: 700; color: #64748b; margin: 0.55rem 0; }
    .inp {
      display: block; width: 100%; margin-top: 0.3rem; min-height: 44px;
      padding: 0.5rem 0.75rem; border-radius: 12px; border: 1px solid #e2e8f0;
    }
    .days { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.85rem; }
    .day {
      display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.85rem; font-weight: 700;
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 999px; padding: 0.35rem 0.7rem;
    }
    .btn {
      display: inline-flex; align-items: center; min-height: 44px; padding: 0.5rem 1.1rem;
      border-radius: 999px; font-weight: 800; border: none; cursor: pointer; text-decoration: none;
    }
    .btn.primary { background: #0d9f6e; color: #fff; }
    .btn.ghost { background: #fff; border: 1px solid #e2e8f0; color: #0f172a; }
    .btn.sm { min-height: 36px; font-size: 0.8rem; margin-bottom: 0.5rem; }
    .err { color: #e11d48; }
  `]
})
export class RouteFormComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = (environment.apiUrl || '/api/v1').replace(/\/$/, '');

  id = '';
  sourceAddress = '';
  destinationAddress = '';
  sourceLatitude: number | null = null;
  sourceLongitude: number | null = null;
  destinationLatitude: number | null = null;
  destinationLongitude: number | null = null;
  preferredDepartureTime = '08:00';
  tolerance = 15;
  days: Record<string, boolean> = {
    monday: true, tuesday: true, wednesday: true, thursday: true,
    friday: true, saturday: false, sunday: false
  };
  dayKeys = [
    { key: 'monday', label: 'Mon' },
    { key: 'tuesday', label: 'Tue' },
    { key: 'wednesday', label: 'Wed' },
    { key: 'thursday', label: 'Thu' },
    { key: 'friday', label: 'Fri' },
    { key: 'saturday', label: 'Sat' },
    { key: 'sunday', label: 'Sun' }
  ];
  busy = signal(false);
  err = signal('');

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') || '';
    if (this.id) {
      this.http.get<any>(`${this.api}/routes/${this.id}`).subscribe({
        next: (r) => {
          const d = r?.data ?? r;
          this.sourceAddress = d?.sourceAddress || '';
          this.destinationAddress = d?.destinationAddress || '';
          this.sourceLatitude = d?.sourceLatitude ?? null;
          this.sourceLongitude = d?.sourceLongitude ?? null;
          this.destinationLatitude = d?.destinationLatitude ?? null;
          this.destinationLongitude = d?.destinationLongitude ?? null;
          const t = d?.preferredDepartureTime;
          if (t) this.preferredDepartureTime = String(t).slice(0, 5);
          this.tolerance = d?.maximumTimeToleranceMinutes ?? d?.timeToleranceMinutes ?? 15;
        }
      });
    }
  }

  fillSourceFromGps(): void {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      this.sourceLatitude = +pos.coords.latitude.toFixed(6);
      this.sourceLongitude = +pos.coords.longitude.toFixed(6);
    });
  }

  save(): void {
    this.busy.set(true); this.err.set('');
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const time = this.preferredDepartureTime?.length === 5
      ? this.preferredDepartureTime + ':00'
      : this.preferredDepartureTime;
    const body: any = {
      sourceAddress: this.sourceAddress,
      destinationAddress: this.destinationAddress,
      sourceLatitude: this.sourceLatitude,
      sourceLongitude: this.sourceLongitude,
      destinationLatitude: this.destinationLatitude,
      destinationLongitude: this.destinationLongitude,
      preferredDepartureTime: time,
      maximumTimeToleranceMinutes: this.tolerance,
      timeToleranceMinutes: this.tolerance,
      ...this.days,
      schedules: this.dayKeys
        .filter((d) => this.days[d.key])
        .map((d) => ({ dayOfWeek: d.key, isActive: true }))
    };
    const req = this.id
      ? this.http.put(`${this.api}/routes/${this.id}`, body, { headers })
      : this.http.post(`${this.api}/routes`, body, { headers });
    req.subscribe({
      next: () => {
        this.busy.set(false);
        this.router.navigateByUrl('/app/routes');
      },
      error: (e) => {
        this.busy.set(false);
        this.err.set(e.error?.message || 'Save failed');
      }
    });
  }
}
