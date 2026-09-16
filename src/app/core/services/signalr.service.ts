import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface RideStatusEvent {
  rideId: string;
  status: string;
  previousStatus?: string;
  message: string;
  changedByUserId?: string;
  at: string;
}

export interface RideLocationEvent {
  rideId: string;
  userId: string;
  role: string;
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  at: string;
}

export interface RideNotificationEvent {
  rideId: string;
  type: string;
  title: string;
  message: string;
  at: string;
}

@Injectable({ providedIn: 'root' })
export class SignalRService implements OnDestroy {
  private auth = inject(AuthService);
  private connection: signalR.HubConnection | null = null;
  private joinedRideId: string | null = null;
  private connecting: Promise<void> | null = null;

  readonly connectionState = signal<'disconnected' | 'connecting' | 'connected' | 'reconnecting'>('disconnected');
  readonly status$ = new Subject<RideStatusEvent>();
  readonly location$ = new Subject<RideLocationEvent>();
  readonly notification$ = new Subject<RideNotificationEvent>();
  readonly joined$ = new Subject<{ rideId: string }>();
  readonly chatMessage$ = new Subject<any>();
  readonly userNotification$ = new Subject<any>();
  readonly sos$ = new Subject<any>();

  private hubUrl(): string {
    const base = (environment as any).signalRUrl
      || environment.apiUrl.replace(/\/api\/v1\/?$/, '') + '/hubs';
    return `${base.replace(/\/$/, '')}/ride`;
  }

  async connect(): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) return;
    if (this.connecting) return this.connecting;

    const token = this.auth.getAccessToken();
    if (!token) throw new Error('Not authenticated');

    this.connectionState.set('connecting');
    this.connecting = (async () => {
      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(this.hubUrl(), {
          accessTokenFactory: () => this.auth.getAccessToken() || '',
          transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
        .configureLogging(signalR.LogLevel.Information)
        .build();

      this.connection.onreconnecting(() => this.connectionState.set('reconnecting'));
      this.connection.onreconnected(async () => {
        this.connectionState.set('connected');
        if (this.joinedRideId) {
          try { await this.connection!.invoke('JoinRide', this.joinedRideId); } catch { /* */ }
        }
      });
      this.connection.onclose(() => this.connectionState.set('disconnected'));

      this.connection.on('ReceiveRideStatus', (e: RideStatusEvent) => this.status$.next(e));
      this.connection.on('ReceiveLocation', (e: RideLocationEvent) => this.location$.next(e));
      this.connection.on('ReceiveNotification', (e: RideNotificationEvent) => this.notification$.next(e));
      this.connection.on('JoinedRide', (e: { rideId: string }) => this.joined$.next(e));
      this.connection.on('ReceiveChatMessage', (e: any) => this.chatMessage$.next(e));
      this.connection.on('ReceiveUserNotification', (e: any) => this.userNotification$.next(e));
      this.connection.on('ReceiveSos', (e: any) => this.sos$.next(e));

      await this.connection.start();
      this.connectionState.set('connected');
    })();

    try { await this.connecting; }
    finally { this.connecting = null; }
  }

  async disconnect(): Promise<void> {
    this.joinedRideId = null;
    if (this.connection) {
      try { await this.connection.stop(); } catch { /* */ }
      this.connection = null;
    }
    this.connectionState.set('disconnected');
  }

  async joinRide(rideId: string): Promise<void> {
    await this.connect();
    if (!this.connection) throw new Error('No connection');
    await this.connection.invoke('JoinRide', rideId);
    this.joinedRideId = rideId;
  }

  async leaveRide(rideId: string): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      this.joinedRideId = null;
      return;
    }
    try { await this.connection.invoke('LeaveRide', rideId); } catch { /* */ }
    if (this.joinedRideId === rideId) this.joinedRideId = null;
  }

  async sendLocation(rideId: string, latitude: number, longitude: number, accuracyMeters?: number): Promise<void> {
    await this.connect();
    if (!this.connection) throw new Error('No connection');
    await this.connection.invoke('SendLocation', rideId, latitude, longitude, accuracyMeters ?? null);
  }

  ngOnDestroy(): void {
    void this.disconnect();
    this.status$.complete();
    this.location$.complete();
    this.notification$.complete();
    this.joined$.complete();
    this.chatMessage$.complete();
    this.userNotification$.complete();
    this.sos$.complete();
  }
}
