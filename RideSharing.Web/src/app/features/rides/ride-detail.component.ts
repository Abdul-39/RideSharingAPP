import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';

import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel
} from '@microsoft/signalr';

@Component({
  selector: 'app-ride-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  template: `
    <div class="rs-page">

      @if (loading()) {

        <p class="muted">Loading ride…</p>

      } @else if (!ride()) {

        <p class="err">
          {{ err() || 'Ride not found' }}
        </p>

        <a
          routerLink="/app/rides/lifecycle"
          class="btn ghost">
          Back
        </a>

      } @else {

        <header class="head">

          <div>

            <div class="chips">

              <span class="chip">
                {{ prettyStatus(ride()!.status) }}
              </span>

              <span class="chip gold">
                PIN OTP Protected
              </span>

              @if (realtimeConnected()) {

                <span class="chip live">
                  ● LIVE
                </span>

              }

            </div>

            <h1>
              {{ src() }} → {{ dst() }}
            </h1>

            <p class="sub">
              Ride #{{ shortId(ride()!.id) }}
            </p>

          </div>

          @if (pin()) {

            <div class="otp-box">

              <span>TRIP START OTP</span>

              <strong>
                {{ pin() }}
              </strong>

              <small>
                Give PIN to driver on boarding
              </small>

            </div>

          }

        </header>


        @if (realtimeMessage()) {

          <div class="realtime-alert">

            <span class="live-dot">
              ●
            </span>

            <div>

              <strong>
                {{ realtimeTitle() }}
              </strong>

              <p>
                {{ realtimeMessage() }}
              </p>

            </div>

            <button
              type="button"
              class="close-alert"
              (click)="clearRealtimeMessage()">

              ×

            </button>

          </div>

        }


        <section class="progress card">

          <p class="label">
            LIVE COMMUTE TRANSIT PROGRESSION
          </p>

          <div class="steps">

            @for (s of steps; track s.key) {

              <div
                class="step"
                [class.on]="stepIndex() >= s.i"
                [class.now]="stepIndex() === s.i">

                {{ s.i + 1 }}. {{ s.label }}

              </div>

            }

          </div>

        </section>


        <div class="grid">

          <section class="card">

            <h3>
              COMMUTER DETAILS
            </h3>

            <div class="person">

              <span class="av">
                {{ peerInitials() }}
              </span>

              <div>

                <strong>
                  {{ peerName() }}
                </strong>

                <p class="muted">
                  {{ peerPhone() }}
                </p>

              </div>

            </div>

          </section>


          <section class="card">

            <h3>
              VEHICLE &amp; FARE
            </h3>

            <div class="rows">

              <div>
                <span>Vehicle</span>
                <strong>
                  {{ vehicleLabel() }}
                </strong>
              </div>

              <div>
                <span>Agreed fare</span>
                <strong>
                  Rs. {{ fare() }}
                </strong>
              </div>

              <div>
                <span>Payment</span>
                <strong>
                  {{ paymentLabel() }}
                </strong>
              </div>

            </div>

          </section>

        </div>


        <section class="card actions-card">

          <h3>
            Actions
          </h3>

          @if (err()) {

            <p class="err">
              {{ err() }}
            </p>

          }

          @if (msg()) {

            <p class="ok">
              {{ msg() }}
            </p>

          }


          <div class="btns">

            <a
              class="btn ghost"
              routerLink="/app/gps">

              View Live on GPS

            </a>

            <a
              class="btn ghost"
              [routerLink]="['/app/chat']"
              [queryParams]="{ rideId: ride()!.id }">

              Commuter Chat

            </a>

            <a
              class="btn danger"
              routerLink="/app/safety">

              Trigger SOS

            </a>

          </div>


          <div class="btns lifecycle">

            @if (can('confirm')) {

              <button
                type="button"
                class="btn primary"
                (click)="act('confirm')"
                [disabled]="busy()">

                Confirm ride

              </button>

            }


            @if (can('arriving')) {

              <button
                type="button"
                class="btn primary"
                (click)="act('arriving')"
                [disabled]="busy()">

                Driver arriving

              </button>

            }


            @if (can('arrived')) {

              <button
                type="button"
                class="btn primary"
                (click)="act('arrived')"
                [disabled]="busy()">

                Driver arrived

              </button>

            }


            @if (can('start')) {

              <button
                type="button"
                class="btn primary"
                (click)="act('start')"
                [disabled]="busy()">

                Start ride

              </button>

            }


            @if (can('complete')) {

              <button
                type="button"
                class="btn primary"
                (click)="act('complete')"
                [disabled]="busy()">

                Complete trip

              </button>

            }


            @if (can('cancel')) {

              <button
                type="button"
                class="btn ghost"
                (click)="act('cancel')"
                [disabled]="busy()">

                Cancel

              </button>

            }

          </div>

        </section>


        @if (isCompleted()) {

          <section class="card">

            <h3>
              Rate this commute
            </h3>

            <div class="rate">

              <select
                [(ngModel)]="rateStars"
                class="inp">

                <option [ngValue]="5">
                  5 stars
                </option>

                <option [ngValue]="4">
                  4 stars
                </option>

                <option [ngValue]="3">
                  3 stars
                </option>

                <option [ngValue]="2">
                  2 stars
                </option>

                <option [ngValue]="1">
                  1 star
                </option>

              </select>


              <input
                class="inp"
                [(ngModel)]="rateReview"
                placeholder="Optional review" />


              <button
                type="button"
                class="btn primary"
                (click)="submitRating()"
                [disabled]="busy()">

                Submit rating

              </button>

            </div>

          </section>

        }


        <a
          routerLink="/app/rides/lifecycle"
          class="back">

          ← Back to My Rides

        </a>

      }

    </div>
  `,

  styles: [`

    .head {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .chips {
      display: flex;
      gap: 0.35rem;
      flex-wrap: wrap;
      margin-bottom: 0.35rem;
    }

    .chip {
      font-size: 0.72rem;
      font-weight: 800;
      padding: 0.25rem 0.65rem;
      border-radius: 999px;
      background: #e8f8f1;
      color: #0b7f58;
    }

    .chip.gold {
      background: #fff7cc;
      color: #a16207;
    }

    .chip.live {
      background: #dcfce7;
      color: #15803d;
    }

    h1 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 800;
      max-width: 40rem;
    }

    .sub {
      margin: 0.25rem 0 0;
      color: #64748b;
      font-size: 0.88rem;
    }

    .otp-box {
      background: #fff8db;
      border: 1px solid #f5d76e;
      border-radius: 14px;
      padding: 0.75rem 1.1rem;
      text-align: center;
      min-width: 140px;
    }

    .otp-box span {
      display: block;
      font-size: 0.7rem;
      font-weight: 800;
      color: #92400e;
    }

    .otp-box strong {
      display: block;
      font-size: 1.6rem;
      letter-spacing: 0.12em;
      color: #92400e;
    }

    .otp-box small {
      display: block;
      font-size: 0.7rem;
      color: #a16207;
    }

    .card {
      background: #fff;
      border: 1px solid #b7ebc9;
      border-radius: 16px;
      padding: 1.1rem;
      margin-bottom: 0.85rem;
      box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04);
    }

    .label {
      margin: 0 0 0.55rem;
      font-size: 0.72rem;
      font-weight: 800;
      color: #64748b;
      letter-spacing: 0.04em;
    }

    .steps {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .step {
      flex: 1;
      min-width: 120px;
      text-align: center;
      padding: 0.65rem 0.5rem;
      border-radius: 12px;
      background: #f1f5f9;
      color: #94a3b8;
      font-weight: 700;
      font-size: 0.8rem;
    }

    .step.on {
      background: #e8f8f1;
      color: #0b7f58;
    }

    .step.now {
      background: #f5c518;
      color: #1e293b;
    }

    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.85rem;
    }

    @media (max-width: 700px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }

    h3 {
      margin: 0 0 0.65rem;
      font-size: 0.75rem;
      font-weight: 800;
      color: #64748b;
      letter-spacing: 0.04em;
    }

    .person {
      display: flex;
      gap: 0.65rem;
      align-items: center;
    }

    .av {
      width: 44px;
      height: 44px;
      border-radius: 999px;
      background: #0d9f6e;
      color: #fff;
      display: grid;
      place-items: center;
      font-weight: 800;
    }

    .rows {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .rows > div {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
      font-size: 0.9rem;
    }

    .rows span {
      color: #64748b;
    }

    .btns {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      margin-bottom: 0.55rem;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 42px;
      padding: 0.45rem 1rem;
      border-radius: 999px;
      font-weight: 800;
      font-size: 0.85rem;
      text-decoration: none;
      border: none;
      cursor: pointer;
    }

    .btn.primary {
      background: #0d9f6e;
      color: #fff;
    }

    .btn.ghost {
      background: #fff;
      border: 1px solid #e2e8f0;
      color: #0f172a;
    }

    .btn.danger {
      background: #e11d48;
      color: #fff;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .rate {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
    }

    .inp {
      min-height: 42px;
      padding: 0.45rem 0.75rem;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      font-size: 0.9rem;
    }

    .back {
      display: inline-block;
      margin-top: 0.5rem;
      color: #0d9f6e;
      font-weight: 700;
    }

    .muted {
      color: #64748b;
    }

    .err {
      color: #e11d48;
    }

    .ok {
      color: #0d9f6e;
    }

    .realtime-alert {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      background: #ecfdf5;
      border: 1px solid #86efac;
      border-radius: 14px;
      padding: 0.85rem 1rem;
      margin-bottom: 0.85rem;
      animation: realtimeIn 0.25s ease-out;
    }

    .realtime-alert strong {
      color: #166534;
      font-size: 0.9rem;
    }

    .realtime-alert p {
      margin: 0.2rem 0 0;
      color: #166534;
      font-size: 0.82rem;
    }

    .live-dot {
      color: #16a34a;
      font-size: 0.9rem;
      line-height: 1.3;
    }

    .close-alert {
      margin-left: auto;
      border: none;
      background: transparent;
      cursor: pointer;
      font-size: 1.2rem;
      color: #166534;
    }

    @keyframes realtimeIn {
      from {
        opacity: 0;
        transform: translateY(-5px);
      }

      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

  `]
})
export class RideDetailComponent implements OnInit, OnDestroy {

  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);

  private api =
    (environment.apiUrl || '/api/v1').replace(/\/$/, '');

  private hubConnection: HubConnection | null = null;

  ride = signal<any>(null);
  loading = signal(true);
  busy = signal(false);

  err = signal('');
  msg = signal('');

  realtimeConnected = signal(false);
  realtimeMessage = signal('');
  realtimeTitle = signal('Ride update');

  rateStars = 5;
  rateReview = '';

  private realtimeTimer: ReturnType<typeof setTimeout> | null = null;

  steps = [
    {
      i: 0,
      key: 'arriving',
      label: 'Driver En Route'
    },
    {
      i: 1,
      key: 'arrived',
      label: 'Driver Arrived'
    },
    {
      i: 2,
      key: 'progress',
      label: 'In Progress'
    },
    {
      i: 3,
      key: 'done',
      label: 'Complete Trip'
    }
  ];

  ngOnInit(): void {

    const id =
      this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.loading.set(false);
      return;
    }

    this.reload(id);
    this.startRealtime(id);
  }

  ngOnDestroy(): void {

    if (this.realtimeTimer) {
      clearTimeout(this.realtimeTimer);
      this.realtimeTimer = null;
    }

    this.stopRealtime();
  }

  reload(id: string): void {

    this.http
      .get<any>(`${this.api}/rides/${id}`)
      .subscribe({

        next: (r) => {
          this.ride.set(r?.data ?? r);
          this.loading.set(false);
        },

        error: (e) => {
          this.err.set(
            e.error?.message || 'Failed to load ride'
          );
          this.loading.set(false);
        }

      });
  }

  private getHubUrl(): string {

    const base =
      (environment.signalRUrl || '/hubs').replace(/\/$/, '');

    return `${base}/ride`;
  }

  private getAccessToken(): string {

    const auth: any = this.auth;

    try {

      if (typeof auth.getAccessToken === 'function') {
        const token = auth.getAccessToken();
        if (token) return token;
      }

      if (typeof auth.getToken === 'function') {
        const token = auth.getToken();
        if (token) return token;
      }

      if (typeof auth.token === 'function') {
        const token = auth.token();
        if (token) return token;
      }

      if (auth.token) {
        return auth.token;
      }

    } catch {
      // localStorage fallback
    }

    return (
      localStorage.getItem('access_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('ma_auth_token') ||
      ''
    );
  }

  private async startRealtime(rideId: string): Promise<void> {

    try {

      const token = this.getAccessToken();

      if (!token) {
        console.warn('[RideRealtime] No access token found.');
        return;
      }

      const hubUrl = this.getHubUrl();

      console.log('[RideRealtime] Connecting to:', hubUrl);

      this.hubConnection =
        new HubConnectionBuilder()
          .withUrl(hubUrl, {
            accessTokenFactory: () => this.getAccessToken()
          })
          .withAutomaticReconnect([0, 2000, 5000, 10000])
          .configureLogging(LogLevel.Information)
          .build();

      this.hubConnection.on(
        'ReceiveRideStatus',
        (event: any) => {
          console.log('[RideRealtime] ReceiveRideStatus:', event);
          this.handleRideStatusEvent(event, rideId);
        }
      );

      this.hubConnection.on(
        'ReceiveNotification',
        (event: any) => {
          console.log('[RideRealtime] ReceiveNotification:', event);
          this.handleNotificationEvent(event, rideId);
        }
      );

      this.hubConnection.onreconnecting((error) => {
        console.warn('[RideRealtime] Reconnecting...', error);
        this.realtimeConnected.set(false);
      });

      this.hubConnection.onreconnected(async () => {
        console.log('[RideRealtime] Reconnected');
        this.realtimeConnected.set(true);
        try {
          await this.hubConnection?.invoke('JoinRide', rideId);
          console.log('[RideRealtime] Ride joined again:', rideId);
        } catch (error) {
          console.error('[RideRealtime] Failed to rejoin ride:', error);
        }
      });

      this.hubConnection.onclose((error) => {
        console.warn('[RideRealtime] Connection closed:', error);
        this.realtimeConnected.set(false);
      });

      await this.hubConnection.start();

      console.log('[RideRealtime] Connected successfully');
      this.realtimeConnected.set(true);

      await this.hubConnection.invoke('JoinRide', rideId);

      console.log('[RideRealtime] Joined ride:', rideId);

    } catch (error) {

      this.realtimeConnected.set(false);
      console.error('[RideRealtime] Connection failed:', error);
    }
  }

  private async stopRealtime(): Promise<void> {

    if (!this.hubConnection) {
      return;
    }

    try {

      if (this.hubConnection.state === HubConnectionState.Connected) {

        const id = this.ride()?.id;

        if (id) {
          try {
            await this.hubConnection.invoke('LeaveRide', String(id));
          } catch {
            // ignore
          }
        }
      }

      await this.hubConnection.stop();

    } catch (error) {

      console.warn('[RideRealtime] Stop error:', error);

    } finally {

      this.hubConnection = null;
      this.realtimeConnected.set(false);
    }
  }

  private handleRideStatusEvent(
    event: any,
    currentRideId: string
  ): void {

    if (!event) {
      return;
    }

    const eventRideId = String(
      event.rideId ?? event.RideId ?? ''
    );

    if (
      eventRideId &&
      eventRideId.toLowerCase() !==
        String(currentRideId).toLowerCase()
    ) {
      return;
    }

    const status = String(
      event.status ?? event.Status ?? ''
    );

    const message = String(
      event.message ?? event.Message ?? 'Ride status updated'
    );

    console.log('[RideRealtime] Status changed:', status, message);

    const current = this.ride();

    if (current && status) {
      this.ride.set({
        ...current,
        status
      });
    }

    this.realtimeTitle.set(this.statusTitle(status));
    this.showRealtimeMessage(message);
    this.msg.set(message);
    this.err.set('');

    // Always re-fetch so progress steps match DB without browser refresh
    this.reload(String(currentRideId));
  }

  private handleNotificationEvent(
    event: any,
    currentRideId: string
  ): void {

    if (!event) {
      return;
    }

    const eventRideId = String(
      event.rideId ?? event.RideId ?? ''
    );

    if (
      eventRideId &&
      eventRideId.toLowerCase() !==
        String(currentRideId).toLowerCase()
    ) {
      return;
    }

    const title = String(
      event.title ?? event.Title ?? 'Ride update'
    );

    const message = String(
      event.message ?? event.Message ?? ''
    );

    if (message) {
      this.realtimeTitle.set(title);
      this.showRealtimeMessage(message);
    }

    this.reload(String(currentRideId));
  }

  private showRealtimeMessage(message: string): void {

    this.realtimeMessage.set(message);

    if (this.realtimeTimer) {
      clearTimeout(this.realtimeTimer);
    }

    this.realtimeTimer = setTimeout(() => {
      this.realtimeMessage.set('');
      this.realtimeTimer = null;
    }, 7000);
  }

  clearRealtimeMessage(): void {

    if (this.realtimeTimer) {
      clearTimeout(this.realtimeTimer);
      this.realtimeTimer = null;
    }

    this.realtimeMessage.set('');
  }

  private statusTitle(status: string): string {

    const normalized = status.toLowerCase().replace(/\s/g, '');

    switch (normalized) {

      case 'confirmed':
        return 'Ride Confirmed';

      case 'driverarriving':
        return 'Driver Arriving';

      case 'driverarrived':
        return 'Driver Arrived';

      case 'inprogress':
        return 'Ride Started';

      case 'completed':
        return 'Trip Completed';

      case 'cancelled':
      case 'canceled':
        return 'Ride Cancelled';

      default:
        return 'Ride Update';
    }
  }

  private status(): string {

    return String(this.ride()?.status || '')
      .toLowerCase()
      .replace(/\s/g, '');
  }

  stepIndex(): number {

    const s = this.status();

    if (s === 'completed') {
      return 3;
    }

    if (s === 'inprogress') {
      return 2;
    }

    if (s === 'driverarrived') {
      return 1;
    }

    if (s === 'driverarriving' || s === 'confirmed') {
      return 0;
    }

    return -1;
  }

  isDriver(): boolean {

    const r: any = this.ride();
    const me = String(this.auth.currentUser()?.id || '');
    const parts: any[] = r?.participants || [];

    if (me && parts.length) {

      const mine = parts.find(
        (p) => String(p.userId) === me
      );

      if (mine) {
        return String(mine.role).toLowerCase() === 'driver';
      }
    }

    const a: any = this.auth;
    const roles =
      a.roles?.() ??
      a.currentUser?.()?.roles ??
      a.user?.()?.roles ??
      [];

    return roles.includes('Driver');
  }

  can(action: string): boolean {

    const s = this.status();

    if (action === 'cancel') {
      return !['completed', 'cancelled', 'canceled'].includes(s);
    }

    if (action === 'confirm') {
      return s === 'matched' || s === 'requested';
    }

    if (!this.isDriver()) {
      return action === 'confirm';
    }

    if (action === 'arriving') {
      return s === 'confirmed';
    }

    if (action === 'arrived') {
      return s === 'driverarriving';
    }

    if (action === 'start') {
      return s === 'driverarrived';
    }

    if (action === 'complete') {
      return s === 'inprogress';
    }

    return false;
  }

  isCompleted(): boolean {
    return this.status() === 'completed';
  }

  act(action: string): void {

    const id = this.ride()?.id;

    if (!id) {
      return;
    }

    const map: Record<string, string> = {
      confirm: 'confirm',
      cancel: 'cancel',
      arriving: 'driver-arriving',
      arrived: 'driver-arrived',
      start: 'start',
      complete: 'complete'
    };

    const path = map[action];

    if (!path) {
      return;
    }

    this.busy.set(true);
    this.err.set('');
    this.msg.set('');

    this.http
      .post<any>(`${this.api}/rides/${id}/${path}`, {})
      .subscribe({

        next: (r) => {
          this.busy.set(false);
          this.msg.set(r?.message || 'Updated');
          this.reload(String(id));
        },

        error: (e) => {
          this.busy.set(false);
          this.err.set(
            e.error?.message || 'Action failed'
          );
        }

      });
  }

  submitRating(): void {

    const id = this.ride()?.id;

    if (!id) {
      return;
    }

    this.busy.set(true);

    this.http
      .post(`${this.api}/ratings`, {
        rideId: id,
        stars: this.rateStars,
        review: this.rateReview || undefined
      })
      .subscribe({

        next: () => {
          this.busy.set(false);
          this.msg.set('Rating submitted');
        },

        error: (e) => {
          this.busy.set(false);
          this.err.set(
            e.error?.message || 'Rating failed'
          );
        }

      });
  }

  pin(): string {

    const r = this.ride();

    return (
      r?.startPin ||
      r?.otp ||
      r?.tripPin ||
      ''
    );
  }

  src(): string {

    const r = this.ride();

    return (
      r?.sourceAddress ||
      r?.route?.sourceAddress ||
      'Source'
    );
  }

  dst(): string {

    const r = this.ride();

    return (
      r?.destinationAddress ||
      r?.route?.destinationAddress ||
      'Destination'
    );
  }

  shortId(id?: string): string {

    if (!id) {
      return '—';
    }

    return id.length > 10 ? id.slice(0, 10) : id;
  }

  prettyStatus(s?: string): string {

    return String(s || 'Unknown').replace(
      /([a-z])([A-Z])/g,
      '$1 $2'
    );
  }

  peerName(): string {

    const r = this.ride();

    return (
      r?.otherPartyName ||
      r?.passengerName ||
      r?.driverName ||
      r?.peerName ||
      'Commuter'
    );
  }

  peerPhone(): string {

    const r = this.ride();

    return (
      r?.otherPartyPhone ||
      r?.passengerPhone ||
      r?.driverPhone ||
      ''
    );
  }

  peerInitials(): string {

    return (
      this.peerName()
        .split(/\s+/)
        .slice(0, 2)
        .map((s) => s[0]?.toUpperCase() || '')
        .join('') || 'C'
    );
  }

  vehicleLabel(): string {

    const r = this.ride();
    const v = r?.vehicle;

    if (v) {
      return [v.make, v.model, v.registrationNumber]
        .filter(Boolean)
        .join(' ');
    }

    return r?.vehicleLabel || r?.vehicleInfo || '—';
  }

  fare(): string {

    const f =
      this.ride()?.fare ??
      this.ride()?.agreedFare ??
      this.ride()?.fareAmount;

    return f != null ? String(f) : '—';
  }

  paymentLabel(): string {

    return (
      this.ride()?.paymentMethod ||
      this.ride()?.paymentChannel ||
      'Cash / Wallet'
    );
  }
}
