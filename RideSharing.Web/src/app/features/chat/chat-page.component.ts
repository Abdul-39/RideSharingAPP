import { Component, OnInit, OnDestroy, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="rs-page chat-page">
      <header class="head">
        <div>
          <div class="chips">
            <span class="chip">In-Ride Chat</span>
            <span class="chip gold">Secure · Ride only</span>
          </div>
          <h1>Chat</h1>
          <p class="sub">Message only people on the same confirmed ride.</p>
        </div>
        <a routerLink="/app/rides/lifecycle" class="btn ghost">My Rides</a>
      </header>

      <div class="layout">
        <aside class="card list">
          <h2>Conversations</h2>
          @if (ridesLoading()) { <p class="muted">Loading…</p> }
          @for (r of rides(); track r.id) {
            <button type="button" class="ride-item" [class.on]="selectedRideId===r.id" (click)="selectRide(r.id)">
              <strong>{{ shortRoute(r) }}</strong>
              <span class="muted">{{ prettyStatus(r.status) }} · {{ shortId(r.id) }}</span>
            </button>
          } @empty {
            @if (!ridesLoading()) {
              <p class="muted">No rides to chat. Confirm a match first.</p>
            }
          }
        </aside>

        <section class="card thread">
          @if (!selectedRideId) {
            <div class="empty">
              <p>Select a ride conversation</p>
            </div>
          } @else {
            <div class="thread-head">
              <strong>Ride {{ shortId(selectedRideId) }}</strong>
              <a class="link" [routerLink]="['/app/rides/lifecycle', selectedRideId]">Open ride</a>
            </div>
            <div class="messages" #msgBox>
              @for (m of messages(); track m.id || $index) {
                <div class="bubble" [class.me]="isMine(m)">
                  <p>{{ m.message || m.body || m.content }}</p>
                  <small>{{ formatTime(m.sentAt || m.createdAt) }}</small>
                </div>
              } @empty {
                <p class="muted center">No messages yet. Say salaam 👋</p>
              }
            </div>
            <div class="composer">
              <input class="inp" [(ngModel)]="draft" name="draft"
                     placeholder="Type a message…"
                     (keydown.enter)="send()" />
              <button type="button" class="btn primary" (click)="send()" [disabled]="!draft.trim() || busy()">
                Send
              </button>
            </div>
            @if (err()) { <p class="err">{{ err() }}</p> }
          }
        </section>
      </div>
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
    h2 { margin: 0 0 0.65rem; font-size: 0.95rem; font-weight: 800; }
    .sub { margin: 0.3rem 0 0; color: #64748b; font-size: 0.9rem; }
    .layout { display: grid; grid-template-columns: 280px 1fr; gap: 0.9rem; min-height: 520px; }
    @media (max-width: 800px) { .layout { grid-template-columns: 1fr; } }
    .card {
      background: #fff; border: 1px solid #b7ebc9; border-radius: 16px; padding: 1rem;
      box-shadow: 0 6px 18px rgba(15,23,42,0.04);
    }
    .list { max-height: 560px; overflow: auto; }
    .ride-item {
      display: flex; flex-direction: column; gap: 0.15rem; width: 100%; text-align: left;
      border: 1px solid #e2e8f0; background: #fafdfb; border-radius: 12px;
      padding: 0.75rem; margin-bottom: 0.45rem; cursor: pointer;
    }
    .ride-item.on { border-color: #0d9f6e; background: #e8f8f1; }
    .thread { display: flex; flex-direction: column; min-height: 520px; }
    .thread-head {
      display: flex; justify-content: space-between; align-items: center;
      padding-bottom: 0.65rem; border-bottom: 1px solid #f1f5f9; margin-bottom: 0.65rem;
    }
    .link { color: #0d9f6e; font-weight: 700; font-size: 0.85rem; text-decoration: none; }
    .messages {
      flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 0.45rem;
      padding: 0.25rem 0 0.75rem; max-height: 380px;
    }
    .bubble {
      max-width: 75%; padding: 0.65rem 0.85rem; border-radius: 14px 14px 14px 4px;
      background: #f1f5f9; align-self: flex-start;
    }
    .bubble.me {
      background: #0d9f6e; color: #fff; align-self: flex-end; border-radius: 14px 14px 4px 14px;
    }
    .bubble p { margin: 0; font-size: 0.92rem; line-height: 1.4; }
    .bubble small { display: block; margin-top: 0.25rem; opacity: 0.75; font-size: 0.7rem; }
    .composer { display: flex; gap: 0.45rem; margin-top: auto; }
    .inp {
      flex: 1; min-height: 46px; padding: 0.55rem 0.85rem; border-radius: 999px;
      border: 1px solid #e2e8f0; font-size: 0.95rem;
    }
    .btn {
      display: inline-flex; align-items: center; justify-content: center; min-height: 46px;
      padding: 0.5rem 1.15rem; border-radius: 999px; font-weight: 800; border: none; cursor: pointer;
      text-decoration: none;
    }
    .btn.primary { background: #0d9f6e; color: #fff; }
    .btn.ghost { background: #fff; border: 1px solid #e2e8f0; color: #0f172a; }
    .empty { flex: 1; display: grid; place-items: center; color: #94a3b8; }
    .center { text-align: center; }
    .muted { color: #64748b; font-size: 0.82rem; }
    .err { color: #e11d48; margin-top: 0.35rem; }
  `]
})
export class ChatPageComponent implements OnInit, OnDestroy {
  @ViewChild('msgBox') msgBox?: ElementRef<HTMLDivElement>;

  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);
  private api = (environment.apiUrl || '/api/v1').replace(/\/$/, '');
  private poll: any;

  rides = signal<any[]>([]);
  messages = signal<any[]>([]);
  ridesLoading = signal(true);
  selectedRideId = '';
  draft = '';
  busy = signal(false);
  err = signal('');

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap.get('rideId')
      || this.route.snapshot.paramMap.get('rideId')
      || this.route.snapshot.paramMap.get('id');
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
  }

  ngOnDestroy(): void {
    if (this.poll) clearInterval(this.poll);
  }

  selectRide(id: string): void {
    this.selectedRideId = id;
    this.loadMessages();
    if (this.poll) clearInterval(this.poll);
    this.poll = setInterval(() => this.loadMessages(true), 5000);
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
    this.busy.set(true); this.err.set('');
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
    return myId && (m.senderId === myId || m.userId === myId);
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
    try { return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    catch { return t; }
  }
}
