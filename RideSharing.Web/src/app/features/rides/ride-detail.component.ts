import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-ride-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="rs-page">
      @if (loading()) {
        <p class="muted">Loading ride…</p>
      } @else if (!ride()) {
        <p class="err">{{ err() || 'Ride not found' }}</p>
        <a routerLink="/app/rides/lifecycle" class="btn ghost">Back</a>
      } @else {
        <header class="head">
          <div>
            <div class="chips">
              <span class="chip">{{ prettyStatus(ride()!.status) }}</span>
              <span class="chip gold">PIN OTP Protected</span>
            </div>
            <h1>{{ src() }} → {{ dst() }}</h1>
            <p class="sub">Ride #{{ shortId(ride()!.id) }}</p>
          </div>
          @if (pin()) {
            <div class="otp-box">
              <span>TRIP START OTP</span>
              <strong>{{ pin() }}</strong>
              <small>Give PIN to driver on boarding</small>
            </div>
          }
        </header>

        <!-- Progress -->
        <section class="progress card">
          <p class="label">LIVE COMMUTE TRANSIT PROGRESSION</p>
          <div class="steps">
            @for (s of steps; track s.key) {
              <div class="step" [class.on]="stepIndex() >= s.i" [class.now]="stepIndex() === s.i">
                {{ s.i + 1 }}. {{ s.label }}
              </div>
            }
          </div>
        </section>

        <div class="grid">
          <section class="card">
            <h3>COMMUTER DETAILS</h3>
            <div class="person">
              <span class="av">{{ peerInitials() }}</span>
              <div>
                <strong>{{ peerName() }}</strong>
                <p class="muted">{{ peerPhone() }}</p>
              </div>
            </div>
          </section>
          <section class="card">
            <h3>VEHICLE &amp; FARE</h3>
            <div class="rows">
              <div><span>Vehicle</span><strong>{{ vehicleLabel() }}</strong></div>
              <div><span>Agreed fare</span><strong>Rs. {{ fare() }}</strong></div>
              <div><span>Payment</span><strong>{{ paymentLabel() }}</strong></div>
            </div>
          </section>
        </div>

        <!-- Actions by status -->
        <section class="card actions-card">
          <h3>Actions</h3>
          @if (err()) { <p class="err">{{ err() }}</p> }
          @if (msg()) { <p class="ok">{{ msg() }}</p> }

          <div class="btns">
            <a class="btn ghost" routerLink="/app/gps">View Live on GPS</a>
            <a class="btn ghost" [routerLink]="['/app/chat', ride()!.id]">Commuter Chat</a>
            <a class="btn danger" routerLink="/app/safety">Trigger SOS</a>
          </div>

          <div class="btns lifecycle">
            @if (can('confirm')) {
              <button type="button" class="btn primary" (click)="act('confirm')" [disabled]="busy()">Confirm ride</button>
            }
            @if (can('arriving')) {
              <button type="button" class="btn primary" (click)="act('arriving')" [disabled]="busy()">Driver arriving</button>
            }
            @if (can('arrived')) {
              <button type="button" class="btn primary" (click)="act('arrived')" [disabled]="busy()">Driver arrived</button>
            }
            @if (can('start')) {
              <button type="button" class="btn primary" (click)="act('start')" [disabled]="busy()">Start ride</button>
            }
            @if (can('complete')) {
              <button type="button" class="btn primary" (click)="act('complete')" [disabled]="busy()">Complete trip</button>
            }
            @if (can('cancel')) {
              <button type="button" class="btn ghost" (click)="act('cancel')" [disabled]="busy()">Cancel</button>
            }
          </div>
        </section>

        <!-- Rating after complete -->
        @if (isCompleted()) {
          <section class="card">
            <h3>Rate this commute</h3>
            <div class="rate">
              <select [(ngModel)]="rateStars" class="inp">
                <option [ngValue]="5">5 stars</option>
                <option [ngValue]="4">4 stars</option>
                <option [ngValue]="3">3 stars</option>
                <option [ngValue]="2">2 stars</option>
                <option [ngValue]="1">1 star</option>
              </select>
              <input class="inp" [(ngModel)]="rateReview" placeholder="Optional review" />
              <button type="button" class="btn primary" (click)="submitRating()" [disabled]="busy()">Submit rating</button>
            </div>
          </section>
        }

        <a routerLink="/app/rides/lifecycle" class="back">← Back to My Rides</a>
      }
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
    h1 { margin: 0; font-size: 1.25rem; font-weight: 800; max-width: 40rem; }
    .sub { margin: 0.25rem 0 0; color: #64748b; font-size: 0.88rem; }
    .otp-box {
      background: #fff8db; border: 1px solid #f5d76e; border-radius: 14px;
      padding: 0.75rem 1.1rem; text-align: center; min-width: 140px;
    }
    .otp-box span { display: block; font-size: 0.7rem; font-weight: 800; color: #92400e; }
    .otp-box strong { display: block; font-size: 1.6rem; letter-spacing: 0.12em; color: #92400e; }
    .otp-box small { display: block; font-size: 0.7rem; color: #a16207; }
    .card {
      background: #fff; border: 1px solid #b7ebc9; border-radius: 16px;
      padding: 1.1rem; margin-bottom: 0.85rem;
      box-shadow: 0 6px 18px rgba(15,23,42,0.04);
    }
    .label { margin: 0 0 0.55rem; font-size: 0.72rem; font-weight: 800; color: #64748b; letter-spacing: 0.04em; }
    .steps { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .step {
      flex: 1; min-width: 120px; text-align: center; padding: 0.65rem 0.5rem;
      border-radius: 12px; background: #f1f5f9; color: #94a3b8; font-weight: 700; font-size: 0.8rem;
    }
    .step.on { background: #e8f8f1; color: #0b7f58; }
    .step.now { background: #f5c518; color: #1e293b; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem; }
    @media (max-width: 700px) { .grid { grid-template-columns: 1fr; } }
    h3 { margin: 0 0 0.65rem; font-size: 0.75rem; font-weight: 800; color: #64748b; letter-spacing: 0.04em; }
    .person { display: flex; gap: 0.65rem; align-items: center; }
    .av {
      width: 44px; height: 44px; border-radius: 999px; background: #0d9f6e; color: #fff;
      display: grid; place-items: center; font-weight: 800;
    }
    .rows { display: flex; flex-direction: column; gap: 0.4rem; }
    .rows > div { display: flex; justify-content: space-between; gap: 0.5rem; font-size: 0.9rem; }
    .rows span { color: #64748b; }
    .btns { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.55rem; }
    .btn {
      display: inline-flex; align-items: center; justify-content: center; min-height: 42px;
      padding: 0.45rem 1rem; border-radius: 999px; font-weight: 800; font-size: 0.85rem;
      text-decoration: none; border: none; cursor: pointer;
    }
    .btn.primary { background: #0d9f6e; color: #fff; }
    .btn.ghost { background: #fff; border: 1px solid #e2e8f0; color: #0f172a; }
    .btn.danger { background: #e11d48; color: #fff; }
    .btn:disabled { opacity: 0.6; }
    .rate { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
    .inp {
      min-height: 42px; padding: 0.45rem 0.75rem; border-radius: 12px;
      border: 1px solid #e2e8f0; font-size: 0.9rem;
    }
    .back { display: inline-block; margin-top: 0.5rem; color: #0d9f6e; font-weight: 700; }
    .muted { color: #64748b; } .err { color: #e11d48; } .ok { color: #0d9f6e; }
  `]
})
export class RideDetailComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);
  private api = (environment.apiUrl || '/api/v1').replace(/\/$/, '');

  ride = signal<any>(null);
  loading = signal(true);
  busy = signal(false);
  err = signal('');
  msg = signal('');
  rateStars = 5;
  rateReview = '';

  steps = [
    { i: 0, key: 'arriving', label: 'Driver En Route' },
    { i: 1, key: 'arrived', label: 'Driver Arrived' },
    { i: 2, key: 'progress', label: 'In Progress (PIN)' },
    { i: 3, key: 'done', label: 'Complete Trip' }
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      return;
    }
    this.reload(id);
  }

  reload(id: string): void {
    this.loading.set(true);
    this.http.get<any>(`${this.api}/rides/${id}`).subscribe({
      next: (r) => {
        this.ride.set(r?.data ?? r);
        this.loading.set(false);
      },
      error: (e) => {
        this.err.set(e.error?.message || 'Failed to load ride');
        this.loading.set(false);
      }
    });
  }

  private status(): string {
    return String(this.ride()?.status || '').toLowerCase().replace(/\s/g, '');
  }

  stepIndex(): number {
    const s = this.status();
    if (s === 'completed') return 3;
    if (s === 'inprogress') return 2;
    if (s === 'driverarrived') return 1;
    if (s === 'driverarriving' || s === 'confirmed') return 0;
    return -1;
  }

  isDriver(): boolean {
    const a: any = this.auth;
    const roles = a.roles?.() ?? a.currentUser?.()?.roles ?? a.user?.()?.roles ?? [];
    return roles.includes('Driver');
  }

  can(action: string): boolean {
    const s = this.status();
    if (action === 'cancel') {
      return !['completed', 'cancelled', 'canceled'].includes(s);
    }
    if (action === 'confirm') return s === 'matched' || s === 'requested';
    if (!this.isDriver()) {
      // passenger mainly confirms / cancels
      return action === 'confirm';
    }
    if (action === 'arriving') return s === 'confirmed';
    if (action === 'arrived') return s === 'driverarriving';
    if (action === 'start') return s === 'driverarrived';  // not from Confirmed
    if (action === 'complete') return s === 'inprogress';
    return false;
  }

  isCompleted(): boolean {
    return this.status() === 'completed';
  }

  act(action: string): void {
    const id = this.ride()?.id;
    if (!id) return;
    const map: Record<string, string> = {
      confirm: 'confirm',
      cancel: 'cancel',
      arriving: 'driver-arriving',
      arrived: 'driver-arrived',
      start: 'start',
      complete: 'complete'
    };
    const path = map[action];
    if (!path) return;
    this.busy.set(true);
    this.err.set('');
    this.msg.set('');
    this.http.post<any>(`${this.api}/rides/${id}/${path}`, {}).subscribe({
      next: (r) => {
        this.busy.set(false);
        this.msg.set(r?.message || 'Updated');
        this.reload(id);
      },
      error: (e) => {
        this.busy.set(false);
        this.err.set(e.error?.message || 'Action failed');
      }
    });
  }

  submitRating(): void {
    const id = this.ride()?.id;
    if (!id) return;
    this.busy.set(true);
    this.http.post(`${this.api}/ratings`, {
      rideId: id,
      stars: this.rateStars,
      review: this.rateReview || undefined
    }).subscribe({
      next: () => {
        this.busy.set(false);
        this.msg.set('Rating submitted');
      },
      error: (e) => {
        this.busy.set(false);
        this.err.set(e.error?.message || 'Rating failed');
      }
    });
  }

  pin(): string {
    const r = this.ride();
    return r?.startPin || r?.otp || r?.tripPin || '';
  }

  src(): string {
    const r = this.ride();
    return r?.sourceAddress || r?.route?.sourceAddress || 'Source';
  }
  dst(): string {
    const r = this.ride();
    return r?.destinationAddress || r?.route?.destinationAddress || 'Destination';
  }
  shortId(id?: string): string {
    if (!id) return '—';
    return id.length > 10 ? id.slice(0, 10) : id;
  }
  prettyStatus(s?: string): string {
    return String(s || 'Unknown').replace(/([a-z])([A-Z])/g, '$1 $2');
  }
  peerName(): string {
    const r = this.ride();
    return r?.otherPartyName || r?.passengerName || r?.driverName || r?.peerName || 'Commuter';
  }
  peerPhone(): string {
    return this.ride()?.otherPartyPhone || this.ride()?.passengerPhone || this.ride()?.driverPhone || '';
  }
  peerInitials(): string {
    return this.peerName().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() || '').join('') || 'C';
  }
  vehicleLabel(): string {
    const r = this.ride();
    const v = r?.vehicle;
    if (v) return [v.make, v.model, v.registrationNumber].filter(Boolean).join(' ');
    return r?.vehicleLabel || '—';
  }
  fare(): string {
    const f = this.ride()?.fare ?? this.ride()?.agreedFare;
    return f != null ? String(f) : '—';
  }
  paymentLabel(): string {
    return this.ride()?.paymentMethod || this.ride()?.paymentChannel || 'Cash / Wallet';
  }
}
