import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-admin-verification',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="rs-page">
      <header class="head">
        <div>
          <div class="chips">
            <span class="chip">Admin Review</span>
            <span class="chip gold">Institution · Documents</span>
          </div>
          <h1>Verification queue</h1>
          <p class="sub">Approve, reject, or request changes on verification requests.</p>
        </div>
        <a routerLink="/app/dashboard" class="btn ghost">Dashboard</a>
      </header>

      <select class="inp filter" [(ngModel)]="filter" (ngModelChange)="load()">
        <option value="">All</option>
        <option value="Pending">Pending</option>
        <option value="RequiresChanges">Requires changes</option>
        <option value="Approved">Approved</option>
        <option value="Rejected">Rejected</option>
      </select>

      @if (err()) { <p class="err">{{ err() }}</p> }
      @if (loading()) { <p class="muted">Loading…</p> }

      <div class="list">
        @for (r of items(); track r.id) {
          <article class="card">
            <div class="row">
              <div>
                <strong>{{ r.userName || r.email || 'User' }}</strong>
                <span class="muted">{{ r.email }}</span>
              </div>
              <span class="badge">{{ r.status }}</span>
            </div>
            <p class="muted">
              ID: {{ r.studentOrEmployeeId || '—' }}
              · CNIC ****{{ r.cnicLast4 || '????' }}
              · {{ r.institutionName || 'No institution' }}
            </p>
            <ul>
              @for (d of (r.documents || []); track d.id) {
                <li>{{ d.documentType }} — {{ d.fileName }}</li>
              }
            </ul>
            <textarea class="ta" [(ngModel)]="notes[r.id]" placeholder="Admin note"></textarea>
            <div class="actions">
              <button type="button" class="btn primary" (click)="review(r, 'Approved')">Approve</button>
              <button type="button" class="btn ghost" (click)="review(r, 'RequiresChanges')">Changes</button>
              <button type="button" class="btn danger" (click)="review(r, 'Rejected')">Reject</button>
            </div>
          </article>
        } @empty {
          @if (!loading()) { <p class="muted">No requests for this filter.</p> }
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
    .filter { max-width: 260px; margin-bottom: 1rem; }
    .inp, .ta {
      width: 100%; min-height: 44px; padding: 0.5rem 0.75rem; border-radius: 12px;
      border: 1px solid #e2e8f0; font-size: 0.95rem;
    }
    .ta { min-height: 72px; margin: 0.5rem 0; resize: vertical; }
    .list { display: flex; flex-direction: column; gap: 0.85rem; }
    .card {
      background: #fff; border: 1px solid #b7ebc9; border-radius: 16px; padding: 1.1rem;
      box-shadow: 0 6px 18px rgba(15,23,42,0.04);
    }
    .row { display: flex; justify-content: space-between; gap: 0.5rem; align-items: flex-start; }
    .badge {
      font-size: 0.72rem; font-weight: 800; padding: 0.25rem 0.65rem; border-radius: 999px;
      background: #f1f5f9; color: #475569;
    }
    ul { margin: 0.4rem 0; padding-left: 1.1rem; color: #475569; font-size: 0.88rem; }
    .actions { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .btn {
      display: inline-flex; align-items: center; min-height: 42px; padding: 0.45rem 1rem;
      border-radius: 999px; font-weight: 800; border: none; cursor: pointer; text-decoration: none;
    }
    .btn.primary { background: #0d9f6e; color: #fff; }
    .btn.ghost { background: #fff; border: 1px solid #e2e8f0; color: #0f172a; }
    .btn.danger { background: #e11d48; color: #fff; }
    .muted { color: #64748b; font-size: 0.85rem; display: block; }
    .err { color: #e11d48; }
  `]
})
export class AdminVerificationComponent implements OnInit {
  private http = inject(HttpClient);
  private api = (environment.apiUrl || '/api/v1').replace(/\/$/, '');

  items = signal<any[]>([]);
  filter = '';
  notes: Record<string, string> = {};
  loading = signal(true);
  err = signal('');

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true); this.err.set('');
    const q = this.filter ? `?status=${encodeURIComponent(this.filter)}` : '';
    this.http.get<any>(`${this.api}/verification/admin/requests${q}`).subscribe({
      next: (r) => {
        const d = r?.data ?? r;
        this.items.set(Array.isArray(d) ? d : d?.items ?? []);
        this.loading.set(false);
      },
      error: (e) => {
        this.err.set(e.error?.message || 'Admin only / server error');
        this.loading.set(false);
      }
    });
  }

  review(r: any, decision: string): void {
    this.http.post<any>(`${this.api}/verification/admin/requests/${r.id}/review`, {
      decision,
      status: decision,
      adminNote: this.notes[r.id] || undefined
    }).subscribe({
      next: () => this.load(),
      error: (e) => this.err.set(e.error?.message || 'Review failed')
    });
  }
}
