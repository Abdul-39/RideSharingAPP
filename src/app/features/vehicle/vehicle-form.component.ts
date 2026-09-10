import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { VehicleService, VehicleType } from '../../core/services/vehicle.service';

@Component({
  selector: 'app-vehicle-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="page">
      <div class="card">
        <div class="header">
          <h2>{{ isEdit() ? 'Edit Vehicle' : 'Add Vehicle' }}</h2>
          <a routerLink="/app/vehicles" class="back">← Vehicles</a>
        </div>
        @if (error()) { <div class="alert">{{ error() }}</div> }
        <form [formGroup]="form" (ngSubmit)="save()">
          <div class="field">
            <label>Vehicle Type</label>
            <select formControlName="vehicleTypeId">
              <option value="">Select type</option>
              @for (t of types(); track t.id) {
                <option [value]="t.id">{{ t.name }} ({{ t.defaultSeatingCapacity }} seats)</option>
              }
            </select>
          </div>
          <div class="row">
            <div class="field"><label>Make</label><input formControlName="make" placeholder="Toyota" /></div>
            <div class="field"><label>Model</label><input formControlName="model" placeholder="Corolla" /></div>
          </div>
          <div class="field"><label>Registration Number</label><input formControlName="registrationNumber" placeholder="ABC-123" /></div>
          <div class="row">
            <div class="field"><label>Color</label><input formControlName="color" /></div>
            <div class="field"><label>Seating Capacity</label><input type="number" formControlName="seatingCapacity" min="1" /></div>
          </div>
          @if (isEdit()) {
            <div class="field check">
              <label><input type="checkbox" formControlName="isActive" /> Active</label>
            </div>
          }
          <button type="submit" [disabled]="form.invalid || saving()">
            {{ saving() ? 'Saving...' : (isEdit() ? 'Update' : 'Create') }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .page { min-height:100vh; background:linear-gradient(135deg,#0f172a,#1e3a8a); padding:2rem 1rem; display:flex; justify-content:center; }
    .card { background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); border-radius:1rem; padding:1.75rem; width:100%; max-width:520px; color:#fff; }
    .header { display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; }
    .back { color:#60a5fa; font-size:0.9rem; }
    .row { display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; }
    .field { margin-bottom:0.85rem; }
    label { display:block; font-size:0.85rem; color:#cbd5e1; margin-bottom:0.3rem; }
    input, select { width:100%; padding:0.65rem 0.85rem; border-radius:0.5rem; border:1px solid rgba(255,255,255,0.2);
                    background:rgba(0,0,0,0.3); color:#fff; box-sizing:border-box; }
    .check label { display:flex; align-items:center; gap:0.5rem; }
    .check input { width:auto; }
    button { width:100%; padding:0.8rem; border:none; border-radius:0.5rem; background:#2563eb; color:#fff; font-weight:600; cursor:pointer; }
    button:disabled { opacity:0.6; }
    .alert { background:rgba(239,68,68,0.2); border:1px solid #ef4444; color:#fca5a5; padding:0.75rem; border-radius:0.5rem; margin-bottom:1rem; }
  `]
})
export class VehicleFormComponent implements OnInit {
  private vehicleService = inject(VehicleService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    vehicleTypeId: ['', Validators.required],
    make: ['', Validators.required],
    model: ['', Validators.required],
    registrationNumber: ['', Validators.required],
    color: [''],
    seatingCapacity: [4, [Validators.required, Validators.min(1)]],
    isActive: [true]
  });

  types = signal<VehicleType[]>([]);
  isEdit = signal(false);
  vehicleId = signal<string | null>(null);
  saving = signal(false);
  error = signal('');

  ngOnInit(): void {
    this.vehicleService.getTypes().subscribe({
      next: res => { if (res.success && res.data) this.types.set(res.data); }
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.vehicleId.set(id);
      this.vehicleService.getById(id).subscribe({
        next: res => {
          if (res.success && res.data) {
            const v = res.data;
            this.form.patchValue({
              vehicleTypeId: v.vehicleTypeId,
              make: v.make,
              model: v.model,
              registrationNumber: v.registrationNumber,
              color: v.color || '',
              seatingCapacity: v.seatingCapacity,
              isActive: v.isActive
            });
          } else this.error.set(res.message);
        },
        error: err => this.error.set(err.error?.message || 'Failed to load vehicle')
      });
    }
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.error.set('');
    const v = this.form.getRawValue();
    const body = {
      vehicleTypeId: v.vehicleTypeId,
      make: v.make,
      model: v.model,
      registrationNumber: v.registrationNumber,
      color: v.color || undefined,
      seatingCapacity: Number(v.seatingCapacity)
    };

    if (this.isEdit() && this.vehicleId()) {
      this.vehicleService.update(this.vehicleId()!, { ...body, isActive: v.isActive }).subscribe({
        next: res => {
          this.saving.set(false);
          if (res.success) this.router.navigate(['/vehicles']);
          else this.error.set(res.message);
        },
        error: err => { this.saving.set(false); this.error.set(err.error?.message || 'Update failed'); }
      });
    } else {
      this.vehicleService.create(body).subscribe({
        next: res => {
          this.saving.set(false);
          if (res.success) this.router.navigate(['/vehicles']);
          else this.error.set(res.message);
        },
        error: err => { this.saving.set(false); this.error.set(err.error?.message || 'Create failed'); }
      });
    }
  }
}
