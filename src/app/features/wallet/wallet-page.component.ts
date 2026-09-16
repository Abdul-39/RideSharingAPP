import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-wallet-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="rs-page">
      <header class="head">
        <div>
          <div class="chips">
            <span class="chip">Commute Wallet &amp; Payments</span>
            <span class="chip gold">Pakistani Rupee (PKR)</span>
          </div>
          <h1>Wallet &amp; Payments</h1>
          <p class="sub">Balance, deposits, fare estimator, and billing history.</p>
        </div>
        <a routerLink="/app/payments" class="btn ghost">Payments</a>
      </header>

      <div class="top-grid">
        <section class="balance card">
          <div class="bal-top">
            <span>Available Balance</span>
            <span class="chip gold">Verified PKR</span>
          </div>
          <div class="amount">Rs. {{ balance() | number:'1.2-2' }}</div>
          <p class="muted">Automatic deduction for campus corridors</p>
        </section>

        <section class="card">
          <h2>Deposit Funds to Wallet</h2>
          <p class="muted">Mock top-up (EasyPaisa / JazzCash architecture ready).</p>
          <div class="quick">
            <button type="button" class="q" [class.on]="amount===500" (click)="amount=500">+Rs. 500</button>
            <button type="button" class="q" [class.on]="amount===1000" (click)="amount=1000">+Rs. 1000</button>
            <button type="button" class="q" [class.on]="amount===2000" (click)="amount=2000">+Rs. 2000</button>
          </div>
          <div class="row2">
            <label class="lbl">Payment method
              <select class="inp" [(ngModel)]="method" name="method">
                <option value="MockWallet">Mock Wallet</option>
                <option value="EasyPaisa">Easypaisa (mock)</option>
                <option value="JazzCash">JazzCash (mock)</option>
                <option value="Cash">Cash</option>
              </select>
            </label>
            <label class="lbl">Mobile number
              <input class="inp" [(ngModel)]="mobile" name="mobile" placeholder="03XXXXXXXXX" />
            </label>
          </div>
          @if (err()) { <p class="err">{{ err() }}</p> }
          @if (msg()) { <p class="ok">{{ msg() }}</p> }
          <button type="button" class="btn primary full" (click)="deposit()" [disabled]="busy()">
            Deposit Rs. {{ amount }} to Wallet
          </button>
        </section>
      </div>

      <section class="card">
        <h2>Commute Fare Estimator</h2>
        <div class="row2">
          <label class="lbl">Corridor distance (km)
            <input class="inp" type="number" step="0.1" [(ngModel)]="distanceKm" name="km" />
          </label>
          <label class="lbl">Seats
            <input class="inp" type="number" min="1" [(ngModel)]="seats" name="seats" />
          </label>
        </div>
        <button type="button" class="btn gold" (click)="estimate()">Calculate Corridor Fare</button>
        @if (estimatedFare() != null) {
          <p class="est">Calculated fare: <strong>Rs. {{ estimatedFare() | number:'1.2-2' }}</strong></p>
        }
      </section>

      <section class="card">
        <h2>Payment History &amp; Billing</h2>
        @if (txLoading()) { <p class="muted">Loading…</p> }
        @for (t of transactions(); track t.id || $index) {
          <div class="tx">
            <div>
              <strong>{{ t.description || t.type || 'Transaction' }}</strong>
              <p class="muted">{{ formatDate(t.createdAt || t.date) }} · {{ t.method || t.channel || '' }}</p>
            </div>
            <div class="tx-amt" [class.in]="isCredit(t)">
              {{ isCredit(t) ? '+' : '-' }}Rs. {{ absAmt(t) | number:'1.2-2' }}
              <span class="st">{{ t.status || 'Completed' }}</span>
            </div>
          </div>
        } @empty {
          @if (!txLoading()) { <p class="muted">No transactions yet.</p> }
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
    h2 { margin: 0 0 0.65rem; font-size: 1.05rem; font-weight: 800; }
    .sub { margin: 0.3rem 0 0; color: #64748b; font-size: 0.9rem; }
    .top-grid { display: grid; grid-template-columns: 1fr 1.2fr; gap: 0.9rem; margin-bottom: 0.9rem; }
    @media (max-width: 860px) { .top-grid { grid-template-columns: 1fr; } }
    .card {
      background: #fff; border: 1px solid #b7ebc9; border-radius: 16px; padding: 1.15rem;
      box-shadow: 0 6px 18px rgba(15,23,42,0.04); margin-bottom: 0.9rem;
    }
    .balance {
      background: linear-gradient(145deg, #0b3d2e 0%, #0d9f6e 100%);
      border: none; color: #fff;
    }
    .balance .muted { color: rgba(255,255,255,0.75); }
    .bal-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .amount { font-size: 2.2rem; font-weight: 800; letter-spacing: -0.02em; }
    .quick { display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 0.65rem 0; }
    .q {
      border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 999px;
      padding: 0.45rem 0.9rem; font-weight: 800; cursor: pointer;
    }
    .q.on { background: #f5c518; border-color: #f5c518; }
    .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem; }
    @media (max-width: 560px) { .row2 { grid-template-columns: 1fr; } }
    .lbl { display: block; font-size: 0.78rem; font-weight: 700; color: #64748b; margin-bottom: 0.55rem; }
    .inp {
      display: block; width: 100%; margin-top: 0.3rem; min-height: 44px;
      padding: 0.5rem 0.75rem; border-radius: 12px; border: 1px solid #e2e8f0; font-size: 0.95rem;
    }
    .btn {
      display: inline-flex; align-items: center; justify-content: center; min-height: 44px;
      padding: 0.5rem 1.1rem; border-radius: 999px; font-weight: 800; font-size: 0.88rem;
      border: none; cursor: pointer; text-decoration: none;
    }
    .btn.primary { background: #0d9f6e; color: #fff; }
    .btn.ghost { background: #fff; border: 1px solid #e2e8f0; color: #0f172a; }
    .btn.gold { background: #f5c518; color: #1e293b; margin-top: 0.35rem; }
    .full { width: 100%; margin-top: 0.5rem; }
    .est { margin-top: 0.75rem; font-size: 1.05rem; }
    .tx {
      display: flex; justify-content: space-between; gap: 0.75rem; padding: 0.75rem 0;
      border-bottom: 1px solid #f1f5f9;
    }
    .tx-amt { text-align: right; font-weight: 800; color: #b45309; }
    .tx-amt.in { color: #0d9f6e; }
    .st { display: block; font-size: 0.72rem; font-weight: 700; color: #64748b; }
    .muted { color: #64748b; font-size: 0.88rem; }
    .err { color: #e11d48; } .ok { color: #0d9f6e; }
  `]
})
export class WalletPageComponent implements OnInit {
  private http = inject(HttpClient);
  private api = (environment.apiUrl || '/api/v1').replace(/\/$/, '');

  balance = signal(0);
  transactions = signal<any[]>([]);
  txLoading = signal(true);
  amount = 500;
  method = 'MockWallet';
  mobile = '';
  distanceKm = 2;
  seats = 1;
  estimatedFare = signal<number | null>(null);
  busy = signal(false);
  err = signal('');
  msg = signal('');

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.http.get<any>(`${this.api}/wallets/me`).subscribe({
      next: (r) => {
        const d = r?.data ?? r;
        this.balance.set(Number(d?.balance ?? d?.availableBalance ?? 0));
      },
      error: () => {
        this.http.get<any>(`${this.api}/wallet`).subscribe({
          next: (r) => this.balance.set(Number((r?.data ?? r)?.balance ?? 0)),
          error: () => {}
        });
      }
    });
    this.txLoading.set(true);
    this.http.get<any>(`${this.api}/wallets/me/transactions`).subscribe({
      next: (r) => {
        const d = r?.data ?? r;
        this.transactions.set(Array.isArray(d) ? d : d?.items ?? []);
        this.txLoading.set(false);
      },
      error: () => {
        this.http.get<any>(`${this.api}/wallet/transactions`).subscribe({
          next: (r) => {
            const d = r?.data ?? r;
            this.transactions.set(Array.isArray(d) ? d : d?.items ?? []);
            this.txLoading.set(false);
          },
          error: () => this.txLoading.set(false)
        });
      }
    });
  }

  deposit(): void {
    this.busy.set(true); this.err.set(''); this.msg.set('');
    const body = { amount: this.amount, method: this.method, mobileNumber: this.mobile || undefined };
    this.http.post<any>(`${this.api}/wallets/me/deposit`, body).subscribe({
      next: (r) => {
        this.busy.set(false);
        this.msg.set(r?.message || 'Deposit successful');
        this.reload();
      },
      error: (e) => {
        this.http.post<any>(`${this.api}/wallet/deposit`, body).subscribe({
          next: (r) => {
            this.busy.set(false);
            this.msg.set(r?.message || 'Deposit successful');
            this.reload();
          },
          error: (e2) => {
            this.busy.set(false);
            this.err.set(e2.error?.message || e.error?.message || 'Deposit failed');
          }
        });
      }
    });
  }

  estimate(): void {
    // local estimate aligned with typical BaseFare 50 + PerKm 15
    const fare = 50 + Number(this.distanceKm || 0) * 15;
    this.estimatedFare.set(Math.round(fare * 100) / 100);
    this.http.post<any>(`${this.api}/payments/estimate`, {
      distanceKm: this.distanceKm,
      seats: this.seats
    }).subscribe({
      next: (r) => {
        const d = r?.data ?? r;
        if (d?.fare != null) this.estimatedFare.set(Number(d.fare));
      },
      error: () => {}
    });
  }

  isCredit(t: any): boolean {
    const a = Number(t.amount ?? t.value ?? 0);
    const type = String(t.type || t.transactionType || '').toLowerCase();
    if (type.includes('deposit') || type.includes('refund') || type.includes('credit')) return true;
    return a > 0 && !type.includes('payment') && !type.includes('debit');
  }

  absAmt(t: any): number {
    return Math.abs(Number(t.amount ?? t.value ?? 0));
  }

  formatDate(d?: string): string {
    if (!d) return '';
    try {
      return new Date(d).toLocaleString();
    } catch { return d; }
  }
}
