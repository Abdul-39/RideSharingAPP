import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-payment-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="rs-page">
      <header class="head">
        <div>
          <div class="chips">
            <span class="chip">Payments</span>
            <span class="chip gold">Cash · Mock Wallet</span>
          </div>
          <h1>Payments</h1>
          <p class="sub">Pay for completed rides or top up via wallet.</p>
        </div>
        <a routerLink="/app/wallet" class="btn ghost">Open wallet</a>
      </header>

      <section class="card">
        <h2>Pay for a ride</h2>
        @if (err()) { <p class="err">{{ err() }}</p> }
        @if (msg()) { <p class="ok">{{ msg() }}</p> }
        <label class="lbl">Ride ID
          <input class="inp" [(ngModel)]="rideId" name="rid" placeholder="Paste ride Id from My Rides" />
        </label>
        <label class="lbl">Method
          <select class="inp" [(ngModel)]="method" name="m">
            <option value="Cash">Cash</option>
            <option value="MockWallet">Mock Wallet</option>
          </select>
        </label>
        <button type="button" class="btn primary" (click)="pay()" [disabled]="busy() || !rideId">
          Confirm payment
        </button>
      </section>

      <section class="card">
        <h2>Recent payments</h2>
        @for (p of payments(); track p.id || $index) {
          <div class="row">
            <div>
              <strong>{{ p.method || p.paymentMethod || 'Payment' }}</strong>
              <p class="muted">{{ p.status }} · {{ p.rideId || '' }}</p>
            </div>
            <strong>Rs. {{ p.amount ?? p.fare ?? '—' }}</strong>
          </div>
        } @empty {
          <p class="muted">No payments listed.</p>
        }
      </section>
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
    h2 { margin: 0 0 0.75rem; font-size: 1.05rem; font-weight: 800; }
    .sub { margin: 0.3rem 0 0; color: #64748b; font-size: 0.9rem; }
    .card {
      background: #fff; border: 1px solid #b7ebc9; border-radius: 16px; padding: 1.15rem;
      margin-bottom: 0.9rem; box-shadow: 0 6px 18px rgba(15,23,42,0.04); max-width: 560px;
    }
    .lbl { display: block; font-size: 0.78rem; font-weight: 700; color: #64748b; margin-bottom: 0.65rem; }
    .inp {
      display: block; width: 100%; margin-top: 0.3rem; min-height: 44px;
      padding: 0.5rem 0.75rem; border-radius: 12px; border: 1px solid #e2e8f0;
    }
    .btn {
      display: inline-flex; align-items: center; min-height: 44px; padding: 0.5rem 1.1rem;
      border-radius: 999px; font-weight: 800; border: none; cursor: pointer; text-decoration: none;
    }
    .btn.primary { background: #0d9f6e; color: #fff; margin-top: 0.35rem; }
    .btn.ghost { background: #fff; border: 1px solid #e2e8f0; color: #0f172a; }
    .row {
      display: flex; justify-content: space-between; gap: 0.75rem; padding: 0.65rem 0;
      border-bottom: 1px solid #f1f5f9;
    }
    .muted { color: #64748b; font-size: 0.85rem; margin: 0.15rem 0 0; }
    .err { color: #e11d48; } .ok { color: #0d9f6e; }
  `]
})
export class PaymentPageComponent implements OnInit {
  private http = inject(HttpClient);
  private api = (environment.apiUrl || '/api/v1').replace(/\/$/, '');

  rideId = '';
  method = 'Cash';
  payments = signal<any[]>([]);
  busy = signal(false);
  err = signal('');
  msg = signal('');

  ngOnInit(): void {
    this.http.get<any>(`${this.api}/payments/my`).subscribe({
      next: (r) => {
        const d = r?.data ?? r;
        this.payments.set(Array.isArray(d) ? d : d?.items ?? []);
      },
      error: () => {}
    });
  }

  pay(): void {
    this.busy.set(true); this.err.set(''); this.msg.set('');
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    this.http.post(`${this.api}/payments`, {
      rideId: this.rideId,
      method: this.method,
      paymentMethod: this.method
    }, { headers }).subscribe({
      next: (r: any) => {
        this.busy.set(false);
        this.msg.set(r?.message || 'Payment recorded');
      },
      error: (e) => {
        this.busy.set(false);
        this.err.set(e.error?.message || 'Payment failed');
      }
    });
  }
}
