import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-vehicle-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="rs-page">
      <header class="head">
        <div>
          <div class="chips"><span class="chip">{{ id ? 'Edit' : 'Add' }} vehicle</span></div>
          <h1>{{ id ? 'Edit vehicle' : 'Register vehicle' }}</h1>
        </div>
        <a routerLink="/app/vehicles" class="btn ghost">Back</a>
      </header>

      <section class="card">
        @if (err()) { <p class="err">{{ err() }}</p> }
        @if (msg()) { <p class="ok">{{ msg() }}</p> }

        <label class="lbl">Vehicle type
          <select class="inp" [(ngModel)]="vehicleTypeId" name="vt">
            <option value="">Select</option>
            @for (t of types(); track t.id) {
              <option [value]="t.id">{{ t.name }}</option>
            }
          </select>
        </label>
        <div class="row2">
          <label class="lbl">Make
            <input class="inp" [(ngModel)]="make" name="make" placeholder="Suzuki" />
          </label>
          <label class="lbl">Model
            <input class="inp" [(ngModel)]="model" name="model" placeholder="Alto" />
          </label>
        </div>
        <div class="row2">
          <label class="lbl">Registration
            <input class="inp" [(ngModel)]="registrationNumber" name="reg" placeholder="LHR-1234" />
          </label>
          <label class="lbl">Color
            <input class="inp" [(ngModel)]="color" name="color" />
          </label>
        </div>
        <label class="lbl">Seating capacity
          <input class="inp" type="number" min="1" [(ngModel)]="seatingCapacity" name="seats" />
        </label>
        <button type="button" class="btn primary" (click)="save()" [disabled]="busy()">
          {{ id ? 'Update' : 'Create' }} vehicle
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
    .card {
      background: #fff; border: 1px solid #b7ebc9; border-radius: 16px; padding: 1.2rem;
      max-width: 560px; box-shadow: 0 6px 18px rgba(15,23,42,0.04);
    }
    .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem; }
    @media (max-width: 560px) { .row2 { grid-template-columns: 1fr; } }
    .lbl { display: block; font-size: 0.78rem; font-weight: 700; color: #64748b; margin-bottom: 0.65rem; }
    .inp {
      display: block; width: 100%; margin-top: 0.3rem; min-height: 44px;
      padding: 0.5rem 0.75rem; border-radius: 12px; border: 1px solid #e2e8f0;
    }
    .btn {
      display: inline-flex; align-items: center; min-height: 44px; padding: 0.5rem 1.1rem;
      border-radius: 999px; font-weight: 800; border: none; cursor: pointer; text-decoration: none;
    }
    .btn.primary { background: #0d9f6e; color: #fff; margin-top: 0.35rem; }
    .btn.ghost { background: #fff; border: 1px solid #e2e8f0; color: #0f172a; }
    .err { color: #e11d48; } .ok { color: #0d9f6e; }
  `]
})
export class VehicleFormComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = (environment.apiUrl || '/api/v1').replace(/\/$/, '');

  id = '';
  types = signal<any[]>([]);
  vehicleTypeId = '';
  make = '';
  model = '';
  registrationNumber = '';
  color = '';
  seatingCapacity = 4;
  busy = signal(false);
  err = signal('');
  msg = signal('');

  ngOnInit(): void {
  this.id = this.route.snapshot.paramMap.get('id') || '';

  // CORRECT endpoint
  this.http.get<any>(`${this.api}/vehicles/types`).subscribe({
    next: (r) => {
      const d = r?.data ?? r;
      const list = Array.isArray(d) ? d : d?.items ?? [];
      this.types.set(list);
      if (!this.vehicleTypeId && list.length) {
        this.vehicleTypeId = list[0].id; // real Guid
      }
    },
    error: (e) => {
      this.err.set('Could not load vehicle types. Is API running?');
      this.types.set([]); // NO fake car/bike ids
    }
  });

  // ... rest edit load same

    if (this.id) {
      this.http.get<any>(`${this.api}/vehicles/${this.id}`).subscribe({
        next: (r) => {
          const d = r?.data ?? r;
          this.vehicleTypeId = d?.vehicleTypeId || '';
          this.make = d?.make || '';
          this.model = d?.model || '';
          this.registrationNumber = d?.registrationNumber || '';
          this.color = d?.color || '';
          this.seatingCapacity = d?.seatingCapacity ?? 4;
        }
      });
    }
  }

  save(): void {
    this.busy.set(true); this.err.set('');
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const body = {
      vehicleTypeId: this.vehicleTypeId,
      make: this.make,
      model: this.model,
      registrationNumber: this.registrationNumber,
      color: this.color,
      seatingCapacity: this.seatingCapacity
    };
    const req = this.id
      ? this.http.put(`${this.api}/vehicles/${this.id}`, body, { headers })
      : this.http.post(`${this.api}/vehicles`, body, { headers });
    req.subscribe({
      next: () => {
        this.busy.set(false);
        this.router.navigateByUrl('/app/vehicles');
      },
      error: (e) => {
        this.busy.set(false);
        this.err.set(e.error?.message || 'Save failed');
      }
    });
  }
}
