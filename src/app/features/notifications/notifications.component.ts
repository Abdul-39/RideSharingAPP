import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NotificationService, NotificationDto } from '../../core/services/notification.service';
import { SignalRService } from '../../core/services/signalr.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page">
      <header class="head">
        <div>
          <h1>Notifications</h1>
          <p>Matches, ride updates, chat and more</p>
        </div>
        <button type="button" class="btn ghost" (click)="markAll()" [disabled]="!items().length">Mark all read</button>
      </header>

      @if (loading()) { <p class="muted">Loading…</p> }
      @else if (!items().length) {
        <div class="empty card">
          <div class="ico">🔔</div>
          <h3>No notifications yet</h3>
          <p>When matches and rides update, alerts appear here in real time.</p>
          <a routerLink="/app/rides/lifecycle" class="btn">Open My Rides</a>
        </div>
      } @else {
        <div class="list">
          @for (n of items(); track n.id) {
            <button type="button" class="row" [class.unread]="!n.isRead" (click)="open(n)">
              <div>
                <strong>{{ n.title }}</strong>
                <span>{{ n.body }}</span>
                <small>{{ n.createdAt | date:'medium' }} · {{ n.type }}</small>
              </div>
              @if (!n.isRead) { <span class="dot"></span> }
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .head { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; margin-bottom: 1.25rem; }
    h1 { margin: 0; font-size: 1.5rem; }
    .head p { margin: 0.3rem 0 0; color: #94a3b8; font-size: 0.9rem; }
    .card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
      border-radius: 1.15rem; padding: 2.5rem 1.5rem; text-align: center; }
    .ico { font-size: 2rem; margin-bottom: 0.5rem; }
    h3 { margin: 0 0 0.4rem; }
    p { color: #94a3b8; font-size: 0.9rem; max-width: 360px; margin: 0 auto 1.25rem; line-height: 1.5; }
    .btn { display: inline-flex; padding: 0.55rem 1.1rem; border-radius: 999px; font-weight: 600; border: none; cursor: pointer;
      background: linear-gradient(135deg,#5b8cff,#7c5cff); color: #fff; text-decoration: none; }
    .btn.ghost { background: transparent; border: 1px solid rgba(255,255,255,0.15); color: #e2e8f0; }
    .list { display: flex; flex-direction: column; gap: 0.45rem; }
    .row { width: 100%; text-align: left; display: flex; justify-content: space-between; gap: 0.75rem;
      padding: 0.85rem 1rem; border-radius: 0.9rem; border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.03); color: #e2e8f0; cursor: pointer; }
    .row.unread { background: rgba(91,140,255,0.12); border-color: rgba(91,140,255,0.25); }
    .row strong { display: block; font-size: 0.92rem; }
    .row span { display: block; font-size: 0.85rem; color: #cbd5e1; margin-top: 0.15rem; }
    .row small { display: block; margin-top: 0.35rem; color: #64748b; font-size: 0.72rem; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #5b8cff; margin-top: 0.35rem; flex-shrink: 0; }
    .muted { color: #94a3b8; }
  `]
})
export class NotificationsComponent implements OnInit, OnDestroy {
  private api = inject(NotificationService);
  private signalR = inject(SignalRService);
  items = signal<NotificationDto[]>([]);
  loading = signal(false);
  private sub: { unsubscribe(): void } | null = null;

  ngOnInit(): void {
    this.load();
    this.api.refreshUnread();
    void this.signalR.connect().catch(() => {});
    this.sub = this.signalR.userNotification$.subscribe((n: any) => {
      this.items.update(list => [{
        id: n.id, type: n.type, title: n.title, body: n.body, isRead: n.isRead,
        relatedEntityId: n.relatedEntityId, linkUrl: n.linkUrl, createdAt: n.createdAt
      }, ...list]);
      this.api.prependLocal(n);
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  load(): void {
    this.loading.set(true);
    this.api.getMine().subscribe({
      next: res => {
        this.loading.set(false);
        if (res.success && res.data) this.items.set(res.data);
      },
      error: () => this.loading.set(false)
    });
  }

  markAll(): void {
    this.api.markAllRead().subscribe({ next: () => this.items.update(list => list.map(n => ({ ...n, isRead: true }))) });
  }

  open(n: NotificationDto): void {
    if (!n.isRead) {
      this.api.markRead(n.id).subscribe({
        next: () => this.items.update(list => list.map(x => x.id === n.id ? { ...x, isRead: true } : x))
      });
    }
  }
}
