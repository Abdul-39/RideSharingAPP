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

          @if (currentPlaceName()) {
            <div class="cur-place">
              <span class="cp-lbl">📍 DETECTED LOCATION</span>
              <strong class="cp-val">{{ currentPlaceName() }}</strong>
            </div>
          }

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
        }
      </section>
    </div>
  `,
  styles: [`
    .rs-page { padding: 1rem 1.25rem 2rem; max-width: 1100px; margin: 0 auto; }
    .head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
    .chips { display: flex; gap: 0.35rem; flex-wrap: wrap; margin-bottom: 0.35rem; }
    .chip { font-size: 0.72rem; font-weight: 700; padding: 0.2rem 0.55rem; border-radius: 999px; background: #ecfdf5; color: #047857; }
    .chip.gold { background: #fffbeb; color: #b45309; }
    h1 { margin: 0; font-size: 1.55rem; color: #0f172a; }
    .sub { margin: 0.25rem 0 0; color: #64748b; font-size: 0.92rem; }
    .layout {
      display: grid;
      grid-template-columns: minmax(260px, 320px) 1fr;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    @media (max-width: 800px) { .layout { grid-template-columns: 1fr; } }
    .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 1rem 1.1rem; }
    .panel h2 { margin: 0 0 0.75rem; font-size: 1rem; }
    .btn {
      display: inline-flex; align-items: center; justify-content: center; min-height: 44px;
      border-radius: 12px; border: none; font-weight: 700; cursor: pointer; text-decoration: none;
      padding: 0.5rem 1rem; font-size: 0.9rem;
    }
    .btn.full { width: 100%; margin-bottom: 0.5rem; }
    .btn.primary { background: #0d9f6e; color: #fff; }
    .btn.ghost { background: #f1f5f9; color: #0f172a; }
    .btn:disabled { opacity: 0.55; cursor: not-allowed; }
    .lbl { display: block; font-size: 0.78rem; font-weight: 700; color: #64748b; margin: 0.65rem 0; }
    .inp {
      display: block; width: 100%; margin-top: 0.3rem; min-height: 44px;
      border: 1px solid #e2e8f0; border-radius: 10px; padding: 0.4rem 0.65rem; font-size: 0.9rem;
    }
    .cur-place {
      margin-top: 0.75rem; padding: 0.75rem; border-radius: 12px;
      background: #ecfdf5; border: 1px solid #a7f3d0;
    }
    .cp-lbl { display: block; font-size: 0.68rem; font-weight: 800; color: #065f46; margin-bottom: 0.2rem; }
    .cp-val { display: block; font-size: 0.88rem; color: #0f172a; word-break: break-word; }
    .route-line { display: flex; gap: 0.45rem; align-items: flex-start; font-size: 0.88rem; margin: 0.35rem 0; }
    .dot {
      width: 10px; height: 10px; border-radius: 50%; display: inline-block;
      margin-top: 4px; flex-shrink: 0;
    }
    .dot.g { background: #0d9f6e; }
    .dot.d { background: #e11d48; }
    .dot.m { background: #3b82f6; }
    .map-wrap { padding: 0; overflow: hidden; }
    .map-shell {
      position: relative;
      width: 100%;
      height: 380px;
      min-height: 280px;
      background: #e2e8f0;
    }
    .map-root {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
    }
    .legend {
      display: flex; gap: 1rem; padding: 0.65rem 1rem; background: #f8fafc;
      border-top: 1px solid #e2e8f0; font-size: 0.8rem; color: #64748b;
    }
    .legend span { display: flex; align-items: center; gap: 0.35rem; }
    .legend i { margin: 0; }
    .near {
      display: flex; justify-content: space-between; padding: 0.55rem 0;
      border-bottom: 1px solid #f1f5f9; font-size: 0.88rem;
    }
    .muted { color: #64748b; font-size: 0.85rem; }
    .ok { color: #0d9f6e; font-size: 0.85rem; margin-top: 0.4rem; }
    .err { color: #e11d48; font-size: 0.85rem; margin-top: 0.4rem; }
  `]
})
export class GpsPageComponent implements OnInit, OnDestroy, AfterViewInit {
  private http = inject(HttpClient);
  private zone = inject(NgZone);
  private api = (environment.apiUrl || '/api/v1').replace(/\/$/, '');

  @ViewChild('mapEl') mapEl!: ElementRef<HTMLDivElement>;
  @ViewChild('shell') shellEl!: ElementRef<HTMLDivElement>;

  private map: any = null;
  private layer: any = null;
  private resizeObs: ResizeObserver | null = null;
  private onWinResize = () => this.fixSize();

  routes = signal<any[]>([]);
  nearby = signal<any[]>([]);
  selectedRouteId = '';
  lat = signal<number | null>(null);
  lng = signal<number | null>(null);
  /** Address from reverse geocode — any place, any day (no hardcoded list) */
  currentPlaceName = signal('');
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
    requestAnimationFrame(() => {
      setTimeout(() => this.initMap(), 80);
    });
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onWinResize);
    this.resizeObs?.disconnect();
    this.resizeObs = null;
    if (this.map) {
      try { this.map.remove(); } catch { /* ignore */ }
      this.map = null;
    }
  }

  private initMap(): void {
    if (typeof L === 'undefined' || !this.mapEl?.nativeElement) return;
    if (this.map) return;

    this.zone.runOutsideAngular(() => {
      const el = this.mapEl.nativeElement;
      this.map = L.map(el, {
        center: [33.6844, 73.0479],
        zoom: 12,
        zoomControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }).addTo(this.map);

      this.layer = L.layerGroup().addTo(this.map);

      const shell = this.shellEl?.nativeElement;
      if (shell && typeof ResizeObserver !== 'undefined') {
        this.resizeObs = new ResizeObserver(() => this.fixSize());
        this.resizeObs.observe(shell);
      }
      window.addEventListener('resize', this.onWinResize);

      this.fixSize();
      this.redraw();
    });
  }

  private fixSize(): void {
    if (!this.map) return;
    this.zone.runOutsideAngular(() => {
      requestAnimationFrame(() => {
        try { this.map.invalidateSize(); } catch { /* ignore */ }
      });
    });
  }

  private pin(color: string): any {
    return L.divIcon({
      className: 'rs-leaflet-pin',
      html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.35);"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });
  }

  private redraw(): void {
    if (!this.map || !this.layer) return;

    this.zone.runOutsideAngular(() => {
      this.layer.clearLayers();
      const bounds: [number, number][] = [];

      const la = this.lat();
      const ln = this.lng();
      if (la != null && ln != null) {
        L.marker([la, ln], { icon: this.pin('#3b82f6') })
          .bindPopup('You are here')
          .addTo(this.layer);
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

      if (bounds.length > 1) {
        this.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      } else if (bounds.length === 1) {
        this.map.setView(bounds[0], 14);
      }

      this.fixSize();
    });
  }

  useMyLocation(): void {
    this.err.set('');
    this.msg.set('');
    this.currentPlaceName.set('');

    if (!navigator.geolocation) {
      this.err.set('Geolocation not supported');
      return;
    }

    this.busy.set(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const la = +pos.coords.latitude.toFixed(6);
        const ln = +pos.coords.longitude.toFixed(6);
        const acc = Math.round(pos.coords.accuracy || 0);

        this.lat.set(la);
        this.lng.set(ln);
        this.msg.set(`Location captured (±${acc} m)`);

        if (this.map) {
          this.zone.runOutsideAngular(() => {
            try { this.map.setView([la, ln], 15); } catch { /* ignore */ }
          });
        }
        this.redraw();

        // Address from coordinates — any place in the world, no place list
        this.http
          .get<any>(`${this.api}/geo/reverse`, {
            params: { lat: String(la), lng: String(ln) }
          })
          .subscribe({
            next: (r) => {
              const d = r?.data ?? r;
              const name =
                d?.displayName ||
                d?.DisplayName ||
                d?.address ||
                d?.formattedAddress ||
                `${la}, ${ln}`;
              this.currentPlaceName.set(String(name));
              this.busy.set(false);
            },
            error: () => {
              this.currentPlaceName.set(`${la}, ${ln}`);
              this.busy.set(false);
            }
          });
      },
      (err) => {
        this.busy.set(false);
        if (err?.code === 1) {
          this.err.set('Location permission denied. Allow location for this site.');
        } else if (err?.code === 3) {
          this.err.set('GPS timeout. Try outdoors or on a phone.');
        } else {
          this.err.set('Location permission denied or unavailable');
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
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