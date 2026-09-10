import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeolocationService } from '../../core/services/geolocation.service';
import { LocationApiService } from '../../core/services/location-api.service';
import { RouteService, RouteDto } from '../../core/services/route.service';
import { RouteMapComponent } from '../../shared/maps/route-map.component';
import { DriverMapComponent } from '../../shared/maps/driver-map.component';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-gps-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouteMapComponent, DriverMapComponent],
  template: `
    <div class="page">
      <header>
        <h1>Maps & GPS</h1>
        <p>Use GPS and your saved routes — no need to type coordinates every time.</p>
      </header>

      <section class="card">
        <h2>Current location</h2>
        <div class="actions">
          <button type="button" class="btn" (click)="locate()" [disabled]="locating()">
            {{ locating() ? 'Locating…' : 'Use my location' }}
          </button>
          <button type="button" class="btn ghost" (click)="shareLocation()" [disabled]="!pos()">
            Share to server
          </button>
        </div>
        @if (geoError()) { <p class="err">{{ geoError() }}</p> }
        @if (actionMsg()) { <p class="ok">{{ actionMsg() }}</p> }
        @if (pos()) {
          <div class="grid2">
            <div><span class="lbl">Latitude</span><strong>{{ pos()!.latitude | number:'1.5-5' }}</strong></div>
            <div><span class="lbl">Longitude</span><strong>{{ pos()!.longitude | number:'1.5-5' }}</strong></div>
            <div><span class="lbl">Accuracy</span><strong>{{ pos()!.accuracy | number:'1.0-0' }} m</strong></div>
            <div><span class="lbl">Timestamp</span><strong>{{ pos()!.timestamp | date:'medium' }}</strong></div>
          </div>
        }
      </section>

      <section class="card">
        <h2>Load a saved route</h2>
        <p class="hint">Select a route — map updates automatically to that source &amp; destination.</p>
        @if (routesLoading()) {
          <p class="muted">Loading your routes…</p>
        } @else if (!myRoutes().length) {
          <p class="muted">No saved routes yet. Create one under <strong>My Routes</strong>.</p>
        } @else {
          <div class="load-row">
            <select
              [ngModel]="selectedRouteId"
              (ngModelChange)="onRouteSelected($event)"
              name="routePick">
              <option value="">— Select route —</option>
              @for (r of myRoutes(); track r.id) {
                <option [value]="r.id">
                  {{ r.sourceAddress }} → {{ r.destinationAddress }}
                  ({{ r.preferredDepartureTime }})
                </option>
              }
            </select>
            <button type="button" class="btn" (click)="loadSelectedRoute()" [disabled]="!selectedRouteId">
              Load on map
            </button>
          </div>
          @if (loadedLabel()) {
            <p class="ok">Showing: {{ loadedLabel() }}</p>
          }
        }
      </section>

      <section class="card">
        <h2>Route preview</h2>
        <div class="actions">
          <button type="button" class="btn ghost" (click)="usePosAsSource()">Source = my location</button>
          <button type="button" class="btn" (click)="updateRoute()">Update route map</button>
        </div>
        <div class="grid2 coords">
          <label>Source lat <input type="number" step="any" [(ngModel)]="srcLat" name="srcLat" (ngModelChange)="coordsEdited()" /></label>
          <label>Source lng <input type="number" step="any" [(ngModel)]="srcLng" name="srcLng" (ngModelChange)="coordsEdited()" /></label>
          <label>Dest lat <input type="number" step="any" [(ngModel)]="dstLat" name="dstLat" (ngModelChange)="coordsEdited()" /></label>
          <label>Dest lng <input type="number" step="any" [(ngModel)]="dstLng" name="dstLng" (ngModelChange)="coordsEdited()" /></label>
        </div>
        <p class="hint small">Prefer selecting a saved route above. Numbers are only for fine-tuning.</p>
        <app-route-map
          [originLat]="srcLat"
          [originLng]="srcLng"
          [destLat]="dstLat"
          [destLng]="dstLng"
          [refreshToken]="routeToken">
        </app-route-map>
      </section>

      <section class="card">
        <h2>Nearby drivers</h2>
        <p class="hint">Only drivers who shared location (privacy rules) appear here.</p>
        @if (pos()) {
          <app-driver-map [lat]="pos()!.latitude" [lng]="pos()!.longitude" [radiusKm]="5"></app-driver-map>
        } @else {
          <p class="muted">Get current location first.</p>
        }
      </section>
    </div>
  `,
  styles: [`
    .page { max-width: 800px; margin: 0 auto; }
    header { margin-bottom: 1.25rem; }
    h1 { margin: 0; font-size: 1.5rem; }
    header p { margin: 0.3rem 0 0; color: #94a3b8; font-size: 0.9rem; }
    .card {
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
      border-radius: 1.1rem; padding: 1.15rem; margin-bottom: 1rem;
    }
    h2 { margin: 0 0 0.85rem; font-size: 1rem; }
    .actions { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.85rem; }
    .btn {
      padding: 0.55rem 1rem; border-radius: 999px; border: none; font-weight: 600; cursor: pointer;
      background: linear-gradient(135deg,#5b8cff,#7c5cff); color: #fff;
    }
    .btn.ghost { background: transparent; border: 1px solid rgba(255,255,255,0.15); color: #e2e8f0; }
    .btn:disabled { opacity: 0.55; cursor: not-allowed; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem; margin-bottom: 0.75rem; }
    @media (max-width: 560px) { .grid2 { grid-template-columns: 1fr; } }
    label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.78rem; color: #94a3b8; }
    input, select {
      padding: 0.55rem 0.7rem; border-radius: 0.65rem; border: 1px solid rgba(255,255,255,0.12);
      background: rgba(0,0,0,0.3); color: #fff;
    }
    select { width: 100%; max-width: 100%; }
    .load-row { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
    .load-row select { flex: 1; min-width: 200px; }
    .lbl { display: block; font-size: 0.72rem; color: #64748b; }
    .err { color: #fca5a5; font-size: 0.88rem; }
    .ok { color: #6ee7b7; font-size: 0.88rem; margin-top: 0.5rem; }
    .muted, .hint { color: #94a3b8; font-size: 0.85rem; }
    .hint.small { font-size: 0.78rem; margin-top: -0.25rem; }
    .coords { opacity: 0.9; }
  `]
})
export class GpsPageComponent implements OnInit {
  private geo = inject(GeolocationService);
  private api = inject(LocationApiService);
  private routesApi = inject(RouteService);
  private toast = inject(ToastService);

  pos = this.geo.lastPosition;
  geoError = this.geo.error;
  locating = signal(false);
  actionMsg = signal('');
  loadedLabel = signal('');
  routesLoading = signal(false);
  myRoutes = signal<RouteDto[]>([]);

  selectedRouteId = '';
  srcLat = 33.6844;
  srcLng = 73.0479;
  dstLat = 33.6938;
  dstLng = 73.0652;
  routeToken = 0;

  ngOnInit(): void {
    this.loadMyRoutes();
  }

  loadMyRoutes(): void {
    this.routesLoading.set(true);
    this.routesApi.getMyRoutes().subscribe({
      next: res => {
        this.routesLoading.set(false);
        if (res.success && res.data) {
          this.myRoutes.set(res.data);
          // Auto-load first route so map is never stuck on defaults
          if (res.data.length > 0) {
            this.selectedRouteId = res.data[0].id;
            this.applyRoute(res.data[0]);
          }
        }
      },
      error: () => this.routesLoading.set(false)
    });
  }

  onRouteSelected(id: string): void {
    this.selectedRouteId = id || '';
    if (!id) {
      this.loadedLabel.set('');
      return;
    }
    this.loadSelectedRoute();
  }

  loadSelectedRoute(): void {
    const id = (this.selectedRouteId || '').trim();
    if (!id) {
      this.toast.error('Select a route first');
      return;
    }
    const r = this.myRoutes().find(x => String(x.id).toLowerCase() === id.toLowerCase());
    if (!r) {
      this.toast.error('Route not found in list');
      return;
    }
    this.applyRoute(r);
    this.toast.success('Route loaded on map');
  }

  private applyRoute(r: RouteDto): void {
    this.srcLat = Number(r.sourceLatitude);
    this.srcLng = Number(r.sourceLongitude);
    this.dstLat = Number(r.destinationLatitude);
    this.dstLng = Number(r.destinationLongitude);
    this.routeToken++;
    this.loadedLabel.set(`${r.sourceAddress} → ${r.destinationAddress}`);
    this.actionMsg.set(`Loaded route coordinates from My Routes`);
  }

  coordsEdited(): void {
    // User typed numbers manually — clear “loaded route” label
    // (map updates on next “Update route map”)
  }

  locate(): void {
    this.locating.set(true);
    this.actionMsg.set('');
    this.geo.getCurrentPosition().subscribe({
      next: p => {
        this.locating.set(false);
        this.srcLat = p.latitude;
        this.srcLng = p.longitude;
        this.actionMsg.set('Location acquired (source updated)');
        this.toast.success('Location acquired');
      },
      error: () => {
        this.locating.set(false);
        this.toast.error(this.geo.error() || 'Location failed');
      }
    });
  }

  usePosAsSource(): void {
    const p = this.pos();
    if (!p) {
      this.toast.error('Click “Use my location” first');
      return;
    }
    this.srcLat = p.latitude;
    this.srcLng = p.longitude;
    this.toast.success('Source = my location');
    this.updateRoute();
  }

  updateRoute(): void {
    this.routeToken++;
    this.actionMsg.set('Updating route…');
  }

  shareLocation(): void {
    const p = this.pos();
    if (!p) {
      this.toast.error('Get location first');
      return;
    }
    this.api.updateMine({
      latitude: p.latitude,
      longitude: p.longitude,
      accuracyMeters: p.accuracy,
      shareMode: 2
    }).subscribe({
      next: res => res.success ? this.toast.success('Location shared') : this.toast.error(res.message),
      error: err => this.toast.error(err.error?.message || 'Share failed')
    });
  }
}
