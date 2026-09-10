import { Component, Input, OnChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapComponent, MapMarker } from './map.component';
import { LocationApiService, NearbyDriverDto } from '../../core/services/location-api.service';

@Component({
  selector: 'app-driver-map',
  standalone: true,
  imports: [CommonModule, MapComponent],
  template: `
    <div class="panel">
      <app-map [center]="center()" [markers]="markers()" [zoom]="13"></app-map>
      <div class="list">
        @if (loading()) { <p class="muted">Loading nearby drivers…</p> }
        @else if (error()) { <p class="err">{{ error() }}</p> }
        @else if (!drivers().length) { <p class="muted">No nearby drivers sharing location.</p> }
        @else {
          @for (d of drivers(); track d.userId) {
            <div class="row">
              <strong>{{ d.fullName }}</strong>
              <span class="muted">{{ d.vehicleInfo || 'Vehicle' }} · {{ d.distanceKm }} km</span>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .panel { display: flex; flex-direction: column; gap: 0.75rem; width: 100%; }
    .list { display: flex; flex-direction: column; gap: 0.4rem; }
    .row { padding: 0.65rem 0.8rem; border-radius: 0.75rem;
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); }
    .row strong { display: block; font-size: 0.9rem; }
    .muted { color: #94a3b8; font-size: 0.8rem; }
    .err { color: #fca5a5; }
  `]
})
export class DriverMapComponent implements OnChanges {
  @Input() lat?: number;
  @Input() lng?: number;
  @Input() radiusKm = 5;

  private api = inject(LocationApiService);
  drivers = signal<NearbyDriverDto[]>([]);
  markers = signal<MapMarker[]>([]);
  center = signal({ lat: 33.6844, lng: 73.0479 });
  loading = signal(false);
  error = signal('');

  ngOnChanges(): void {
    if (this.lat == null || this.lng == null) return;
    this.center.set({ lat: this.lat, lng: this.lng });
    this.loading.set(true);
    this.error.set('');
    this.api.nearbyDrivers(this.lat, this.lng, this.radiusKm).subscribe({
      next: res => {
        this.loading.set(false);
        if (res.success && res.data) {
          this.drivers.set(res.data);
          const ms: MapMarker[] = [{ lat: this.lat!, lng: this.lng!, label: 'You' }];
          res.data.forEach(d => ms.push({ lat: d.latitude, lng: d.longitude, label: d.fullName }));
          this.markers.set(ms);
        } else this.error.set(res.message || 'Failed');
      },
      error: err => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Failed');
      }
    });
  }
}
