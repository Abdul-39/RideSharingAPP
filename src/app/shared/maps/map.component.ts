import {
  Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges,
  ViewChild, AfterViewInit, NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface MapMarker {
  lat: number;
  lng: number;
  label?: string;
}

declare const L: any;

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="map-shell" #shell>
      <div #mapEl class="map-root"></div>
      @if (error) {
        <div class="err">{{ error }}</div>
      }
      <div class="badge">© OpenStreetMap · Leaflet (free)</div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 300px;
    }
    .map-shell {
      position: relative;
      width: 100%;
      height: 300px;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.12);
      background: #cfd8dc;
    }
    .map-root {
      width: 100%;
      height: 300px;
    }
    :host ::ng-deep .leaflet-container {
      width: 100% !important;
      height: 300px !important;
      background: #cfd8dc;
    }
    :host ::ng-deep .rs-pin {
      background: #2563eb;
      border: 2px solid #fff;
      border-radius: 50% 50% 50% 0;
      width: 16px;
      height: 16px;
      transform: rotate(-45deg);
      box-shadow: 0 2px 5px rgba(0,0,0,0.4);
    }
    .err {
      position: absolute; left: 8px; right: 8px; bottom: 28px; z-index: 1000;
      text-align: center; padding: 6px; border-radius: 6px;
      background: rgba(180,40,40,0.9); color: #fff; font-size: 12px;
    }
    .badge {
      position: absolute; right: 8px; bottom: 6px; z-index: 1000;
      font-size: 10px; color: #334155; background: rgba(255,255,255,0.92);
      padding: 2px 6px; border-radius: 4px; pointer-events: none;
    }
  `]
})
export class MapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapEl', { static: true }) mapEl!: ElementRef<HTMLDivElement>;
  @ViewChild('shell', { static: true }) shell!: ElementRef<HTMLDivElement>;
  @Input() center: { lat: number; lng: number } = { lat: 33.6844, lng: 73.0479 };
  @Input() zoom = 12;
  @Input() markers: MapMarker[] = [];
  @Input() path: { lat: number; lng: number }[] = [];

  error = '';
  private map: any;
  private layerGroup: any;
  private ready = false;
  private ro?: ResizeObserver;
  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor(private zone: NgZone) {}

  ngAfterViewInit(): void {
    this.timers.push(setTimeout(() => this.boot(), 120));
  }

  ngOnChanges(_c: SimpleChanges): void {
    if (this.ready) {
      this.timers.push(setTimeout(() => {
        this.redraw();
        this.invalidate();
      }, 60));
    }
  }

  ngOnDestroy(): void {
    this.timers.forEach(clearTimeout);
    this.ro?.disconnect();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private boot(): void {
    if (typeof L === 'undefined') {
      this.error = 'Leaflet not loaded. Check index.html / internet.';
      return;
    }

    const el = this.mapEl.nativeElement;
    const shell = this.shell.nativeElement;
    const width = Math.max(shell.clientWidth || 600, 280);
    el.style.width = width + 'px';
    el.style.height = '300px';

    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    this.zone.runOutsideAngular(() => {
      this.map = L.map(el, {
        center: [this.center.lat, this.center.lng],
        zoom: this.zoom,
        zoomControl: true,
        minZoom: 3,
        maxZoom: 18
      });

      // Free OSM tiles — better zoom coverage than Esri (no "Map data not yet available")
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        minZoom: 3,
        maxZoom: 19
      }).addTo(this.map);

      this.layerGroup = L.layerGroup().addTo(this.map);
    });

    this.ready = true;
    this.redraw();
    this.invalidate();

    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(() => this.invalidate());
      this.ro.observe(shell);
    }

    this.timers.push(setTimeout(() => this.invalidate(), 200));
    this.timers.push(setTimeout(() => this.invalidate(), 500));
    this.timers.push(setTimeout(() => this.invalidate(), 1000));
  }

  private invalidate(): void {
    if (!this.map) return;
    const el = this.mapEl.nativeElement;
    const shell = this.shell.nativeElement;
    const width = Math.max(shell.clientWidth || 600, 280);
    el.style.width = width + 'px';
    el.style.height = '300px';
    this.zone.runOutsideAngular(() => this.map.invalidateSize(true));
  }

  private pinIcon(): any {
    return L.divIcon({
      className: '',
      html: '<div class="rs-pin"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 16],
      popupAnchor: [0, -14]
    });
  }

  private redraw(): void {
    if (!this.map || !this.layerGroup) return;

    this.zone.runOutsideAngular(() => {
      this.layerGroup.clearLayers();
      const bounds: [number, number][] = [];
      const icon = this.pinIcon();

      for (const m of this.markers || []) {
        const marker = L.marker([m.lat, m.lng], { icon }).addTo(this.layerGroup);
        if (m.label) marker.bindPopup(String(m.label));
        bounds.push([m.lat, m.lng]);
      }

      if (this.path && this.path.length > 1) {
        const latlngs = this.path.map(p => [p.lat, p.lng] as [number, number]);
        L.polyline(latlngs, { color: '#2563eb', weight: 5, opacity: 0.95 }).addTo(this.layerGroup);
        latlngs.forEach(ll => bounds.push(ll));
      }

      if (bounds.length > 1) {
        this.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      } else if (bounds.length === 1) {
        this.map.setView(bounds[0], 14);
      } else {
        this.map.setView([this.center.lat, this.center.lng], this.zoom);
      }
    });
    this.error = '';
  }
}