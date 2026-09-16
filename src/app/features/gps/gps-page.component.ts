import {
  Component, OnInit, OnDestroy, AfterViewInit, inject, signal,
  ElementRef, ViewChild, NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

declare const L: any;

@Component({
  selector: 'app-gps-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="rs-page">
      <header class="head">
        <div>
          <div class="chips">
            <span class="chip">Maps &amp; GPS</span>
            <span class="chip gold">OpenStreetMap · Leaflet</span>
          </div>
          <h1>Maps &amp; GPS</h1>
          <p class="sub">Use saved routes — no need to type coordinates every day.</p>
        </div>
        <a routerLink="/app/routes" class="btn ghost">My Routes</a>
      </header>

      <div class="layout">
        <section class="card panel">
          <h2>Location tools</h2>
          <button type="button" class="btn primary full" (click)="useMyLocation()" [disabled]="busy()">
            📍 Use my location
          </button>
          <button type="button" class="btn ghost full" (click)="shareToServer()" [disabled]="lat()==null || busy()">
            Share to server
          </button>

          <label class="lbl">Load my route
            <select class="inp" [(ngModel)]="selectedRouteId" name="rt" (ngModelChange)="loadRouteOnMap()">
              <option value="">Select saved route</option>
              @for (r of routes(); track r.id) {
                <option [value]="r.id">{{ r.sourceAddress }} → {{ r.destinationAddress }}</option>
              }
            </select>
          </label>

          <div class="coords">
            <div><span>Lat</span><strong>{{ lat() ?? '—' }}</strong></div>
            <div><span>Lng</span><strong>{{ lng() ?? '—' }}</strong></div>
          </div>

          @if (routeSource()) {
            <p class="route-line"><span class="dot g"></span> {{ routeSource() }}</p>
          }
          @if (routeDest()) {
            <p class="route-line"><span class="dot d"></span> {{ routeDest() }}</p>
          }

          @if (msg()) { <p class="ok">{{ msg() }}</p> }
          @if (err()) { <p class="err">{{ err() }}</p> }
        </section>

        <section class="card map-wrap">
          <div class="map-shell" #shell>
            <div #mapEl class="map-root"></div>
          </div>
          <div class="legend">
            <span><i class="dot g"></i> Source</span>
            <span><i class="dot d"></i> Destination</span>
            <span><i class="dot m"></i> Me</span>
          </div>
        </section>
      </div>

      <section class="card">
        <h2>Nearby drivers</h2>
        <button type="button" class="btn ghost" (click)="loadNearby()" [disabled]="lat()==null || busy()">
          Refresh nearby
        </button>
        @for (n of nearby(); track n.userId || n.id || $index) {
          <div class="near">
            <strong>{{ n.name || n.userName || 'Driver' }}</strong>
            <span class="muted">{{ n.distanceKm != null ? (n.distanceKm | number:'1.1-1') + ' km' : '' }}</span>
          </div>
        } @empty {
          <p class="muted">Share location, then refresh. Drivers who shared location may appear.</p>
        }
      </section>
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
    h2 { margin: 0 0 0.65rem; font-size: 1.05rem; font-weight: 800; }
    .sub { margin: 0.3rem 0 0; color: #64748b; font-size: 0.9rem; }
    .layout {
      display: grid;
      grid-template-columns: minmax(280px, 320px) minmax(0, 1fr);
      gap: 0.9rem;
      margin-bottom: 0.9rem;
      align-items: start;
    }
    @media (max-width: 900px) {
      .layout { grid-template-columns: 1fr; }
    }
    .card {
      background: #fff; border: 1px solid #b7ebc9; border-radius: 16px; padding: 1.1rem;
      box-shadow: 0 6px 18px rgba(15,23,42,0.04); margin-bottom: 0.9rem;
    }
    .btn {
      display: inline-flex; align-items: center; justify-content: center; min-height: 44px;
      padding: 0.5rem 1rem; border-radius: 999px; font-weight: 800; border: none; cursor: pointer;
      text-decoration: none; margin-bottom: 0.45rem;
    }
    .btn.primary { background: #0d9f6e; color: #fff; }
    .btn.ghost { background: #fff; border: 1px solid #e2e8f0; color: #0f172a; }
    .full { width: 100%; }
    .lbl { display: block; font-size: 0.78rem; font-weight: 700; color: #64748b; margin: 0.65rem 0; }
    .inp {
      display: block; width: 100%; margin-top: 0.3rem; min-height: 44px;
      padding: 0.5rem 0.75rem; border-radius: 12px; border: 1px solid #e2e8f0;
    }
    .coords { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.5rem; }
    .coords div {
      background: #f8fafc; border-radius: 10px; padding: 0.5rem 0.65rem; font-size: 0.85rem;
    }
    .coords span { display: block; color: #64748b; font-size: 0.72rem; }
    .route-line { display: flex; gap: 0.45rem; align-items: flex-start; font-size: 0.88rem; margin: 0.35rem 0; }
    .dot {
      width: 10px; height: 10px; border-radius: 50%; display: inline-block;
      margin-top: 4px; flex-shrink: 0;
    }
    .dot.g { background: #0d9f6e; }
    .dot.d { background: #e11d48; }
    .dot.m { background: #2563eb; }

    /* CRITICAL: map must fill full column width */
    .map-wrap {
      padding: 0.75rem;
      min-width: 0; /* grid fix */
      width: 100%;
    }
    .map-shell {
      position: relative;
      width: 100%;
      height: 420px;
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      background: #cfd8dc;
    }
    .map-root {
      position: absolute;
      inset: 0;
      width: 100% !important;
      height: 100% !important;
    }
    :host ::ng-deep .leaflet-container {
      width: 100% !important;
      height: 100% !important;
      background: #cfd8dc;
    }
    :host ::ng-deep .leaflet-tile-pane,
    :host ::ng-deep .leaflet-map-pane {
      width: 100%;
    }

    .legend {
      display: flex; gap: 1rem; font-size: 0.8rem; color: #475569; margin-top: 0.55rem;
    }
    .legend span { display: inline-flex; align-items: center; gap: 0.35rem; }
    .near {
      display: flex; justify-content: space-between; padding: 0.55rem 0; border-bottom: 1px solid #f1f5f9;
    }
    .muted { color: #64748b; } .err { color: #e11d48; } .ok { color: #0d9f6e; }
  `]
})
export class GpsPageComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapEl') mapEl!: ElementRef<HTMLDivElement>;
  @ViewChild('shell') shell!: ElementRef<HTMLDivElement>;

  private http = inject(HttpClient);
  private zone = inject(NgZone);
  private api = (environment.apiUrl || '/api/v1').replace(/\/$/, '');

  private map: any = null;
  private layer: any = null;
  private resizeObs: ResizeObserver | null = null;
  private onWinResize = () => this.fixSize();

  routes = signal<any[]>([]);
  nearby = signal<any[]>([]);
  selectedRouteId = '';
  lat = signal<number | null>(null);
  lng = signal<number | null>(null);
  routeSource = signal('');
  routeDest = signal('');
  srcLat = signal<number | null>(null);
  srcLng = signal<number | null>(null);
  dstLat = signal<number | null>(null);
  dstLng = signal<number | null>(null);
  busy = signal(false);
  msg = signal('');
  err = signal('');

  ngOnInit(): void {
    this.http.get<any>(`${this.api}/routes/my`).subscribe({
      next: (r) => {
        const d = r?.data ?? r;
        this.routes.set(Array.isArray(d) ? d : d?.items ?? []);
      }
    });
  }

  ngAfterViewInit(): void {
    // Layout must settle (grid column width) before Leaflet measures the container
    requestAnimationFrame(() => {
      setTimeout(() => this.initMap(), 80);
    });
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onWinResize);
    this.resizeObs?.disconnect();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private initMap(): void {
    if (typeof L === 'undefined') {
      this.err.set('Leaflet not loaded. Add leaflet CSS/JS in index.html');
      return;
    }
    if (!this.mapEl?.nativeElement || this.map) return;

    this.zone.runOutsideAngular(() => {
      const el = this.mapEl.nativeElement;
      const shell = this.shell?.nativeElement;
      const w = Math.max(shell?.clientWidth || el.clientWidth || 600, 280);
      const h = Math.max(shell?.clientHeight || 420, 300);
      el.style.width = w + 'px';
      el.style.height = h + 'px';

      this.map = L.map(el, {
        zoomControl: true,
        preferCanvas: false
      }).setView([33.6844, 73.0479], 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }).addTo(this.map);

      this.layer = L.layerGroup().addTo(this.map);

      // Fix partial tiles after grid/layout
      this.fixSize();
      setTimeout(() => this.fixSize(), 150);
      setTimeout(() => this.fixSize(), 400);
      setTimeout(() => this.fixSize(), 800);

      window.addEventListener('resize', this.onWinResize);

      if (typeof ResizeObserver !== 'undefined' && shell) {
        this.resizeObs = new ResizeObserver(() => this.fixSize());
        this.resizeObs.observe(shell);
      }
    });
  }

  private fixSize(): void {
    if (!this.map || !this.mapEl?.nativeElement) return;
    this.zone.runOutsideAngular(() => {
      const el = this.mapEl.nativeElement;
      const shell = this.shell?.nativeElement;
      const w = Math.max(shell?.clientWidth || el.parentElement?.clientWidth || 0, 280);
      const h = Math.max(shell?.clientHeight || 420, 300);
      el.style.width = w + 'px';
      el.style.height = h + 'px';
      this.map.invalidateSize(true);
    });
  }

  private pin(color: string): any {
    return L.divIcon({
      className: '',
      html: `<div style="
        width:14px;height:14px;border-radius:50% 50% 50% 0;background:${color};
        border:2px solid #fff;transform:rotate(-45deg);box-shadow:0 2px 5px rgba(0,0,0,.35)"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 14]
    });
  }

  private redraw(): void {
    if (!this.map) this.initMap();
    if (!this.map || !this.layer) return;

    this.zone.runOutsideAngular(() => {
      this.layer.clearLayers();
      const bounds: [number, number][] = [];

      const la = this.lat();
      const ln = this.lng();
      if (la != null && ln != null) {
        L.marker([la, ln], { icon: this.pin('#2563eb') }).bindPopup('Me').addTo(this.layer);
        bounds.push([la, ln]);
      }

      const sla = this.srcLat();
      const sln = this.srcLng();
      if (sla != null && sln != null) {
        L.marker([sla, sln], { icon: this.pin('#0d9f6e') })
          .bindPopup(this.routeSource() || 'Source')
          .addTo(this.layer);
        bounds.push([sla, sln]);
      }

      const dla = this.dstLat();
      const dln = this.dstLng();
      if (dla != null && dln != null) {
        L.marker([dla, dln], { icon: this.pin('#e11d48') })
          .bindPopup(this.routeDest() || 'Destination')
          .addTo(this.layer);
        bounds.push([dla, dln]);
      }

      if (sla != null && sln != null && dla != null && dln != null) {
        L.polyline([[sla, sln], [dla, dln]], {
          color: '#0d9f6e', weight: 4, opacity: 0.85
        }).addTo(this.layer);
      }

      if (bounds.length > 1) {
        this.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      } else if (bounds.length === 1) {
        this.map.setView(bounds[0], 14);
      }

      this.fixSize();
    });
  }

  useMyLocation(): void {
    this.err.set(''); this.msg.set('');
    if (!navigator.geolocation) {
      this.err.set('Geolocation not supported');
      return;
    }
    this.busy.set(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.lat.set(+pos.coords.latitude.toFixed(6));
        this.lng.set(+pos.coords.longitude.toFixed(6));
        this.busy.set(false);
        this.msg.set('Location captured');
        this.redraw();
      },
      () => {
        this.busy.set(false);
        this.err.set('Location permission denied or unavailable');
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  shareToServer(): void {
    if (this.lat() == null || this.lng() == null) return;
    this.busy.set(true);
    this.http.post<any>(`${this.api}/locations/me`, {
      latitude: this.lat(),
      longitude: this.lng(),
      accuracyMeters: 20,
      shareMode: 2
    }).subscribe({
      next: (r) => {
        this.busy.set(false);
        this.msg.set(r?.message || 'Location shared');
      },
      error: (e) => {
        this.busy.set(false);
        this.err.set(e.error?.message || 'Share failed');
      }
    });
  }

  loadRouteOnMap(): void {
    const r = this.routes().find((x) => String(x.id) === String(this.selectedRouteId));
    if (!r) return;

    this.routeSource.set(r.sourceAddress || '');
    this.routeDest.set(r.destinationAddress || '');
    this.srcLat.set(r.sourceLatitude != null ? Number(r.sourceLatitude) : null);
    this.srcLng.set(r.sourceLongitude != null ? Number(r.sourceLongitude) : null);
    this.dstLat.set(r.destinationLatitude != null ? Number(r.destinationLatitude) : null);
    this.dstLng.set(r.destinationLongitude != null ? Number(r.destinationLongitude) : null);

    this.msg.set('Route loaded on map');
    this.redraw();
  }

  loadNearby(): void {
    if (this.lat() == null) return;
    this.busy.set(true);
    this.http.get<any>(`${this.api}/locations/nearby`, {
      params: {
        latitude: String(this.lat()),
        longitude: String(this.lng()),
        radiusKm: '10'
      }
    }).subscribe({
      next: (r) => {
        const d = r?.data ?? r;
        this.nearby.set(Array.isArray(d) ? d : d?.items ?? []);
        this.busy.set(false);
      },
      error: () => {
        this.busy.set(false);
        this.msg.set('Nearby list optional — share location from two accounts to test');
      }
    });
  }
}
