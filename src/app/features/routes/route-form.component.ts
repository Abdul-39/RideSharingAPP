import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RouteService } from '../../core/services/route.service';
import { GeolocationService } from '../../core/services/geolocation.service';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-route-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="page">
      <div class="card">
        <div class="header">
          <h2>{{ isEdit() ? 'Edit Route' : 'Add Route' }}</h2>
          <a routerLink="/app/routes" class="back">← My Routes</a>
        </div>
        @if (error()) { <div class="alert">{{ error() }}</div> }
        @if (info()) { <div class="info">{{ info() }}</div> }

        <form [formGroup]="form" (ngSubmit)="save()">
          <h3 class="section">Source (Home)</h3>
          <div class="gps-row">
            <button type="button" class="btn ghost" (click)="fillSourceFromGps()" [disabled]="locating()">
              {{ locating() ? 'Locating…' : '📍 Use my location as source' }}
            </button>
          </div>
          <div class="field">
            <label>Address *</label>
            <input formControlName="sourceAddress" placeholder="e.g. G-11 Markaz, Islamabad" />
          </div>
          <div class="row">
            <div class="field"><label>Latitude *</label><input type="number" step="any" formControlName="sourceLatitude" /></div>
            <div class="field"><label>Longitude *</label><input type="number" step="any" formControlName="sourceLongitude" /></div>
          </div>

          <h3 class="section">Destination (Office / Campus)</h3>
          <div class="gps-row">
            <button type="button" class="btn ghost" (click)="fillDestFromGps()" [disabled]="locating()">
              {{ locating() ? 'Locating…' : '📍 Use my location as destination' }}
            </button>
            <button type="button" class="btn ghost" (click)="copySourceToDestHint()">
              Tip: set dest when you are at office
            </button>
          </div>
          <div class="field">
            <label>Address *</label>
            <input formControlName="destinationAddress" placeholder="e.g. Blue Area, Islamabad" />
          </div>
          <div class="row">
            <div class="field"><label>Latitude *</label><input type="number" step="any" formControlName="destinationLatitude" /></div>
            <div class="field"><label>Longitude *</label><input type="number" step="any" formControlName="destinationLongitude" /></div>
          </div>

          <p class="hint">
            Tip: Stand at home → “Use my location as source”. Later at office → “Use my location as destination”.
            You only do this once per route. Matching uses this saved route every day.
          </p>

          <h3 class="section">Timing</h3>
          <div class="row">
            <div class="field"><label>Departure Time *</label><input type="time" formControlName="preferredDepartureTime" /></div>
            <div class="field"><label>Tolerance (minutes) *</label><input type="number" formControlName="maximumTimeToleranceMinutes" min="0" max="120" /></div>
          </div>

          <h3 class="section">Schedule (Days)</h3>
          <div class="days" formGroupName="schedule">
            <label><input type="checkbox" formControlName="monday" /> Mon</label>
            <label><input type="checkbox" formControlName="tuesday" /> Tue</label>
            <label><input type="checkbox" formControlName="wednesday" /> Wed</label>
            <label><input type="checkbox" formControlName="thursday" /> Thu</label>
            <label><input type="checkbox" formControlName="friday" /> Fri</label>
            <label><input type="checkbox" formControlName="saturday" /> Sat</label>
            <label><input type="checkbox" formControlName="sunday" /> Sun</label>
          </div>

          <label class="active">
            <input type="checkbox" formControlName="isActive" /> Route is active
          </label>

          <div class="actions">
            <button type="submit" class="btn" [disabled]="form.invalid || saving()">
              {{ saving() ? 'Saving…' : (isEdit() ? 'Update route' : 'Save route') }}
            </button>
            <a routerLink="/app/routes" class="btn ghost">Cancel</a>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 640px; margin: 0 auto; }
    .card {
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
      border-radius: 1.1rem; padding: 1.25rem;
    }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    h2 { margin: 0; font-size: 1.25rem; }
    .back { color: #94a3b8; text-decoration: none; font-size: 0.9rem; }
    .section { margin: 1.1rem 0 0.55rem; font-size: 0.95rem; color: #cbd5e1; }
    .field { display: flex; flex-direction: column; gap: 0.3rem; margin-bottom: 0.65rem; }
    .field label { font-size: 0.78rem; color: #94a3b8; }
    .field input {
      padding: 0.55rem 0.7rem; border-radius: 0.65rem; border: 1px solid rgba(255,255,255,0.12);
      background: rgba(0,0,0,0.3); color: #fff;
    }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem; }
    @media (max-width: 560px) { .row { grid-template-columns: 1fr; } }
    .gps-row { display: flex; flex-wrap: wrap; gap: 0.45rem; margin-bottom: 0.6rem; }
    .days { display: flex; flex-wrap: wrap; gap: 0.65rem; margin-bottom: 0.85rem; }
    .days label { font-size: 0.85rem; color: #e2e8f0; display: flex; align-items: center; gap: 0.3rem; }
    .active { display: flex; align-items: center; gap: 0.4rem; margin: 0.75rem 0; font-size: 0.9rem; }
    .actions { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1rem; }
    .btn {
      padding: 0.55rem 1rem; border-radius: 999px; border: none; font-weight: 600; cursor: pointer;
      background: linear-gradient(135deg,#5b8cff,#7c5cff); color: #fff; text-decoration: none;
      display: inline-flex; align-items: center;
    }
    .btn.ghost { background: transparent; border: 1px solid rgba(255,255,255,0.15); color: #e2e8f0; }
    .btn:disabled { opacity: 0.55; cursor: not-allowed; }
    .alert { background: rgba(248,113,113,0.15); color: #fca5a5; padding: 0.6rem 0.8rem; border-radius: 0.6rem; margin-bottom: 0.75rem; }
    .info { background: rgba(91,140,255,0.12); color: #93c5fd; padding: 0.6rem 0.8rem; border-radius: 0.6rem; margin-bottom: 0.75rem; font-size: 0.88rem; }
    .hint { color: #94a3b8; font-size: 0.82rem; line-height: 1.45; margin: 0.35rem 0 0.75rem; }
  `]
})
export class RouteFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private routeService = inject(RouteService);
  private geo = inject(GeolocationService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private activated = inject(ActivatedRoute);

  isEdit = signal(false);
  routeId = signal<string | null>(null);
  saving = signal(false);
  locating = signal(false);
  error = signal('');
  info = signal('');

  form = this.fb.nonNullable.group({
    sourceAddress: ['', Validators.required],
    sourceLatitude: [33.6844 as number, Validators.required],
    sourceLongitude: [73.0479 as number, Validators.required],
    destinationAddress: ['', Validators.required],
    destinationLatitude: [33.6938 as number, Validators.required],
    destinationLongitude: [73.0652 as number, Validators.required],
    preferredDepartureTime: ['08:00', Validators.required],
    maximumTimeToleranceMinutes: [15, [Validators.required, Validators.min(0), Validators.max(120)]],
    isActive: [true],
    schedule: this.fb.nonNullable.group({
      monday: [true],
      tuesday: [true],
      wednesday: [true],
      thursday: [true],
      friday: [true],
      saturday: [false],
      sunday: [false]
    })
  });

  ngOnInit(): void {
    const id = this.activated.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.routeId.set(id);
      this.routeService.getById(id).subscribe({
        next: res => {
          if (res.success && res.data) {
            const r = res.data;
            const s = r.schedules?.[0];
            this.form.patchValue({
              sourceAddress: r.sourceAddress,
              sourceLatitude: r.sourceLatitude,
              sourceLongitude: r.sourceLongitude,
              destinationAddress: r.destinationAddress,
              destinationLatitude: r.destinationLatitude,
              destinationLongitude: r.destinationLongitude,
              preferredDepartureTime: (r.preferredDepartureTime || '08:00').substring(0, 5),
              maximumTimeToleranceMinutes: r.maximumTimeToleranceMinutes,
              isActive: r.isActive,
              schedule: {
                monday: s?.monday ?? false,
                tuesday: s?.tuesday ?? false,
                wednesday: s?.wednesday ?? false,
                thursday: s?.thursday ?? false,
                friday: s?.friday ?? false,
                saturday: s?.saturday ?? false,
                sunday: s?.sunday ?? false
              }
            });
          } else this.error.set(res.message);
        },
        error: err => this.error.set(err.error?.message || 'Failed to load route')
      });
    }
  }

  fillSourceFromGps(): void {
    this.locating.set(true);
    this.error.set('');
    this.geo.getCurrentPosition().subscribe({
      next: p => {
        this.locating.set(false);
        this.form.patchValue({
          sourceLatitude: p.latitude,
          sourceLongitude: p.longitude
        });
        this.info.set('Source set from your current GPS. Add a short address label (e.g. Home).');
        this.toast.success('Source = current location');
      },
      error: () => {
        this.locating.set(false);
        this.error.set(this.geo.error() || 'Could not get location. Allow location permission.');
        this.toast.error('Location failed');
      }
    });
  }

  fillDestFromGps(): void {
    this.locating.set(true);
    this.error.set('');
    this.geo.getCurrentPosition().subscribe({
      next: p => {
        this.locating.set(false);
        this.form.patchValue({
          destinationLatitude: p.latitude,
          destinationLongitude: p.longitude
        });
        this.info.set('Destination set from your current GPS. Add a short address label (e.g. Office).');
        this.toast.success('Destination = current location');
      },
      error: () => {
        this.locating.set(false);
        this.error.set(this.geo.error() || 'Could not get location. Allow location permission.');
        this.toast.error('Location failed');
      }
    });
  }

  copySourceToDestHint(): void {
    this.info.set('Go to your office/campus, open Edit Route, and tap “Use my location as destination”.');
  }

  save(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const sched = v.schedule;
    const hasDay = sched.monday || sched.tuesday || sched.wednesday || sched.thursday ||
      sched.friday || sched.saturday || sched.sunday;
    if (!hasDay) {
      this.error.set('Select at least one day for the schedule.');
      return;
    }

    this.saving.set(true);
    this.error.set('');

   const body = {
  sourceLatitude: Number(v.sourceLatitude),
  sourceLongitude: Number(v.sourceLongitude),
  sourceAddress: v.sourceAddress,
  destinationLatitude: Number(v.destinationLatitude),
  destinationLongitude: Number(v.destinationLongitude),
  destinationAddress: v.destinationAddress,
  preferredDepartureTime: (v.preferredDepartureTime || '08:00').substring(0, 5), // HH:mm only
  maximumTimeToleranceMinutes: Number(v.maximumTimeToleranceMinutes),
  isActive: v.isActive,
  schedules: [{
    monday: sched.monday,
    tuesday: sched.tuesday,
    wednesday: sched.wednesday,
    thursday: sched.thursday,
    friday: sched.friday,
    saturday: sched.saturday,
    sunday: sched.sunday,
    isActive: true
  }]
};

    const req$ = this.isEdit() && this.routeId()
      ? this.routeService.update(this.routeId()!, body)
      : this.routeService.create(body);

    req$.subscribe({
      next: res => {
        this.saving.set(false);
        if (res.success) {
          this.toast.success('Route saved');
          this.router.navigate(['/app/routes']);
        } else {
          this.error.set(res.message + (res.errors?.length ? ': ' + res.errors.join(', ') : ''));
        }
      },
      error: err => {
        this.saving.set(false);
        this.error.set(err.error?.message || 'Save failed');
      }
    });
  }
}
