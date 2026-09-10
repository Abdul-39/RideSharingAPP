import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ChatService, ChatMessageDto, ChatThreadDto } from '../../core/services/chat.service';
import { SignalRService } from '../../core/services/signalr.service';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <header>
        <h1>Chat</h1>
        <p>Message only with people on your rides</p>
      </header>

      @if (!activeRideId()) {
        <section class="card">
          <h2>Conversations</h2>
          @if (loading()) { <p class="muted">Loading…</p> }
          @else if (!threads().length) {
            <p class="muted">No ride chats yet. Accept a match to start chatting.</p>
          } @else {
            @for (t of threads(); track t.rideId) {
              <button type="button" class="thread" (click)="openThread(t.rideId)">
                <div>
                  <strong>{{ t.title }}</strong>
                  <span class="muted">{{ t.status }} · {{ t.lastMessage || 'No messages yet' }}</span>
                </div>
                @if (t.unreadCount > 0) {
                  <span class="badge">{{ t.unreadCount }}</span>
                }
              </button>
            }
          }
        </section>
      } @else {
        <section class="card chat">
          <div class="chat-head">
            <button type="button" class="link" (click)="closeThread()">← Back</button>
            <span class="muted">Ride chat</span>
          </div>
          <div class="msgs" #box>
            @for (m of messages(); track m.id) {
              <div class="bubble" [class.mine]="m.isMine">
                <div class="meta">{{ m.isMine ? 'You' : m.senderName }} · {{ m.sentAt | date:'shortTime' }}</div>
                <div class="text">{{ m.message }}</div>
              </div>
            }
          </div>
          <form class="composer" (ngSubmit)="send()">
            <input [(ngModel)]="draft" name="draft" placeholder="Type a message…" maxlength="2000" />
            <button type="submit" class="btn" [disabled]="!draft.trim() || sending()">Send</button>
          </form>
        </section>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 720px; margin: 0 auto; }
    header { margin-bottom: 1rem; }
    h1 { margin: 0; font-size: 1.45rem; }
    header p { margin: 0.25rem 0 0; color: #94a3b8; font-size: 0.9rem; }
    .card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
      border-radius: 1.1rem; padding: 1rem; }
    h2 { margin: 0 0 0.75rem; font-size: 1rem; }
    .thread { width: 100%; text-align: left; display: flex; justify-content: space-between; gap: 0.75rem;
      padding: 0.75rem; margin-bottom: 0.45rem; border-radius: 0.75rem; border: 1px solid rgba(255,255,255,0.08);
      background: rgba(0,0,0,0.2); color: #e2e8f0; cursor: pointer; }
    .thread strong { display: block; font-size: 0.9rem; }
    .badge { background: #5b8cff; color: #fff; border-radius: 999px; padding: 0.15rem 0.5rem; font-size: 0.75rem; height: fit-content; }
    .muted { color: #94a3b8; font-size: 0.8rem; }
    .chat { display: flex; flex-direction: column; min-height: 420px; }
    .chat-head { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
    .link { background: none; border: none; color: #93c5fd; cursor: pointer; }
    .msgs { flex: 1; overflow-y: auto; max-height: 360px; display: flex; flex-direction: column; gap: 0.45rem; margin-bottom: 0.75rem; }
    .bubble { max-width: 80%; padding: 0.55rem 0.75rem; border-radius: 0.85rem; background: rgba(255,255,255,0.06); }
    .bubble.mine { align-self: flex-end; background: rgba(91,140,255,0.25); }
    .meta { font-size: 0.7rem; color: #94a3b8; margin-bottom: 0.2rem; }
    .composer { display: flex; gap: 0.5rem; }
    .composer input { flex: 1; padding: 0.6rem 0.75rem; border-radius: 0.75rem; border: 1px solid rgba(255,255,255,0.12);
      background: rgba(0,0,0,0.3); color: #fff; }
    .btn { padding: 0.55rem 1rem; border: none; border-radius: 999px; font-weight: 600; cursor: pointer;
      background: linear-gradient(135deg,#5b8cff,#7c5cff); color: #fff; }
    .btn:disabled { opacity: 0.5; }
  `]
})
export class ChatPageComponent implements OnInit, OnDestroy {
  private chat = inject(ChatService);
  private signalR = inject(SignalRService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  threads = signal<ChatThreadDto[]>([]);
  messages = signal<ChatMessageDto[]>([]);
  loading = signal(false);
  sending = signal(false);
  activeRideId = signal<string | null>(null);
  draft = '';
  private sub: { unsubscribe(): void } | null = null;

  ngOnInit(): void {
    this.loadThreads();
    const id = this.route.snapshot.paramMap.get('rideId');
    if (id) this.openThread(id);
    void this.signalR.connect().catch(() => {});
  }

  ngOnDestroy(): void {
    this.teardown();
  }

  loadThreads(): void {
    this.loading.set(true);
    this.chat.getThreads().subscribe({
      next: res => {
        this.loading.set(false);
        if (res.success && res.data) this.threads.set(res.data);
      },
      error: () => this.loading.set(false)
    });
  }

  openThread(rideId: string): void {
    this.teardown();
    this.activeRideId.set(rideId);
    this.router.navigate(['/app/chat', rideId], { replaceUrl: true });
    this.chat.getMessages(rideId).subscribe({
      next: res => {
        if (res.success && res.data) this.messages.set(res.data);
        this.chat.markRead(rideId).subscribe();
      }
    });
    void this.signalR.joinRide(rideId).catch(() => {});
    this.sub = this.signalR.chatMessage$.subscribe((m: any) => {
      if (String(m.rideId).toLowerCase() !== rideId.toLowerCase()) return;
      this.messages.update(list => {
        if (list.some(x => x.id === m.id)) return list;
        return [...list, {
          id: m.id, rideId: m.rideId, senderId: m.senderId, senderName: m.senderName,
          receiverId: m.receiverId, message: m.message, sentAt: m.sentAt, isRead: m.isRead,
          isMine: !!m.isMine
        }];
      });
    });
  }

  closeThread(): void {
    const id = this.activeRideId();
    if (id) void this.signalR.leaveRide(id);
    this.teardown();
    this.activeRideId.set(null);
    this.messages.set([]);
    this.router.navigate(['/app/chat']);
    this.loadThreads();
  }

  send(): void {
    const id = this.activeRideId();
    const text = this.draft.trim();
    if (!id || !text) return;
    this.sending.set(true);
    this.chat.send(id, text).subscribe({
      next: res => {
        this.sending.set(false);
        if (res.success && res.data) {
          this.messages.update(list => [...list, res.data!]);
          this.draft = '';
        }
      },
      error: () => this.sending.set(false)
    });
  }

  private teardown(): void {
    this.sub?.unsubscribe();
    this.sub = null;
  }
}
