import { Component, Input, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapComponent, MapMarker } from './map.component';
import { LocationApiService, RouteCalculationResult } from '../../core/services/location-api.service';

@Component({
  selector: 'app-route-map',
  standalone: true,
  imports: [CommonModule, MapComponent],
  template: `
    <div class="panel">
      <app-map
        [center]="center()"
        [markers]="markers()"
        [path]="path()"
        [zoom]="12">
      </app-map>
      <div class="stats">
        @if (loading()) {
          <span class="muted">Calculating route…</span>
        } @else if (error()) {
          <span class="err">{{ error() }}</span>
        } @else if (result()) {
          <span><strong>{{ result()!.distanceKm }}</strong> km</span>
          <span><strong>{{ result()!.durationMinutes }}</strong> min ETA</span>
          <span class="muted">{{ result()!.provider }}</span>
        } @else {
          <span class="muted">Load a route or click Update route map</span>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .panel { display: flex; flex-direction: column; gap: 0.65rem; width: 100%; }
    .stats { display: flex; flex-wrap: wrap; gap: 1rem; font-size: 0.9rem; color: #e2e8f0; }
    .muted { color: #94a3b8; }
    .err { color: #fca5a5; }
  `]
})
export class RouteMapComponent implements OnChanges {
  @Input() refreshToken = 0;
  @Input() originLat?: number;
  @Input() originLng?: number;
  @Input() destLat?: number;
  @Input() destLng?: number;

  private api = inject(LocationApiService);
  result = signal<RouteCalculationResult | null>(null);
  loading = signal(false);
  error = signal('');
  markers = signal<MapMarker[]>([]);
  path = signal<{ lat: number; lng: number }[]>([]);
  center = signal({ lat: 33.6844, lng: 73.0479 });

  ngOnChanges(changes: SimpleChanges): void {
    if (
      this.originLat == null || this.originLng == null ||
      this.destLat == null || this.destLng == null
    ) return;

    if (
      changes['refreshToken'] ||
      changes['originLat'] || changes['originLng'] ||
      changes['destLat'] || changes['destLng']
    ) {
      this.loadRoute();
    }
  }

  private loadRoute(): void {
    const oLat = Number(this.originLat);
    const oLng = Number(this.originLng);
    const dLat = Number(this.destLat);
    const dLng = Number(this.destLng);
    if ([oLat, oLng, dLat, dLng].some(v => Number.isNaN(v))) {
      this.error.set('Invalid coordinates');
      return;
    }

    this.markers.set([
      { lat: oLat, lng: oLng, label: 'Source (A)' },
      { lat: dLat, lng: dLng, label: 'Destination (B)' }
    ]);
    this.center.set({ lat: oLat, lng: oLng });
    this.loading.set(true);
    this.error.set('');

    this.api.calculateRoute(oLat, oLng, dLat, dLng).subscribe({
      next: res => {
        this.loading.set(false);
        if (res.success && res.data) {
          this.result.set(res.data);
          const pts = (res.data.polylinePoints || []).map(p => ({
            lat: p.latitude, lng: p.longitude
          }));
          this.path.set(pts.length >= 2 ? pts : [
            { lat: oLat, lng: oLng }, { lat: dLat, lng: dLng }
          ]);
        } else {
          this.error.set(res.message || 'Route failed');
          this.path.set([{ lat: oLat, lng: oLng }, { lat: dLat, lng: dLng }]);
        }
      },
      error: err => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Route service unavailable');
        this.path.set([{ lat: oLat, lng: oLng }, { lat: dLat, lng: dLng }]);
      }
    });
  }
}
