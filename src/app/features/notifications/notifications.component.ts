import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

type Filter = 'all' | 'rides' | 'sos';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rs-page">
      <header class="head">
        <div>
          <div class="chips">
            <span class="chip">Inbox &amp; Alerts</span>
            <span class="chip gold">Real-time updates</span>
          </div>
          <h1>Notifications</h1>
          <p class="sub">Ride confirmations, ratings, chat, and emergency telemetry.</p>
        </div>
        <button type="button" class="btn ghost" (click)="markAll()" [disabled]="busy()">Mark all read</button>
      </header>

      <div class="filters">
        <button type="button" [class.on]="filter()==='all'" (click)="filter.set('all')">All ({{ items().length }})</button>
        <button type="button" [class.on]="filter()==='rides'" (click)="filter.set('rides')">Rides &amp; Confirmations</button>
        <button type="button" [class.on]="filter()==='sos'" (click)="filter.set('sos')">SOS &amp; Safety</button>
      </div>

      @if (err()) { <p class="err">{{ err() }}</p> }
      @if (loading()) { <p class="muted">Loading…</p> }

      <div class="list">
        @for (n of visible(); track n.id || $index) {
          <article class="card" [class.unread]="!n.isRead" [class.sos]="isSos(n)">
            <div class="icon">{{ icon(n) }}</div>
            <div class="body">
              <div class="title-row">
                <strong>{{ n.title || n.type || 'Notification' }}</strong>
                @if (!n.isRead) { <span class="dot"></span> }
                @if (isSos(n)) { <span class="badge">CRITICAL SOS</span> }
              </div>
              <p>{{ n.message || n.body || n.content }}</p>
              <p class="muted">{{ formatDate(n.createdAt || n.sentAt) }} · {{ n.type || n.category || 'Update' }}</p>
            </div>
            @if (!n.isRead) {
              <button type="button" class="btn tiny" (click)="markOne(n)">Read</button>
            }
          </article>
        } @empty {
          @if (!loading()) {
            <p class="muted">No notifications in this filter.</p>
          }
        }
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
    .sub { margin: 0.3rem 0 0; color: #64748b; font-size: 0.9rem; }
    .filters {
      display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 1rem;
      background: #fff; border: 1px solid #e2e8f0; border-radius: 999px; padding: 0.3rem; width: fit-content;
    }
    .filters button {
      border: none; background: transparent; padding: 0.45rem 0.9rem; border-radius: 999px;
      font-weight: 800; font-size: 0.82rem; color: #64748b; cursor: pointer;
    }
    .filters button.on { background: #0d9f6e; color: #fff; }
    .list { display: flex; flex-direction: column; gap: 0.55rem; }
    .card {
      display: flex; gap: 0.75rem; align-items: flex-start;
      background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 0.95rem 1rem;
    }
    .card.unread { border-color: #b7ebc9; background: #f6fffb; }
    .card.sos { border-color: #fecdd3; background: #fff1f2; }
    .icon {
      width: 40px; height: 40px; border-radius: 12px; background: #e8f8f1;
      display: grid; place-items: center; flex-shrink: 0; font-size: 1.1rem;
    }
    .body { flex: 1; min-width: 0; }
    .title-row { display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #0d9f6e; }
    .badge {
      font-size: 0.68rem; font-weight: 800; padding: 0.2rem 0.5rem; border-radius: 999px;
      background: #e11d48; color: #fff;
    }
    .body p { margin: 0.25rem 0 0; color: #334155; font-size: 0.9rem; }
    .muted { color: #64748b !important; font-size: 0.8rem !important; }
    .btn {
      border: 1px solid #e2e8f0; background: #fff; border-radius: 999px;
      padding: 0.45rem 0.9rem; font-weight: 800; cursor: pointer;
    }
    .btn.tiny { padding: 0.3rem 0.65rem; font-size: 0.75rem; }
    .err { color: #e11d48; }
  `]
})
export class NotificationsComponent implements OnInit {
  private http = inject(HttpClient);
  private api = (environment.apiUrl || '/api/v1').replace(/\/$/, '');

  items = signal<any[]>([]);
  filter = signal<Filter>('all');
  loading = signal(true);
  busy = signal(false);
  err = signal('');

  visible = computed(() => {
    const f = this.filter();
    const all = this.items();
    if (f === 'sos') return all.filter((n) => this.isSos(n));
    if (f === 'rides') {
      return all.filter((n) => {
        const t = String(n.type || n.category || '').toLowerCase();
        return t.includes('ride') || t.includes('match') || t.includes('confirm') || t.includes('rating');
      });
    }
    return all;
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.http.get<any>(`${this.api}/notifications`).subscribe({
      next: (r) => {
        const d = r?.data ?? r;
        this.items.set(Array.isArray(d) ? d : d?.items ?? []);
        this.loading.set(false);
      },
      error: (e) => {
        this.err.set(e.error?.message || 'Could not load notifications');
        this.loading.set(false);
      }
    });
  }

  isSos(n: any): boolean {
    const t = String(n.type || n.category || n.title || '').toLowerCase();
    return t.includes('sos') || t.includes('emergency') || t.includes('safety');
  }

  icon(n: any): string {
    if (this.isSos(n)) return '🚨';
    const t = String(n.type || '').toLowerCase();
    if (t.includes('chat') || t.includes('message')) return '💬';
    if (t.includes('rating')) return '⭐';
    if (t.includes('ride') || t.includes('match')) return '🚐';
    return '🔔';
  }

  markAll(): void {
    this.busy.set(true);
    this.http.post(`${this.api}/notifications/read-all`, {}).subscribe({
      next: () => { this.busy.set(false); this.load(); },
      error: () => {
        this.http.put(`${this.api}/notifications/mark-all-read`, {}).subscribe({
          next: () => { this.busy.set(false); this.load(); },
          error: () => this.busy.set(false)
        });
      }
    });
  }

  markOne(n: any): void {
    if (!n.id) return;
    this.http.post(`${this.api}/notifications/${n.id}/read`, {}).subscribe({
      next: () => this.load(),
      error: () => {
        this.http.put(`${this.api}/notifications/${n.id}/read`, {}).subscribe({
          next: () => this.load(),
          error: () => {}
        });
      }
    });
  }

  formatDate(d?: string): string {
    if (!d) return '';
    try { return new Date(d).toLocaleString(); } catch { return d; }
  }
}
