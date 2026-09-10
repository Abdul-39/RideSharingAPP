import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { RouteDto, RouteService } from '../../core/services/route.service';
import { RideRequestService } from '../../core/services/ride-request.service';

@Component({
  selector: 'app-find-ride',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="page">
      <div class="card">
        <div class="header">
          <h2>Find a Ride</h2>
          <a routerLink="/app/rides" class="back">My Requests</a>
        </div>
        @if (error()) { <div class="alert">{{ error() }}</div> }
        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="field">
            <label>Your Route *</label>
            <select formControlName="routeId">
              <option value="">Select route</option>
              @for (r of routes(); track r.id) {
                <option [value]="r.id">{{ r.sourceAddress }} → {{ r.destinationAddress }} ({{ r.preferredDepartureTime }})</option>
              }
            </select>
          </div>
          <div class="row">
            <div class="field"><label>Travel Date *</label><input type="date" formControlName="travelDate" /></div>
            <div class="field"><label>Departure Time *</label><input type="time" formControlName="preferredDepartureTime" /></div>
          </div>
          <div class="row">
            <div class="field"><label>Seats Needed *</label><input type="number" formControlName="seatsNeeded" min="1" max="10" /></div>
            <div class="field"><label>Tolerance (min)</label><input type="number" formControlName="timeToleranceMinutes" min="0" max="120" /></div>
          </div>
          <div class="field">
            <label>Gender Preference</label>
            <select formControlName="genderPreference">
              <option [value]="0">Any</option>
              <option [value]="1">Male only</option>
              <option [value]="2">Female only (Women-only)</option>
            </select>
          </div>
          <div class="field"><label>Notes</label><input formControlName="notes" /></div>
          <button type="submit" [disabled]="form.invalid || saving()">
            {{ saving() ? 'Creating...' : 'Create Request & Find Matches' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .page { min-height:100vh; background:linear-gradient(135deg,#0f172a,#1e3a8a); padding:2rem 1rem; display:flex; justify-content:center; color:#fff; }
    .card { background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); border-radius:1rem; padding:1.75rem; width:100%; max-width:520px; }
    .header { display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; }
    .back { color:#60a5fa; font-size:0.9rem; }
    .row { display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; }
    .field { margin-bottom:0.85rem; }
    label { display:block; font-size:0.85rem; color:#cbd5e1; margin-bottom:0.3rem; }
    input, select { width:100%; padding:0.65rem; border-radius:0.5rem; border:1px solid rgba(255,255,255,0.2);
                    background:rgba(0,0,0,0.3); color:#fff; box-sizing:border-box; }
    button { width:100%; padding:0.85rem; border:none; border-radius:0.5rem; background:#2563eb; color:#fff; font-weight:600; cursor:pointer; }
    button:disabled { opacity:0.6; }
    .alert { background:rgba(239,68,68,0.2); border:1px solid #ef4444; color:#fca5a5; padding:0.75rem; border-radius:0.5rem; margin-bottom:1rem; }
  `]
})
export class FindRideComponent implements OnInit {
  private routeService = inject(RouteService);
  private rideService = inject(RideRequestService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  routes = signal<RouteDto[]>([]);
  saving = signal(false);
  error = signal('');

  form = this.fb.nonNullable.group({
    routeId: ['', Validators.required],
    travelDate: ['', Validators.required],
    preferredDepartureTime: ['08:00', Validators.required],
    seatsNeeded: [1, [Validators.required, Validators.min(1)]],
    timeToleranceMinutes: [15, [Validators.min(0), Validators.max(120)]],
    genderPreference: [0],
    notes: ['']
  });

  ngOnInit(): void {
    this.routeService.getMyRoutes().subscribe({
      next: res => { if (res.success && res.data) this.routes.set(res.data); }
    });
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.form.patchValue({ travelDate: tomorrow.toISOString().substring(0, 10) });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.error.set('');
    const v = this.form.getRawValue();
    this.rideService.create({
      routeId: v.routeId,
      travelDate: v.travelDate,
      preferredDepartureTime: v.preferredDepartureTime,
      seatsNeeded: Number(v.seatsNeeded),
      genderPreference: Number(v.genderPreference),
      timeToleranceMinutes: Number(v.timeToleranceMinutes),
      notes: v.notes || undefined
    }).subscribe({
      next: res => {
        if (!res.success || !res.data) {
          this.saving.set(false);
          this.error.set(res.message);
          return;
        }
        const id = res.data.id;
        this.rideService.runMatch(id).subscribe({
          next: () => {
            this.saving.set(false);
            this.router.navigate(['/rides', id, 'matches']);
          },
          error: err => {
            this.saving.set(false);
            this.router.navigate(['/rides', id, 'matches']);
          }
        });
      },
      error: err => {
        this.saving.set(false);
        this.error.set(err.error?.message || 'Failed');
      }
    });
  }
}
