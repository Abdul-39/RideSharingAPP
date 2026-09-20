import {
  Component, OnInit, OnDestroy, inject, signal, ViewChild, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute} from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { SignalRService } from '../../core/services/signalr.service';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [CommonModule, FormsModule,],
  template: `
    <div class="rs-page">
      <header class="head">
        <div>
          <div class="chips"><span class="chip">Chat</span></div>
          <h1>Ride chat</h1>
          <p class="sub">Messages update live — no refresh needed.</p>
        </div>
      </header>

      <div class="layout">
        <aside class="card list">
          <h2>Your rides</h2>
          @if (ridesLoading()) { <p class="muted">Loading…</p> }
          @for (r of rides(); track r.id) {
            <button type="button" class="ride" [class.on]="selectedRideId === r.id" (click)="selectRide(r.id)">
              <strong>{{ shortRoute(r) }}</strong>
              <span class="muted">{{ prettyStatus(r.status) }} · {{ shortId(r.id) }}</span>
            </button>
          }
          @if (!ridesLoading() && rides().length === 0) {
            <p class="muted">No rides yet.</p>
          }
        </aside>

        <section class="card chat">
          @if (!selectedRideId) {
            <p class="muted center">Select a ride to chat</p>
          } @else {
            <div class="messages" #msgBox>
              @for (m of messages(); track m.id || $index) {
                <div class="bubble" [class.mine]="isMine(m)">
                  <p>{{ m.message || m.body || m.content }}</p>
                  <small>{{ formatTime(m.sentAt || m.createdAt) }}</small>
                </div>
              }
              @if (messages().length === 0) {
                <p class="muted center">No messages yet. Say salaam 👋</p>
              }
            </div>
            <div class="composer">
              <input class="inp" [(ngModel)]="draft" name="draft" placeholder="Type a message…"
                     (keyup.enter)="send()" [disabled]="busy()" />
              <button type="button" class="btn primary" (click)="send()" [disabled]="busy() || !draft.trim()">Send</button>
            </div>
            @if (err()) { <p class="err">{{ err() }}</p> }
          }
        </section>
      </div>
    </div>
  `,
  styles: [`
    .rs-page { max-width: 1000px; margin: 0 auto; }
    .head { margin-bottom: 1rem; }
    .chip { font-size: 0.72rem; font-weight: 800; padding: 0.2rem 0.55rem; border-radius: 999px; background: #e8f8f1; color: #0b7f58; }
    h1 { margin: 0.35rem 0 0; font-size: 1.35rem; }
    .sub { color: #64748b; font-size: 0.9rem; margin: 0.25rem 0 0; }
    .layout { display: grid; grid-template-columns: 240px 1fr; gap: 1rem; }
    @media (max-width: 720px) { .layout { grid-template-columns: 1fr; } }
    .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 0.85rem; }
    .list h2 { margin: 0 0 0.5rem; font-size: 0.95rem; }
    .ride {
      display: flex; flex-direction: column; align-items: flex-start; gap: 0.15rem;
      width: 100%; text-align: left; padding: 0.55rem 0.65rem; margin-bottom: 0.35rem;
      border: 1px solid #eef2f7; border-radius: 12px; background: #fff; cursor: pointer;
    }
    .ride.on { border-color: #86efac; background: #f0fdf6; }
    .chat { display: flex; flex-direction: column; min-height: 420px; }
    .messages { flex: 1; overflow-y: auto; max-height: 360px; padding: 0.5rem; display: flex; flex-direction: column; gap: 0.45rem; }
    .bubble { max-width: 80%; padding: 0.5rem 0.75rem; border-radius: 14px; background: #f1f5f9; }
    .bubble.mine { align-self: flex-end; background: #dcfce7; }
    .bubble p { margin: 0; font-size: 0.9rem; }
    .bubble small { font-size: 0.7rem; color: #64748b; }
    .composer { display: flex; gap: 0.5rem; margin-top: 0.65rem; }
    .inp { flex: 1; min-height: 44px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0.5rem 0.75rem; }
    .btn { min-height: 44px; padding: 0 1rem; border: none; border-radius: 12px; font-weight: 800; cursor: pointer; }
    .btn.primary { background: #0d9f6e; color: #fff; }
    .muted { color: #64748b; font-size: 0.85rem; }
    .center { text-align: center; }
    .err { color: #e11d48; font-size: 0.85rem; }
  `]
})
export class ChatPageComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private signalR = inject(SignalRService);
  private route = inject(ActivatedRoute);
  private api = (environment.apiUrl || '/api/v1').replace(/\/$/, '');

  @ViewChild('msgBox') msgBox?: ElementRef<HTMLDivElement>;

  rides = signal<any[]>([]);
  ridesLoading = signal(true);
  messages = signal<any[]>([]);
  selectedRideId = '';
  draft = '';
  busy = signal(false);
  err = signal('');

  private poll: any = null;
  private chatSub?: Subscription;

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap.get('rideId') || '';
    this.http.get<any>(`${this.api}/rides/my`).subscribe({
      next: (r) => {
        const d = r?.data ?? r;
        const list = Array.isArray(d) ? d : d?.items ?? [];
        this.rides.set(list);
        this.ridesLoading.set(false);
        if (q) this.selectRide(q);
        else if (list[0]?.id) this.selectRide(list[0].id);
      },
      error: () => this.ridesLoading.set(false)
    });

    this.chatSub = this.signalR.chatMessage$.subscribe((m: any) => {
      const rid = m?.rideId || m?.RideId;
      if (!rid || String(rid) !== String(this.selectedRideId)) return;
      this.messages.update((list) => {
        const id = m?.id || m?.Id;
        if (id && list.some((x) => String(x.id || x.Id) === String(id))) return list;
        return [...list, m];
      });
      setTimeout(() => {
        const el = this.msgBox?.nativeElement;
        if (el) el.scrollTop = el.scrollHeight;
      }, 30);
    });
  }

  ngOnDestroy(): void {
    if (this.poll) clearInterval(this.poll);
    this.chatSub?.unsubscribe();
  }

  async selectRide(id: string): Promise<void> {
    this.selectedRideId = id;
    this.loadMessages();
    if (this.poll) clearInterval(this.poll);
    this.poll = setInterval(() => this.loadMessages(true), 15000);

    try {
      await this.signalR.connect();
      await this.signalR.joinRide(id);
    } catch {
      /* poll backup */
    }
  }

  loadMessages(silent = false): void {
    if (!this.selectedRideId) return;
    this.http.get<any>(`${this.api}/chats/${this.selectedRideId}`).subscribe({
      next: (r) => {
        const d = r?.data ?? r;
        const list = Array.isArray(d) ? d : d?.messages ?? d?.items ?? [];
        this.messages.set(list);
        setTimeout(() => {
          const el = this.msgBox?.nativeElement;
          if (el) el.scrollTop = el.scrollHeight;
        }, 30);
      },
      error: () => {
        if (!silent) this.err.set('Could not load messages');
      }
    });
  }

  send(): void {
    const text = this.draft.trim();
    if (!text || !this.selectedRideId) return;
    this.busy.set(true);
    this.err.set('');
    this.http.post<any>(`${this.api}/chats/${this.selectedRideId}/messages`, { message: text }).subscribe({
      next: () => {
        this.draft = '';
        this.busy.set(false);
        this.loadMessages();
      },
      error: (e) => {
        this.busy.set(false);
        this.err.set(e.error?.message || 'Send failed');
      }
    });
  }

  isMine(m: any): boolean {
    const a: any = this.auth;
    const u = a.currentUser?.() ?? a.user?.() ?? a.getUser?.();
    const myId = u?.id || u?.userId;
    return !!(myId && (m.senderId === myId || m.userId === myId || m.SenderId === myId));
  }

  shortId(id?: string): string {
    if (!id) return '—';
    return id.length > 8 ? id.slice(0, 8) : id;
  }

  shortRoute(r: any): string {
    const s = r.sourceAddress || r.route?.sourceAddress || 'Ride';
    return s.length > 28 ? s.slice(0, 26) + '…' : s;
  }

  prettyStatus(s?: string): string {
    return String(s || '').replace(/([a-z])([A-Z])/g, '$1 $2') || '—';
  }

  formatTime(t?: string): string {
    if (!t) return '';
    try {
      return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return t;
    }
  }
}