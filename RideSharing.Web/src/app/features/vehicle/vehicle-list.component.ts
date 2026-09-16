import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-vehicle-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="rs-page">
      <header class="head">
        <div>
          <div class="chips">
            <span class="chip">Fleet Management</span>
            <span class="chip gold">Commute vehicles</span>
          </div>
          <h1>My Vehicles</h1>
          <p class="sub">Register cars, bikes, or vans used on daily corridors.</p>
        </div>
        <a routerLink="/app/vehicles/add" class="btn primary">+ Add Vehicle</a>
      </header>

      @if (err()) { <p class="err">{{ err() }}</p> }
      @if (loading()) { <p class="muted">Loading…</p> }

      <div class="grid">
        @for (v of vehicles(); track v.id) {
          <article class="card">
            <div class="top">
              <span class="badge">{{ typeLabel(v) }}</span>
              @if (v.isActive !== false) { <span class="badge green">Active</span> }
            </div>
            <h2>{{ v.make }} {{ v.model }}</h2>
            <p class="plate">{{ v.registrationNumber }}</p>
            <div class="meta">
              <span>{{ v.color || '—' }}</span>
              <span>{{ v.seatingCapacity || '?' }} seats</span>
            </div>
            <div class="actions">
              <a class="link" [routerLink]="['/app/vehicles/edit', v.id]">Edit</a>
              <button type="button" class="link danger" (click)="remove(v)">Delete</button>
            </div>
          </article>
        } @empty {
          @if (!loading()) {
            <div class="empty card">
              <h3>No vehicles</h3>
              <p class="muted">Add at least one vehicle before publishing driver routes.</p>
              <a routerLink="/app/vehicles/add" class="btn primary">Add vehicle</a>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
    .chips { display: flex; gap: 0.35rem; flex-wrap: wrap; margin-bottom: 0.35rem; }
    .chip {
      font-size: 0.72rem; font-weight: 800; padding: 0.25rem 0.65rem; border-radius: 999px;
      background: #e8f8f1; color: #0b7f58;
    }
    .chip.gold { background: #fff7cc; color: #a16207; }
    h1 { margin: 0; font-size: 1.4rem; font-weight: 800; }
    .sub { margin: 0.3rem 0 0; color: #64748b; font-size: 0.9rem; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.85rem; }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 560px) { .grid { grid-template-columns: 1fr; } }
    .card {
      background: #fff; border: 1px solid #b7ebc9; border-radius: 16px; padding: 1.1rem;
      box-shadow: 0 6px 18px rgba(15,23,42,0.04);
    }
    .top { display: flex; gap: 0.35rem; margin-bottom: 0.45rem; }
    .badge {
      font-size: 0.7rem; font-weight: 800; padding: 0.2rem 0.55rem; border-radius: 999px;
      background: #f1f5f9; color: #475569;
    }
    .badge.green { background: #e8f8f1; color: #0b7f58; }
    h2 { margin: 0; font-size: 1.1rem; font-weight: 800; }
    .plate { margin: 0.25rem 0; font-weight: 800; color: #0d9f6e; letter-spacing: 0.04em; }
    .meta { display: flex; gap: 0.75rem; color: #64748b; font-size: 0.85rem; margin-bottom: 0.75rem; }
    .actions { display: flex; gap: 0.85rem; }
    .link {
      background: none; border: none; color: #0d9f6e; font-weight: 700; cursor: pointer;
      padding: 0; text-decoration: none; font-size: 0.85rem;
    }
    .link.danger { color: #e11d48; }
    .btn {
      display: inline-flex; align-items: center; min-height: 44px; padding: 0.5rem 1.1rem;
      border-radius: 999px; font-weight: 800; background: #0d9f6e; color: #fff; text-decoration: none;
    }
    .empty { text-align: center; padding: 2rem 1rem; grid-column: 1 / -1; }
    .muted { color: #64748b; } .err { color: #e11d48; }
  `]
})
export class VehicleListComponent implements OnInit {
  private http = inject(HttpClient);
  private api = (environment.apiUrl || '/api/v1').replace(/\/$/, '');

  vehicles = signal<any[]>([]);
  loading = signal(true);
  err = signal('');

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.http.get<any>(`${this.api}/vehicles`).subscribe({
      next: (r) => {
        const d = r?.data ?? r;
        this.vehicles.set(Array.isArray(d) ? d : d?.items ?? []);
        this.loading.set(false);
      },
      error: (e) => {
        this.err.set(e.error?.message || 'Could not load vehicles');
        this.loading.set(false);
      }
    });
  }

  typeLabel(v: any): string {
    return v.vehicleTypeName || v.vehicleType?.name || v.type || 'Vehicle';
  }

  remove(v: any): void {
    if (!confirm(`Delete ${v.make} ${v.model}?`)) return;
    this.http.delete(`${this.api}/vehicles/${v.id}`).subscribe({
      next: () => this.load(),
      error: (e) => this.err.set(e.error?.message || 'Delete failed')
    });
  }
}
