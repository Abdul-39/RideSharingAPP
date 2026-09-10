import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RideDto, RideService } from '../../core/services/ride.service';
import { SafetyApiService } from '../../core/services/safety.service';
import { RatingService } from '../../core/services/rating.service';
import { SignalRService } from '../../core/services/signalr.service';
import { GeolocationService } from '../../core/services/geolocation.service';

@Component({
  selector: 'app-ride-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page">
      <div class="orb o1"></div>
      <div class="orb o2"></div>

      @if (ride(); as r) {
        <div class="wrap animate-in">
          <div class="top-bar">
            <a routerLink="/app/rides/lifecycle" [queryParams]="{filter:'upcoming'}" class="back">
              <span>←</span> My Rides
            </a>
            <span class="live-badge" *ngIf="!isTerminal(r.status)">
              <span class="pulse"></span> Live
            </span>
          </div>

          <div class="card">
            <div class="status-row">
              <span class="status" [attr.data-s]="r.status">{{ prettyStatus(r.status) }}</span>
              <span class="time">{{ r.travelDate }} · {{ r.scheduledDepartureTime }}</span>
            </div>

            <div class="route-block">
              <div class="point">
                <span class="pin start"></span>
                <div>
                  <small>From</small>
                  <strong>{{ r.sourceAddress }}</strong>
                </div>
              </div>
              <div class="line"></div>
              <div class="point">
                <span class="pin end"></span>
                <div>
                  <small>To</small>
                  <strong>{{ r.destinationAddress }}</strong>
                </div>
              </div>
            </div>

            <p class="vehicle" *ngIf="r.vehicleInfo">🚗 {{ r.vehicleInfo }}</p>

            <div class="hint" [class.live]="isActive(r.status)">
              {{ statusMessage(r.status, r.cancellationReason) }}
            </div>
            @if (liveNote()) {
              <p class="live-line">📡 {{ liveNote() }} · {{ liveConnection() }}</p>
            }
            @if (lastPeerLocation(); as loc) {
              <p class="live-line peer">Peer ({{ loc.role }}): {{ loc.lat | number:'1.5-5' }}, {{ loc.lng | number:'1.5-5' }}</p>
            }

            <h3>People on this ride</h3>
            <div class="people">
              @for (p of r.participants; track p.userId) {
                <div class="person">
                  <div class="avatar">{{ p.fullName.charAt(0) }}</div>
                  <div class="pinfo">
                    <strong>{{ p.fullName }}</strong>
                    <span>{{ p.role }}</span>
                  </div>
                  @if (p.hasConfirmed) {
                    <span class="check">✓</span>
                  }
                </div>
              }
            </div>

            <div class="actions">
              @if (canConfirm()) {
                <button class="btn primary" (click)="act('confirm')">Confirm ride</button>
              }
              @if (isDriver() && r.status === 'Confirmed') {
                <button class="btn primary" (click)="act('arriving')">I'm on the way</button>
              }
              @if (isDriver() && r.status === 'DriverArriving') {
                <button class="btn primary" (click)="act('arrived')">I've arrived</button>
              }
              @if (r.status === 'DriverArrived') {
                <button class="btn primary" (click)="act('start')">Start ride</button>
              }
              @if (r.status === 'InProgress') {
                <button class="btn success" (click)="act('complete')">Complete ride</button>
              }
              @if (canCancel()) {
                <button class="btn danger" (click)="act('cancel')">Cancel</button>
              }
              @if (isActive(r.status)) {
                <button class="btn sos" type="button" (click)="triggerSos()">🚨 SOS</button>
              }
              @if (r.status === 'Completed') {
                <div class="rate-box">
                  <h3>Rate other participant</h3>
                  <select [(ngModel)]="rateTargetId">
                    <option value="">Select person</option>
                    @for (p of r.participants; track p.userId) {
                      @if (p.userId !== getUserId()) {
                        <option [value]="p.userId">{{ p.fullName }} ({{ p.role }})</option>
                      }
                    }
                  </select>
                  <select [(ngModel)]="rateStars">
                    <option [ngValue]="5">5 stars</option>
                    <option [ngValue]="4">4 stars</option>
                    <option [ngValue]="3">3 stars</option>
                    <option [ngValue]="2">2 stars</option>
                    <option [ngValue]="1">1 star</option>
                  </select>
                  <input [(ngModel)]="rateReview" placeholder="Optional review" />
                  <button type="button" class="btn primary" (click)="submitRating()">Submit rating</button>
                </div>
              }
            </div>

            @if (message()) { <div class="toast ok">{{ message() }}</div> }
            @if (error()) { <div class="toast err">{{ error() }}</div> }

            <div class="timeline">
              <h3>Timeline</h3>
              @for (h of r.history; track h.changedAt; let last = $last) {
                <div class="tl-item" [class.last]="last">
                  <div class="tl-dot"></div>
                  <div class="tl-body">
                    <strong>{{ h.fromStatus }} → {{ h.toStatus }}</strong>
                    <span>{{ h.changedAt | date:'medium' }}</span>
                    <em *ngIf="h.note">{{ h.note }}</em>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      } @else if (error()) {
        <div class="toast err center">{{ error() }}</div>
      } @else {
        <div class="loader"><div class="spinner"></div><p>Loading ride…</p></div>
      }
    </div>
  `,
  styles: [`
    .page { min-height: 100vh; position: relative; padding: 1.5rem 1rem 3rem; font-family: var(--font); }
    .orb { position: absolute; border-radius: 50%; filter: blur(70px); pointer-events: none; }
    .o1 { width: 300px; height: 300px; background: rgba(91,140,255,.15); top: -40px; right: -40px; }
    .o2 { width: 220px; height: 220px; background: rgba(34,211,238,.08); bottom: 10%; left: -40px; }
    .wrap { max-width: 520px; margin: 0 auto; position: relative; z-index: 2; }
    .top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .back {
      display: inline-flex; align-items: center; gap: 0.4rem; color: #93c5fd; font-size: 0.9rem; font-weight: 500;
      padding: 0.4rem 0.8rem; border-radius: 999px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
      transition: background 0.2s;
    }
    .back:hover { background: rgba(255,255,255,0.08); }
    .live-badge {
      display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; font-weight: 600;
      color: #6ee7b7; background: rgba(52,211,153,0.12); border: 1px solid rgba(52,211,153,0.25);
      padding: 0.3rem 0.7rem; border-radius: 999px;
    }
    .pulse {
      width: 7px; height: 7px; border-radius: 50%; background: #34d399;
      animation: pulse-glow 1.8s infinite;
    }
    .card {
      background: rgba(255,255,255,0.045); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 1.5rem; padding: 1.5rem; backdrop-filter: blur(20px);
      box-shadow: 0 24px 60px rgba(0,0,0,0.4);
    }
    .status-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.25rem; }
    .status {
      padding: 0.4rem 0.9rem; border-radius: 999px; font-weight: 700; font-size: 0.85rem;
      background: linear-gradient(135deg, #5b8cff, #7c5cff); color: #fff;
    }
    .status[data-s="Completed"] { background: linear-gradient(135deg, #059669, #34d399); }
    .status[data-s="Cancelled"] { background: linear-gradient(135deg, #b91c1c, #f87171); }
    .status[data-s="InProgress"], .status[data-s="DriverArriving"], .status[data-s="DriverArrived"] {
      background: linear-gradient(135deg, #0891b2, #22d3ee); color: #042f2e;
    }
    .time { color: #94a3b8; font-size: 0.85rem; }

    .route-block {
      background: rgba(0,0,0,0.25); border-radius: 1rem; padding: 1rem 1.1rem; margin-bottom: 1rem;
    }
    .point { display: flex; gap: 0.75rem; align-items: flex-start; }
    .point small { display: block; color: #64748b; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em; }
    .point strong { font-size: 1rem; font-weight: 600; }
    .pin {
      width: 12px; height: 12px; border-radius: 50%; margin-top: 0.35rem; flex-shrink: 0;
      box-shadow: 0 0 0 4px rgba(91,140,255,0.2);
    }
    .pin.start { background: #5b8cff; }
    .pin.end { background: #22d3ee; box-shadow: 0 0 0 4px rgba(34,211,238,0.2); }
    .line {
      width: 2px; height: 18px; background: linear-gradient(#5b8cff, #22d3ee);
      margin: 0.25rem 0 0.25rem 5px; opacity: 0.6;
    }
    .vehicle { color: #94a3b8; font-size: 0.9rem; margin-bottom: 0.85rem; }

    .hint {
      padding: 0.85rem 1rem; border-radius: 0.85rem; margin-bottom: 1.25rem;
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
      color: #cbd5e1; font-size: 0.9rem; line-height: 1.45;
    }
    .hint.live {
      background: rgba(34,211,238,0.08); border-color: rgba(34,211,238,0.25); color: #a5f3fc;
    }

    h3 { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; margin-bottom: 0.65rem; }
    .people { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.25rem; }
    .person {
      display: flex; align-items: center; gap: 0.75rem; padding: 0.65rem 0.75rem;
      border-radius: 0.85rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
    }
    .avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: linear-gradient(135deg, #5b8cff, #7c5cff);
      display: grid; place-items: center; font-weight: 700; font-size: 0.9rem;
    }
    .pinfo { flex: 1; display: flex; flex-direction: column; }
    .pinfo strong { font-size: 0.92rem; }
    .pinfo span { font-size: 0.75rem; color: #94a3b8; }
    .check {
      width: 24px; height: 24px; border-radius: 50%; background: rgba(52,211,153,0.2);
      color: #34d399; display: grid; place-items: center; font-size: 0.75rem; font-weight: 700;
    }

    .actions { display: flex; flex-wrap: wrap; gap: 0.55rem; margin-bottom: 1rem; }
    .btn {
      padding: 0.7rem 1.2rem; border: none; border-radius: 999px; font-weight: 600; font-size: 0.88rem;
      cursor: pointer; transition: transform 0.15s, box-shadow 0.15s;
    }
    .btn:hover { transform: translateY(-1px); }
    .btn.primary {
      background: linear-gradient(135deg, #5b8cff, #7c5cff); color: #fff;
      box-shadow: 0 8px 24px rgba(91,140,255,0.35);
    }
    .btn.success { background: linear-gradient(135deg, #059669, #34d399); color: #fff; }
    .btn.sos { background: linear-gradient(135deg,#b91c1c,#ef4444); animation: pulseSos 1.5s infinite; }
    @keyframes pulseSos { 50% { box-shadow: 0 0 0 6px rgba(239,68,68,0.25); } }
    .rate-box { width: 100%; margin-top: 0.75rem; display: grid; gap: 0.4rem; }
    .rate-box select, .rate-box input {
      padding: 0.45rem 0.6rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.12);
      background: rgba(0,0,0,0.3); color: #fff; }
    .btn.danger { background: rgba(248,113,113,0.2); color: #fca5a5; border: 1px solid rgba(248,113,113,0.35); }

    .toast { padding: 0.75rem 1rem; border-radius: 0.75rem; margin-bottom: 0.85rem; font-size: 0.88rem; }
    .toast.ok { background: rgba(52,211,153,0.12); border: 1px solid rgba(52,211,153,0.3); color: #6ee7b7; }
    .toast.err { background: rgba(248,113,113,0.12); border: 1px solid rgba(248,113,113,0.3); color: #fca5a5; }
    .toast.center { max-width: 420px; margin: 3rem auto; text-align: center; }

    .timeline { margin-top: 0.5rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.08); }
    .tl-item { display: flex; gap: 0.75rem; position: relative; padding-bottom: 1rem; }
    .tl-item:not(.last)::before {
      content: ''; position: absolute; left: 5px; top: 14px; bottom: 0; width: 2px;
      background: rgba(255,255,255,0.1);
    }
    .tl-dot {
      width: 12px; height: 12px; border-radius: 50%; background: #5b8cff;
      margin-top: 4px; flex-shrink: 0; box-shadow: 0 0 0 3px rgba(91,140,255,0.2);
    }
    .tl-body { display: flex; flex-direction: column; gap: 0.15rem; }
    .tl-body strong { font-size: 0.88rem; }
    .tl-body span { font-size: 0.75rem; color: #64748b; }
    .tl-body em { font-size: 0.8rem; color: #94a3b8; font-style: normal; }

    .live-line { margin: 0.5rem 0 0; font-size: 0.82rem; color: #93c5fd; }
    .live-line.peer { color: #6ee7b7; }
    .loader { display: flex; flex-direction: column; align-items: center; gap: 1rem; margin-top: 20vh; color: #94a3b8; }
    .spinner {
      width: 36px; height: 36px; border: 3px solid rgba(255,255,255,0.1);
      border-top-color: #5b8cff; border-radius: 50%; animation: spin 0.8s linear infinite;
    }
  `]
})

export class RideDetailComponent implements OnInit, OnDestroy {
  private rideService = inject(RideService);
  private route = inject(ActivatedRoute);
  private signalR = inject(SignalRService);
  private geo = inject(GeolocationService);
  private safety = inject(SafetyApiService);
  private ratings = inject(RatingService);

  ride = signal<RideDto | null>(null);
  error = signal('');
  message = signal('');
  liveNote = signal('');
  lastPeerLocation = signal<{ lat: number; lng: number; role: string; at: string } | null>(null);
  liveConnection = this.signalR.connectionState;
  rideId = '';
  rateTargetId = '';
  rateStars = 5;
  rateReview = '';
  private pollId: ReturnType<typeof setInterval> | null = null;
  private locTimer: ReturnType<typeof setInterval> | null = null;
  private liveSubs: { unsubscribe(): void }[] = [];

  getUserId(): string {
    try { return JSON.parse(localStorage.getItem('rs_user') || '{}').id || ''; }
    catch { return ''; }
  }
  isDriver = computed(() =>
    this.ride()?.participants?.some(p => p.role === 'Driver' && p.userId === this.getUserId()) ?? false
  );
  canConfirm = computed(() => {
    const r = this.ride();
    if (!r || r.status !== 'Matched') return false;
    const me = r.participants.find(p => p.userId === this.getUserId());
    return !!me && !me.hasConfirmed;
  });
  canCancel = computed(() => {
    const s = this.ride()?.status;
    return !!s && !['Completed', 'Cancelled'].includes(s);
  });

  prettyStatus(s: string): string {
    const map: Record<string, string> = {
      Matched: 'Matched', Confirmed: 'Confirmed', DriverArriving: 'Driver arriving',
      DriverArrived: 'Driver arrived', InProgress: 'In progress', Completed: 'Completed', Cancelled: 'Cancelled'
    };
    return map[s] || s;
  }
  statusMessage(s: string, reason?: string): string {
    const map: Record<string, string> = {
      Matched: 'Waiting for both passenger and driver to confirm this ride.',
      Confirmed: 'Both confirmed. Driver will head to pickup soon.',
      DriverArriving: 'Driver is on the way to the pickup point.',
      DriverArrived: 'Driver has arrived. You can start the ride.',
      InProgress: 'You are on the way. Stay safe!',
      Completed: 'This ride is finished. Thank you for riding together.',
      Cancelled: reason ? `Cancelled: ${reason}` : 'This ride was cancelled.'
    };
    return map[s] || '';
  }
  isActive(s: string) {
    return ['DriverArriving', 'DriverArrived', 'InProgress', 'Confirmed'].includes(s);
  }
  isTerminal(s: string) {
    return s === 'Completed' || s === 'Cancelled';
  }

  ngOnInit(): void {
    this.rideId = this.route.snapshot.paramMap.get('id') || '';
    this.load(false);
    this.pollId = setInterval(() => this.load(true), 5000);
    this.setupRealtime();
  }

  ngOnDestroy(): void {
    this.teardownRealtime();
    if (this.pollId) clearInterval(this.pollId);
  }

  private setupRealtime(): void {
    const id = this.rideId;
    if (!id) return;
    this.signalR.connect()
      .then(() => this.signalR.joinRide(id))
      .then(() => this.liveNote.set('Live updates connected'))
      .catch(err => this.liveNote.set('Live offline — polling (' + (err?.message || 'error') + ')'));

    this.liveSubs.push(this.signalR.status$.subscribe(evt => {
      if (String(evt.rideId).toLowerCase() !== id.toLowerCase()) return;
      this.liveNote.set(evt.message || ('Status: ' + evt.status));
      this.message.set(evt.message);
      this.load(true);
    }));
    this.liveSubs.push(this.signalR.notification$.subscribe(evt => {
      if (String(evt.rideId).toLowerCase() !== id.toLowerCase()) return;
      this.liveNote.set(evt.message);
    }));
    this.liveSubs.push(this.signalR.location$.subscribe(evt => {
      if (String(evt.rideId).toLowerCase() !== id.toLowerCase()) return;
      this.lastPeerLocation.set({ lat: evt.latitude, lng: evt.longitude, role: evt.role, at: evt.at });
    }));
    this.locTimer = setInterval(() => this.pushMyLocation(), 8000);
    this.liveSubs.push(this.signalR.sos$.subscribe(evt => {
      if (String(evt.rideId).toLowerCase() !== id.toLowerCase()) return;
      this.message.set('SOS: ' + (evt.userName || 'Participant') + ' needs help');
      alert('SOS alert from ' + (evt.userName || 'participant'));
    }));
  }

  private teardownRealtime(): void {
    if (this.rideId) void this.signalR.leaveRide(this.rideId);
    this.liveSubs.forEach(s => s.unsubscribe());
    this.liveSubs = [];
    if (this.locTimer) { clearInterval(this.locTimer); this.locTimer = null; }
  }

  private pushMyLocation(): void {
    const r = this.ride();
    if (!r || !this.rideId) return;
    if (!['Confirmed', 'DriverArriving', 'DriverArrived', 'InProgress'].includes(r.status)) return;
    this.geo.getCurrentPosition().subscribe({
      next: pos => {
        void this.signalR.sendLocation(this.rideId, pos.latitude, pos.longitude, pos.accuracy).catch(() => {});
      },
      error: () => {}
    });
  }

  load(silent: boolean): void {
    this.rideService.getById(this.rideId).subscribe({
      next: res => {
        if (res.success && res.data) {
          const prev = this.ride()?.status;
          this.ride.set(res.data);
          if (silent && prev && prev !== res.data.status) {
            this.message.set(`Updated: ${this.prettyStatus(res.data.status)}`);
          }
        } else if (!silent) this.error.set(res.message);
      },
      error: err => { if (!silent) this.error.set(err.error?.message || 'Failed to load'); }
    });
  }

  act(action: string): void {
    this.error.set(''); this.message.set('');
    const id = this.rideId;
    let req$: any;
    switch (action) {
      case 'confirm': req$ = this.rideService.confirm(id); break;
      case 'arriving': req$ = this.rideService.driverArriving(id); break;
      case 'arrived': req$ = this.rideService.driverArrived(id); break;
      case 'start': req$ = this.rideService.start(id); break;
      case 'complete': req$ = this.rideService.complete(id); break;
      case 'cancel': req$ = this.rideService.cancel(id, prompt('Reason (optional)') || undefined); break;
      default: return;
    }
    req$.subscribe({
      next: (res: any) => {
        if (res.success && res.data) { this.ride.set(res.data); this.message.set(res.message); }
        else this.error.set(res.message);
      },
      error: (err: any) => this.error.set(err.error?.message || 'Action failed')
    });
  }

  triggerSos(): void {
    if (!confirm('Send SOS to the other participant and record emergency alert?')) return;
    const id = this.rideId;
    this.geo.getCurrentPosition().subscribe({
      next: pos => {
        this.safety.triggerSos(id, pos.latitude, pos.longitude, 'SOS from app').subscribe({
          next: r => this.message.set((r as any).message || 'SOS sent'),
          error: e => this.error.set(e.error?.message || 'SOS failed')
        });
      },
      error: () => {
        this.safety.triggerSos(id, undefined, undefined, 'SOS from app (no GPS)').subscribe({
          next: r => this.message.set((r as any).message || 'SOS sent'),
          error: e => this.error.set(e.error?.message || 'SOS failed')
        });
      }
    });
  }

  submitRating(): void {
    if (!this.rateTargetId) { this.error.set('Select a person to rate'); return; }
    this.ratings.submit(this.rideId, this.rateTargetId, this.rateStars, this.rateReview || undefined).subscribe({
      next: r => {
        if (r.success) { this.message.set(r.message || 'Rating saved'); this.rateReview = ''; }
        else this.error.set(r.message);
      },
      error: e => this.error.set(e.error?.message || 'Rating failed')
    });
  }

}
