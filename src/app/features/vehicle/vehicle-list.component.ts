import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Vehicle, VehicleService } from '../../core/services/vehicle.service';

@Component({
  selector: 'app-vehicle-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page">
      <div class="wrap">
        <div class="header">
          <h2>My Vehicles</h2>
          <div class="actions">
            <a routerLink="/vehicles/add" class="btn primary">+ Add Vehicle</a>
            <a routerLink="/" class="btn ghost">Home</a>
          </div>
        </div>
        @if (error()) { <div class="alert">{{ error() }}</div> }
        @if (loading()) { <p class="muted">Loading...</p> }
        @else if (vehicles().length === 0) {
          <p class="muted">No vehicles yet. Add your first vehicle.</p>
        } @else {
          <div class="grid">
            @for (v of vehicles(); track v.id) {
              <div class="card">
                <h3>{{ v.make }} {{ v.model }}</h3>
                <p>{{ v.vehicleTypeName }} · {{ v.registrationNumber }}</p>
                <p class="muted">{{ v.color || 'No color' }} · {{ v.seatingCapacity }} seats</p>
                <p class="badge" [class.off]="!v.isActive">{{ v.isActive ? 'Active' : 'Inactive' }}</p>
                <div class="row">
                  <a [routerLink]="['/vehicles/edit', v.id]" class="btn small">Edit</a>
                  <button class="btn small danger" (click)="remove(v)">Delete</button>
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
    .wrap { max-width:900px; margin:0 auto; }
    .header { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-bottom:1.5rem; }
    .actions { display:flex; gap:0.5rem; }
    .btn { padding:0.5rem 1rem; border-radius:999px; border:none; cursor:pointer; font-weight:500; text-decoration:none; display:inline-block; font-size:0.9rem; }
    .btn.primary { background:#2563eb; color:#fff; }
    .btn.ghost { background:transparent; border:1px solid rgba(255,255,255,0.3); color:#fff; }
    .btn.small { padding:0.35rem 0.75rem; font-size:0.8rem; background:rgba(255,255,255,0.1); color:#fff; }
    .btn.danger { background:rgba(239,68,68,0.3); }
    .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:1rem; }
    .card { background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.12); border-radius:1rem; padding:1.25rem; }
    .card h3 { margin:0 0 0.35rem; }
    .muted { color:#94a3b8; font-size:0.9rem; }
    .badge { display:inline-block; margin:0.5rem 0; padding:0.15rem 0.6rem; border-radius:999px; background:rgba(34,197,94,0.25); font-size:0.75rem; }
    .badge.off { background:rgba(148,163,184,0.3); }
    .row { display:flex; gap:0.5rem; margin-top:0.75rem; }
    .alert { background:rgba(239,68,68,0.2); border:1px solid #ef4444; color:#fca5a5; padding:0.75rem; border-radius:0.5rem; margin-bottom:1rem; }
  `]
})
export class VehicleListComponent implements OnInit {
  private vehicleService = inject(VehicleService);
  vehicles = signal<Vehicle[]>([]);
  loading = signal(true);
  error = signal('');

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.vehicleService.getMyVehicles().subscribe({
      next: res => {
        this.loading.set(false);
        if (res.success && res.data) this.vehicles.set(res.data);
        else this.error.set(res.message);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Failed to load vehicles');
      }
    });
  }

  remove(v: Vehicle): void {
    if (!confirm(`Delete ${v.make} ${v.model} (${v.registrationNumber})?`)) return;
    this.vehicleService.delete(v.id).subscribe({
      next: res => {
        if (res.success) this.load();
        else this.error.set(res.message);
      },
      error: err => this.error.set(err.error?.message || 'Delete failed')
    });
  }
}
